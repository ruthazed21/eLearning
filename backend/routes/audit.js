const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/roleCheck');

// Get audit logs (Admin only)
router.get('/', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { userId, action, entityType, startDate, endDate, page, limit: limitParam } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (userId) {
      params.push(userId);
      where += ` AND a.user_id = $${params.length}`;
    }

    if (action) {
      params.push(action);
      where += ` AND a.action = $${params.length}`;
    }

    if (entityType) {
      params.push(entityType);
      where += ` AND a.entity_type = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      where += ` AND a.created_at >= $${params.length}::date`;
    }

    if (endDate) {
      params.push(endDate);
      where += ` AND a.created_at <= $${params.length}::date + interval '1 day'`;
    }

    const baseQuery = `SELECT a.*, u.full_name, u.email, u.role
                 FROM audit_logs a
                 LEFT JOIN users u ON a.user_id = u.id
                 ${where} ORDER BY a.created_at DESC`;

    // Pagination (only when page param is provided)
    if (page) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limit = Math.min(parseInt(limitParam) || 50, 200);
      const offset = (pageNum - 1) * limit;

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM audit_logs a ${where}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      params.push(limit, offset);
      const result = await pool.query(
        `${baseQuery} LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      return res.json({
        data: result.rows,
        pagination: { total, page: pageNum, limit, totalPages: Math.ceil(total / limit) },
      });
    }

    // Default: return up to 100 most recent logs
    params.push(100);
    const result = await pool.query(`${baseQuery} LIMIT $${params.length}`, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get audit log by ID (Admin only)
router.get('/:id', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT a.*, u.full_name, u.email, u.role
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// Create audit log (Internal use)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { action, entityType, entityId, details } = req.body;

    const result = await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, action, entityType || null, entityId || null, details || null, req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create audit log error:', error);
    res.status(500).json({ error: 'Failed to create audit log' });
  }
});

// Get audit statistics (Admin only)
router.get('/stats/summary', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const params = [];
    let dateFilter = '';

    if (startDate) {
      params.push(startDate);
      dateFilter += ` AND created_at >= $${params.length}::date`;
    }

    if (endDate) {
      params.push(endDate);
      dateFilter += ` AND created_at <= $${params.length}::date + interval '1 day'`;
    }

    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_logs,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT action) as unique_actions,
        action,
        COUNT(*) as action_count
       FROM audit_logs
       WHERE 1=1 ${dateFilter}
       GROUP BY action
       ORDER BY action_count DESC`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({ error: 'Failed to fetch audit statistics' });
  }
});

module.exports = router;
