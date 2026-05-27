const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../db/connection');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/roleCheck');

const PROFILE_FIELDS = [
  'fullName',
  'department',
  'bio',
  'phone',
  'profilePictureUrl',
  'newPassword',
  'email',
];

function hasForbiddenProfileFields(body) {
  return PROFILE_FIELDS.some((key) => body[key] !== undefined && body[key] !== null && body[key] !== '');
}

// Get all users (Admin only)
router.get('/', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { role, search, page, limit: limitParam } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (role) {
      params.push(role);
      where += ` AND role = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (full_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }

    const baseQuery = `SELECT id, email, role, full_name, school_id, disability_type, approval_status, department, created_at FROM users ${where} ORDER BY created_at DESC`;

    if (page) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limit = Math.min(parseInt(limitParam) || 20, 100);
      const offset = (pageNum - 1) * limit;

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM users ${where}`,
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

    const result = await pool.query(baseQuery, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin' && req.user.id !== parseInt(id, 10)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'SELECT id, email, role, full_name, school_id, disability_type, approval_status, department, bio, profile_picture_url, phone, email_verified, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user (Admin only) — teachers only; students must register via signup
router.post('/', authenticateToken, checkRole('admin'), [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').equals('teacher').withMessage('Admins can only create teacher accounts'),
  body('fullName').trim().notEmpty(),
  body('department').trim().notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, fullName, department, bio } = req.body;

  try {
    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, full_name, department, bio, approval_status, email_verified)
       VALUES ($1, $2, 'teacher', $3, $4, $5, 'pending', false)
       RETURNING id, email, role, full_name, department, approval_status, created_at`,
      [email, passwordHash, fullName, department, bio || null]
    );

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, 'CREATE_USER', 'user', result.rows[0].id, JSON.stringify({ email, role: 'teacher', fullName }), req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user — self-service profile edits OR admin teacher status-only
router.put('/:id', authenticateToken, [
  body('email').optional().isEmail().normalizeEmail(),
  body('fullName').optional().trim().notEmpty(),
  body('newPassword').optional().isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('approval_status').optional().isIn(['approved', 'pending', 'rejected']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const targetId = parseInt(id, 10);
    const isSelf = req.user.id === targetId;
    const isAdmin = req.user.role === 'admin';

    const targetResult = await pool.query(
      'SELECT id, role, email FROM users WHERE id = $1',
      [targetId]
    );
    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const targetUser = targetResult.rows[0];

    // Admin updating another user (not self)
    if (isAdmin && !isSelf) {
      if (targetUser.role === 'student') {
        return res.status(403).json({
          error: 'Admins cannot edit student profiles. You may view or delete student accounts only.',
        });
      }

      if (targetUser.role === 'admin') {
        return res.status(403).json({
          error: 'Admins cannot edit other administrator profiles.',
        });
      }

      if (targetUser.role === 'teacher') {
        if (hasForbiddenProfileFields(req.body)) {
          return res.status(403).json({
            error: 'Admins can only change teacher account status (Active/Inactive), not profile details.',
          });
        }

        const { approval_status } = req.body;
        if (!approval_status) {
          return res.status(400).json({ error: 'approval_status is required' });
        }

        const updateResult = await pool.query(
          `UPDATE users
           SET approval_status = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND role = 'teacher'
           RETURNING id, email, role, full_name, approval_status, department, created_at`,
          [approval_status, targetId]
        );

        await pool.query(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            req.user.id,
            'UPDATE_USER_STATUS',
            'user',
            targetId,
            JSON.stringify({ approval_status, targetEmail: targetUser.email }),
            req.ip,
          ]
        );

        return res.json(updateResult.rows[0]);
      }
    }

    // Self profile update only (student, teacher, or admin editing own account)
    if (!isSelf) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.body.approval_status !== undefined) {
      return res.status(403).json({ error: 'You cannot change your own approval status' });
    }

    const { fullName, department, bio, phone, profilePictureUrl, currentPassword, newPassword } = req.body;

    if (targetUser.role === 'student' && (department !== undefined || bio !== undefined || phone !== undefined || profilePictureUrl !== undefined)) {
      return res.status(400).json({ error: 'Invalid fields for student profile update' });
    }

    let passwordHash = null;
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password' });
      }

      const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [targetId]);
      const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const result = await pool.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           department = COALESCE($2, department),
           bio = COALESCE($3, bio),
           phone = COALESCE($4, phone),
           profile_picture_url = COALESCE($5, profile_picture_url),
           password_hash = COALESCE($6, password_hash),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, email, role, full_name, department, bio, phone, profile_picture_url, approval_status`,
      [fullName, department, bio, phone, profilePictureUrl, passwordHash, targetId]
    );

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, 'UPDATE_USER', 'user', targetId, JSON.stringify({ fullName, department, bio, phone, passwordChanged: !!newPassword }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const targetId = parseInt(id, 10);

    if (req.user.id === targetId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const userInfo = await pool.query('SELECT email, full_name, role FROM users WHERE id = $1', [targetId]);

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [targetId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userInfo.rows.length > 0) {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, 'DELETE_USER', 'user', targetId, JSON.stringify({ email: userInfo.rows[0].email, fullName: userInfo.rows[0].full_name, role: userInfo.rows[0].role }), req.ip]
      );
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
