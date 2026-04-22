const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// POST /api/reviews - Create a review
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { station_id, rating, comment } = req.body;
    const user_id = req.user.user_id;

    if (!station_id || !rating) {
      return res.status(400).json({ error: 'Station and rating are required.' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }

    const [result] = await db.query(
      'INSERT INTO reviews (user_id, station_id, rating, comment) VALUES (?, ?, ?, ?)',
      [user_id, station_id, rating, comment || null]
    );

    // Update station average rating
    await db.query(
      `UPDATE PetrolStation ps
       SET rating = (SELECT AVG(r.rating) FROM reviews r WHERE r.station_id = ?)
       WHERE ps.station_id = ?`,
      [station_id, station_id]
    );

    res.status(201).json({ message: 'Review submitted successfully.', review_id: result.insertId });
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ error: 'Failed to submit review.' });
  }
});

// PUT /api/reviews/:id - Edit a review
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const user_id = req.user.user_id;

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }

    const [reviews] = await db.query(
      'SELECT * FROM reviews WHERE review_id = ?', [id]
    );
    if (reviews.length === 0) {
      return res.status(404).json({ error: 'Review not found.' });
    }
    if (reviews[0].user_id !== user_id) {
      return res.status(403).json({ error: 'You can only edit your own reviews.' });
    }

    await db.query(
      'UPDATE reviews SET rating = COALESCE(?, rating), comment = COALESCE(?, comment) WHERE review_id = ?',
      [rating, comment, id]
    );

    // Update station average rating
    await db.query(
      `UPDATE PetrolStation ps
       SET rating = (SELECT AVG(r.rating) FROM reviews r WHERE r.station_id = ?)
       WHERE ps.station_id = ?`,
      [reviews[0].station_id, reviews[0].station_id]
    );

    res.json({ message: 'Review updated successfully.' });
  } catch (err) {
    console.error('Update review error:', err);
    res.status(500).json({ error: 'Failed to update review.' });
  }
});

// DELETE /api/reviews/:id - Delete a review
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.user_id;

    const [reviews] = await db.query('SELECT * FROM reviews WHERE review_id = ?', [id]);
    if (reviews.length === 0) {
      return res.status(404).json({ error: 'Review not found.' });
    }
    if (reviews[0].user_id !== user_id) {
      return res.status(403).json({ error: 'You can only delete your own reviews.' });
    }

    const station_id = reviews[0].station_id;
    await db.query('DELETE FROM reviews WHERE review_id = ?', [id]);

    await db.query(
      `UPDATE PetrolStation ps
       SET rating = COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.station_id = ?), 4.0)
       WHERE ps.station_id = ?`,
      [station_id, station_id]
    );

    res.json({ message: 'Review deleted successfully.' });
  } catch (err) {
    console.error('Delete review error:', err);
    res.status(500).json({ error: 'Failed to delete review.' });
  }
});

module.exports = router;
