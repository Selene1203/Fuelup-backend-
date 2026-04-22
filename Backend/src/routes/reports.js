const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// REPORT 1: Station Fuel Price Report
// GET /api/reports/fuel-prices/:stationId
router.get('/fuel-prices/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    const [rows] = await db.query(
      `SELECT 
        ps.name as station_name,
        ps.city,
        ps.country,
        ft.fuel_name,
        ft.color_hex,
        sft.price_per_liter,
        sft.is_available,
        sft.last_updated,
        ba.business_name as updated_by
       FROM PetrolStation ps
       JOIN StationFuelType sft ON ps.station_id = sft.station_id
       JOIN FuelType ft ON sft.fuel_type_id = ft.fuel_id
       LEFT JOIN BusinessAdmin ba ON sft.updated_by_admin = ba.admin_id
       WHERE ps.station_id = ?
       ORDER BY ft.fuel_name`,
      [stationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No fuel data found for this station.' });
    }

    res.json({
      report: 'Station Fuel Price Report',
      station: rows[0].station_name,
      generated_at: new Date(),
      data: rows
    });
  } catch (err) {
    console.error('Fuel price report error:', err);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

// REPORT 2: Price Change History Report
// GET /api/reports/price-history/:stationId
router.get('/price-history/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    const [rows] = await db.query(
      `SELECT 
        ps.name as station_name,
        ft.fuel_name,
        ft.color_hex,
        ph.old_price,
        ph.new_price,
        ROUND(ph.new_price - ph.old_price, 2) as price_change,
        ba.business_name as changed_by,
        ph.changed_at
       FROM price_history ph
       JOIN PetrolStation ps ON ph.station_id = ps.station_id
       JOIN FuelType ft ON ph.fuel_type_id = ft.fuel_id
       LEFT JOIN BusinessAdmin ba ON ph.changed_by = ba.admin_id
       WHERE ph.station_id = ?
       ORDER BY ph.changed_at DESC`,
      [stationId]
    );

    res.json({
      report: 'Price Change History Report',
      station_id: stationId,
      generated_at: new Date(),
      total_changes: rows.length,
      data: rows
    });
  } catch (err) {
    console.error('Price history report error:', err);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

// REPORT 3: User Search Activity Report
// GET /api/reports/search-activity/:userId
router.get('/search-activity/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const [searches] = await db.query(
      `SELECT 
        u.name as user_name,
        u.email,
        s.search_id,
        s.query_text,
        ft.fuel_name as fuel_filter,
        s.results_count,
        s.timestamp
       FROM Search s
       JOIN User u ON s.user_id = u.user_id
       LEFT JOIN FuelType ft ON s.fuel_type_id = ft.fuel_id
       WHERE s.user_id = ?
       ORDER BY s.timestamp DESC`,
      [userId]
    );

    // Get search results for each search
    const searchIds = searches.map(s => s.search_id);
    let results = [];
    if (searchIds.length > 0) {
      [results] = await db.query(
        `SELECT 
          sr.search_id,
          ps.name as station_name,
          ps.city,
          sr.distance_km,
          sr.rank_position
         FROM SearchResult sr
         JOIN PetrolStation ps ON sr.station_id = ps.station_id
         WHERE sr.search_id IN (?)
         ORDER BY sr.search_id, sr.rank_position`,
        [searchIds]
      );
    }

    // Attach results to each search
    const data = searches.map(s => ({
      ...s,
      stations_returned: results.filter(r => r.search_id === s.search_id)
    }));

    res.json({
      report: 'User Search Activity Report',
      user: searches[0]?.user_name || 'Unknown',
      generated_at: new Date(),
      total_searches: searches.length,
      data
    });
  } catch (err) {
    console.error('Search activity report error:', err);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

// REPORT 4: Station Reviews & Ratings Report
// GET /api/reports/reviews/:stationId
router.get('/reviews/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    const [rows] = await db.query(
      `SELECT 
        ps.name as station_name,
        ps.city,
        u.name as reviewer_name,
        r.rating,
        r.comment,
        r.created_at,
        r.updated_at
       FROM reviews r
       JOIN PetrolStation ps ON r.station_id = ps.station_id
       JOIN User u ON r.user_id = u.user_id
       WHERE r.station_id = ?
       ORDER BY r.created_at DESC`,
      [stationId]
    );

    const [avg] = await db.query(
      'SELECT ROUND(AVG(rating), 1) as average_rating, COUNT(*) as total_reviews FROM reviews WHERE station_id = ?',
      [stationId]
    );

    res.json({
      report: 'Station Reviews & Ratings Report',
      station_id: stationId,
      station_name: rows[0]?.station_name || 'Unknown',
      generated_at: new Date(),
      average_rating: avg[0].average_rating,
      total_reviews: avg[0].total_reviews,
      data: rows
    });
  } catch (err) {
    console.error('Reviews report error:', err);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

// GET /api/reports/stations - List all stations (for report dropdown)
router.get('/stations', async (req, res) => {
  try {
    const [stations] = await db.query(
      'SELECT station_id, name, city, country FROM PetrolStation ORDER BY name'
    );
    res.json({ stations });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stations.' });
  }
});

// GET /api/reports/users - List all users (for report dropdown)
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT user_id, name, email FROM User ORDER BY name'
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

module.exports = router;
