const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../db/connection');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/roleCheck');

// Get all feedback (Admin only)
router.get('/', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { status, category, priority } = req.query;
    let query = `SELECT f.*, u.full_name, u.email, u.role
                 FROM feedback f
                 JOIN users u ON f.user_id = u.id
                 WHERE 1=1`;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND f.status = $${params.length}`;
    }

    if (category) {
      params.push(category);
      query += ` AND f.category = $${params.length}`;
    }

    if (priority) {
      params.push(priority);
      query += ` AND f.priority = $${params.length}`;
    }

    query += ' ORDER BY f.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get accessibility feedback for teacher's courses
router.get('/teacher/accessibility', authenticateToken, checkRole('teacher'), async (req, res) => {
  try {
    // Get all accessibility feedback (teachers can see all to understand common issues)
    const query = `
      SELECT DISTINCT f.*, u.full_name, u.email, u.role
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      WHERE f.category = 'accessibility'
      ORDER BY f.created_at DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Get teacher accessibility feedback error:', error);
    res.status(500).json({ error: 'Failed to fetch accessibility feedback' });
  }
});

// Get user's feedback
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Users can only view their own feedback
    if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'SELECT * FROM feedback WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get user feedback error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get feedback by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT f.*, u.full_name, u.email, u.role
       FROM feedback f
       JOIN users u ON f.user_id = u.id
       WHERE f.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    const feedback = result.rows[0];

    // Users can only view their own feedback
    if (req.user.role !== 'admin' && req.user.id !== feedback.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(feedback);
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Submit feedback
router.post('/', authenticateToken, [
  body('category').trim().notEmpty(),
  body('subject').trim().notEmpty(),
  body('message').trim().notEmpty(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { category, subject, message, priority } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO feedback (user_id, category, subject, message, priority, status)
       VALUES ($1, $2, $3, $4, $5, 'open')
       RETURNING *`,
      [req.user.id, category, subject, message, priority || 'medium']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Update feedback status (Admin only)
router.put('/:id/status', authenticateToken, checkRole('admin'), [
  body('status').isIn(['open', 'in_progress', 'resolved', 'closed']),
  body('adminResponse').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;

    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE feedback 
       SET status = $1, admin_response = COALESCE($2, admin_response), updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, adminResponse, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update feedback status error:', error);
    res.status(500).json({ error: 'Failed to update feedback status' });
  }
});

// Delete feedback (Admin only)
router.delete('/:id', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM feedback WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

module.exports = router;
