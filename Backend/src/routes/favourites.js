const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/favourites - Get user's favourites
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const [favourites] = await db.query(
      `SELECT f.*, ps.name, ps.city, ps.country, ps.rating, ps.opening_hours, ps.phone,
              GROUP_CONCAT(ft.fuel_name ORDER BY ft.fuel_name SEPARATOR ', ') as available_fuels
       FROM favorites f
       JOIN PetrolStation ps ON f.station_id = ps.station_id
       LEFT JOIN StationFuelType sft ON ps.station_id = sft.station_id AND sft.is_available = 1
       LEFT JOIN FuelType ft ON sft.fuel_type_id = ft.fuel_id
       WHERE f.user_id = ?
       GROUP BY f.favorite_id
       ORDER BY f.created_at DESC`,
      [user_id]
    );
    res.json({ favourites });
  } catch (err) {
    console.error('Get favourites error:', err);
    res.status(500).json({ error: 'Failed to fetch favourites.' });
  }
});

// POST /api/favourites - Add a favourite
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { station_id } = req.body;
    const user_id = req.user.user_id;

    if (!station_id) {
      return res.status(400).json({ error: 'Station ID is required.' });
    }

    const [existing] = await db.query(
      'SELECT favorite_id FROM favorites WHERE user_id = ? AND station_id = ?',
      [user_id, station_id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'This station is already in your favourites.' });
    }

    await db.query(
      'INSERT INTO favorites (user_id, station_id) VALUES (?, ?)',
      [user_id, station_id]
    );

    res.status(201).json({ message: 'Station added to favourites.' });
  } catch (err) {
    console.error('Add favourite error:', err);
    res.status(500).json({ error: 'Failed to add favourite.' });
  }
});

// DELETE /api/favourites/:stationId - Remove a favourite
router.delete('/:stationId', authMiddleware, async (req, res) => {
  try {
    const { stationId } = req.params;
    const user_id = req.user.user_id;

    const [result] = await db.query(
      'DELETE FROM favorites WHERE user_id = ? AND station_id = ?',
      [user_id, stationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Favourite not found.' });
    }

    res.json({ message: 'Station removed from favourites.' });
  } catch (err) {
    console.error('Remove favourite error:', err);
    res.status(500).json({ error: 'Failed to remove favourite.' });
  }
});

module.exports = router;
