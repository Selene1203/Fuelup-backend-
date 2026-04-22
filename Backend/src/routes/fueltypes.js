const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/fueltypes - Get all fuel types (for dropdowns)
router.get('/', async (req, res) => {
  try {
    const [fuels] = await db.query('SELECT * FROM FuelType ORDER BY fuel_name');
    res.json({ fuels });
  } catch (err) {
    console.error('Fuel types error:', err);
    res.status(500).json({ error: 'Failed to fetch fuel types.' });
  }
});

module.exports = router;
