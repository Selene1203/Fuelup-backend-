const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/users/profile - Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT user_id, name, email, gps_enabled, preferred_theme, preferred_fuel, distance_unit, created_at FROM User WHERE user_id = ?',
      [req.user.user_id]
    );
    if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: users[0] });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, preferred_fuel, preferred_theme, distance_unit, gps_enabled } = req.body;
    const user_id = req.user.user_id;

    if (!name) return res.status(400).json({ error: 'Name is required.' });

    await db.query(
      `UPDATE User SET name = ?, preferred_fuel = ?, preferred_theme = ?, 
       distance_unit = ?, gps_enabled = ? WHERE user_id = ?`,
      [name, preferred_fuel, preferred_theme, distance_unit, gps_enabled ? 1 : 0, user_id]
    );

    res.json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// GET /api/users/searches - Get user search history
router.get('/searches', authMiddleware, async (req, res) => {
  try {
    const [searches] = await db.query(
      `SELECT s.*, ft.fuel_name
       FROM Search s
       LEFT JOIN FuelType ft ON s.fuel_type_id = ft.fuel_id
       WHERE s.user_id = ?
       ORDER BY s.timestamp DESC
       LIMIT 50`,
      [req.user.user_id]
    );
    res.json({ searches });
  } catch (err) {
    console.error('Get searches error:', err);
    res.status(500).json({ error: 'Failed to fetch search history.' });
  }
});

// POST /api/users/searches - Log a search
router.post('/searches', authMiddleware, async (req, res) => {
  try {
    const { query_text, fuel_type_id, results_count } = req.body;
    const user_id = req.user.user_id;

    const [result] = await db.query(
      'INSERT INTO Search (user_id, query_text, fuel_type_id, results_count) VALUES (?, ?, ?, ?)',
      [user_id, query_text || null, fuel_type_id || null, results_count || 0]
    );

    res.status(201).json({ message: 'Search logged.', search_id: result.insertId });
  } catch (err) {
    console.error('Log search error:', err);
    res.status(500).json({ error: 'Failed to log search.' });
  }
});

module.exports = router;
