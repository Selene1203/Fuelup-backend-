const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, preferred_fuel, preferred_theme, distance_unit } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const [existing] = await db.query('SELECT user_id FROM User WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO User (name, email, password_hash, preferred_fuel, preferred_theme, distance_unit)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        password_hash,
        preferred_fuel || '95',
        preferred_theme || 'dark',
        distance_unit || 'km'
      ]
    );

    const token = jwt.sign(
      { user_id: result.insertId, email, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: { user_id: result.insertId, name, email }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const [users] = await db.query('SELECT * FROM User WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        preferred_fuel: user.preferred_fuel,
        preferred_theme: user.preferred_theme,
        distance_unit: user.distance_unit,
        gps_enabled: user.gps_enabled
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/admin-login
router.post('/admin-login', async (req, res) => {
  try {
    const { secret_code } = req.body;

    if (!secret_code) {
      return res.status(400).json({ error: 'Secret code is required.' });
    }

    const [admins] = await db.query(
      `SELECT ba.*, ps.name as station_name 
       FROM BusinessAdmin ba
       JOIN PetrolStation ps ON ba.station_id = ps.station_id
       WHERE ba.secret_code = ?`,
      [secret_code]
    );

    if (admins.length === 0) {
      return res.status(401).json({ error: 'Invalid secret code.' });
    }

    const admin = admins[0];

    if (!admin.is_active) {
      return res.status(403).json({ error: 'This admin account has been deactivated.' });
    }

    await db.query('UPDATE BusinessAdmin SET last_login = NOW() WHERE admin_id = ?', [admin.admin_id]);

    const token = jwt.sign(
      { admin_id: admin.admin_id, station_id: admin.station_id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Admin login successful.',
      token,
      admin: {
        admin_id: admin.admin_id,
        business_name: admin.business_name,
        station_id: admin.station_id,
        station_name: admin.station_name,
        contact_email: admin.contact_email
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
