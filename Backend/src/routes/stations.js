const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// GET /api/stations - Search stations
router.get('/', async (req, res) => {
  try {
    const { q, fuel_type_id, city, country } = req.query;

    let query = `
      SELECT DISTINCT ps.*, 
        GROUP_CONCAT(ft.fuel_name ORDER BY ft.fuel_name SEPARATOR ', ') as available_fuels
      FROM PetrolStation ps
      LEFT JOIN StationFuelType sft ON ps.station_id = sft.station_id AND sft.is_available = 1
      LEFT JOIN FuelType ft ON sft.fuel_type_id = ft.fuel_id
      WHERE 1=1
    `;
    const params = [];

    if (q) {
      query += ' AND (ps.name LIKE ? OR ps.city LIKE ? OR ps.address LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (fuel_type_id) {
      query += ' AND sft.fuel_type_id = ?';
      params.push(fuel_type_id);
    }
    if (city) {
      query += ' AND ps.city LIKE ?';
      params.push(`%${city}%`);
    }
    if (country) {
      query += ' AND ps.country = ?';
      params.push(country);
    }

    query += ' GROUP BY ps.station_id ORDER BY ps.rating DESC';

    const [stations] = await db.query(query, params);
    res.json({ count: stations.length, stations });
  } catch (err) {
    console.error('Search stations error:', err);
    res.status(500).json({ error: 'Failed to fetch stations.' });
  }
});

// GET /api/stations/:id - Station detail
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [stations] = await db.query(
      'SELECT * FROM PetrolStation WHERE station_id = ?', [id]
    );
    if (stations.length === 0) {
      return res.status(404).json({ error: 'Station not found.' });
    }

    const [fuels] = await db.query(
      `SELECT sft.*, ft.fuel_name, ft.color_hex
       FROM StationFuelType sft
       JOIN FuelType ft ON sft.fuel_type_id = ft.fuel_id
       WHERE sft.station_id = ?`,
      [id]
    );

    const [reviews] = await db.query(
      `SELECT r.*, u.name as user_name
       FROM reviews r
       JOIN User u ON r.user_id = u.user_id
       WHERE r.station_id = ?
       ORDER BY r.created_at DESC`,
      [id]
    );

    const [analytics] = await db.query(
      'SELECT * FROM StationAnalytics WHERE station_id = ?', [id]
    );

    // Update analytics view count
    await db.query(
      `UPDATE StationAnalytics 
       SET view_count = view_count + 1, last_viewed = NOW() 
       WHERE station_id = ?`,
      [id]
    );

    res.json({
      station: stations[0],
      fuels,
      reviews,
      analytics: analytics[0] || null
    });
  } catch (err) {
    console.error('Station detail error:', err);
    res.status(500).json({ error: 'Failed to fetch station details.' });
  }
});

// PUT /api/stations/:id - Admin updates station info
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, city, phone, opening_hours } = req.body;

    if (parseInt(id) !== req.admin.station_id) {
      return res.status(403).json({ error: 'You can only edit your own station.' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Station name is required.' });
    }

    await db.query(
      `UPDATE PetrolStation 
       SET name = ?, address = ?, city = ?, phone = ?, opening_hours = ?
       WHERE station_id = ?`,
      [name, address, city, phone, opening_hours, id]
    );

    res.json({ message: 'Station updated successfully.' });
  } catch (err) {
    console.error('Update station error:', err);
    res.status(500).json({ error: 'Failed to update station.' });
  }
});

// GET /api/stations/:id/fuel - Get fuel types for a station
router.get('/:id/fuel', async (req, res) => {
  try {
    const [fuels] = await db.query(
      `SELECT sft.*, ft.fuel_name, ft.color_hex
       FROM StationFuelType sft
       JOIN FuelType ft ON sft.fuel_type_id = ft.fuel_id
       WHERE sft.station_id = ?`,
      [req.params.id]
    );
    res.json({ fuels });
  } catch (err) {
    console.error('Get fuel error:', err);
    res.status(500).json({ error: 'Failed to fetch fuel types.' });
  }
});

// POST /api/stations/:id/fuel - Admin adds a fuel type
router.post('/:id/fuel', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { fuel_type_id, price_per_liter } = req.body;

    if (parseInt(id) !== req.admin.station_id) {
      return res.status(403).json({ error: 'You can only manage your own station.' });
    }
    if (!fuel_type_id || !price_per_liter) {
      return res.status(400).json({ error: 'Fuel type and price are required.' });
    }

    const [existing] = await db.query(
      'SELECT id FROM StationFuelType WHERE station_id = ? AND fuel_type_id = ?',
      [id, fuel_type_id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'This fuel type is already listed for your station.' });
    }

    await db.query(
      `INSERT INTO StationFuelType (station_id, fuel_type_id, price_per_liter, is_available, updated_by_admin)
       VALUES (?, ?, ?, 1, ?)`,
      [id, fuel_type_id, price_per_liter, req.admin.admin_id]
    );

    res.status(201).json({ message: 'Fuel type added successfully.' });
  } catch (err) {
    console.error('Add fuel error:', err);
    res.status(500).json({ error: 'Failed to add fuel type.' });
  }
});

// PUT /api/stations/:id/fuel/:fuelId - Admin updates fuel price
router.put('/:id/fuel/:fuelId', adminMiddleware, async (req, res) => {
  try {
    const { id, fuelId } = req.params;
    const { price_per_liter, is_available } = req.body;

    if (parseInt(id) !== req.admin.station_id) {
      return res.status(403).json({ error: 'You can only manage your own station.' });
    }

    const [current] = await db.query(
      'SELECT * FROM StationFuelType WHERE station_id = ? AND fuel_type_id = ?',
      [id, fuelId]
    );
    if (current.length === 0) {
      return res.status(404).json({ error: 'Fuel type not found for this station.' });
    }

    const old_price = current[0].price_per_liter;

    // Log price history before updating
    if (price_per_liter && parseFloat(price_per_liter) !== parseFloat(old_price)) {
      await db.query(
        `INSERT INTO price_history (station_id, fuel_type_id, old_price, new_price, changed_by)
         VALUES (?, ?, ?, ?, ?)`,
        [id, fuelId, old_price, price_per_liter, req.admin.admin_id]
      );
    }

    await db.query(
      `UPDATE StationFuelType 
       SET price_per_liter = COALESCE(?, price_per_liter),
           is_available = COALESCE(?, is_available),
           updated_by_admin = ?
       WHERE station_id = ? AND fuel_type_id = ?`,
      [price_per_liter, is_available, req.admin.admin_id, id, fuelId]
    );

    res.json({ message: 'Fuel price updated successfully.' });
  } catch (err) {
    console.error('Update fuel error:', err);
    res.status(500).json({ error: 'Failed to update fuel price.' });
  }
});

// DELETE /api/stations/:id/fuel/:fuelId - Admin removes a fuel type
router.delete('/:id/fuel/:fuelId', adminMiddleware, async (req, res) => {
  try {
    const { id, fuelId } = req.params;

    if (parseInt(id) !== req.admin.station_id) {
      return res.status(403).json({ error: 'You can only manage your own station.' });
    }

    await db.query(
      'UPDATE StationFuelType SET is_available = 0 WHERE station_id = ? AND fuel_type_id = ?',
      [id, fuelId]
    );

    res.json({ message: 'Fuel type marked as unavailable.' });
  } catch (err) {
    console.error('Delete fuel error:', err);
    res.status(500).json({ error: 'Failed to remove fuel type.' });
  }
});

module.exports = router;
