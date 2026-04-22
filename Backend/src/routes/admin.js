const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { adminMiddleware } = require('../middleware/auth');

// GET /api/admin/analytics - Admin views their station analytics
router.get('/analytics', adminMiddleware, async (req, res) => {
  try {
    const station_id = req.admin.station_id;
    const [analytics] = await db.query(
      `SELECT sa.*, ps.name as station_name
       FROM StationAnalytics sa
       JOIN PetrolStation ps ON sa.station_id = ps.station_id
       WHERE sa.station_id = ?`,
      [station_id]
    );

    if (analytics.length === 0) {
      return res.status(404).json({ error: 'No analytics found for your station.' });
    }

    res.json({ analytics: analytics[0] });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});

// GET /api/admin/station - Admin views their own station
router.get('/station', adminMiddleware, async (req, res) => {
  try {
    const [stations] = await db.query(
      'SELECT * FROM PetrolStation WHERE station_id = ?',
      [req.admin.station_id]
    );
    if (stations.length === 0) return res.status(404).json({ error: 'Station not found.' });
    res.json({ station: stations[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch station.' });
  }
});

// GET /api/admin/reviews - Admin views reviews for their station
router.get('/reviews', adminMiddleware, async (req, res) => {
  try {
    const [reviews] = await db.query(
      `SELECT r.*, u.name as user_name
       FROM reviews r
       JOIN User u ON r.user_id = u.user_id
       WHERE r.station_id = ?
       ORDER BY r.created_at DESC`,
      [req.admin.station_id]
    );
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

module.exports = router;
