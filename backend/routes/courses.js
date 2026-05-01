const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../db/connection');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/roleCheck');

// Get all courses
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, difficulty, teacherId, status, page, limit: limitParam } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    // Students can only see published courses
    if (req.user.role === 'student') {
      where += ` AND c.status = 'published'`;
    }

    if (category) {
      params.push(category);
      where += ` AND c.category = $${params.length}`;
    }

    if (difficulty) {
      params.push(difficulty);
      where += ` AND c.difficulty_level = $${params.length}`;
    }

    if (teacherId) {
      params.push(teacherId);
      where += ` AND c.teacher_id = $${params.length}`;
    }

    if (status && req.user.role !== 'student') {
      params.push(status);
      where += ` AND c.status = $${params.length}`;
    }

    const baseQuery = `SELECT c.*, u.full_name as teacher_name,
                 (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id) as enrollment_count,
                 (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as lessons_count
                 FROM courses c
                 LEFT JOIN users u ON c.teacher_id = u.id
                 ${where} ORDER BY c.created_at DESC`;

    // Pagination (only when page param is provided)
    if (page) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limit = Math.min(parseInt(limitParam) || 20, 100);
      const offset = (pageNum - 1) * limit;

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM courses c ${where}`,
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
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get course by ID with lessons
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const courseResult = await pool.query(
      `SELECT c.*, u.full_name as teacher_name,
       (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id) as enrollment_count,
       (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as lessons_count
       FROM courses c
       LEFT JOIN users u ON c.teacher_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseResult.rows[0];

    // Students can only view published courses
    if (req.user.role === 'student' && course.status !== 'published') {
      return res.status(403).json({ error: 'Course not available' });
    }

    const lessonsResult = await pool.query(
      'SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index ASC',
      [id]
    );
    course.lessons = lessonsResult.rows;

    if (req.user.role === 'student') {
      const enrollmentResult = await pool.query(
        'SELECT * FROM course_enrollments WHERE student_id = $1 AND course_id = $2',
        [req.user.id, id]
      );
      course.is_enrolled = enrollmentResult.rows.length > 0;
      course.enrollment = enrollmentResult.rows[0] || null;
    }

    res.json(course);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Create course (Teacher and Admin only)
router.post('/', authenticateToken, checkRole('teacher', 'admin'), [
  body('title').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('category').trim().notEmpty(),
  body('difficultyLevel').isIn(['beginner', 'intermediate', 'advanced'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, description, category, difficultyLevel, thumbnailUrl } = req.body;

  try {
    const teacherId = req.user.role === 'teacher' ? req.user.id : req.body.teacherId;

    const result = await pool.query(
      `INSERT INTO courses (title, description, teacher_id, category, difficulty_level, thumbnail_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft')
       RETURNING *`,
      [title, description, teacherId, category, difficultyLevel, thumbnailUrl || null]
    );

    // Log course creation
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, 'CREATE_COURSE', 'course', result.rows[0].id, JSON.stringify({ title, category, difficultyLevel }), req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Update course
router.put('/:id', authenticateToken, checkRole('teacher', 'admin'), [
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('category').optional().trim().notEmpty(),
  body('difficultyLevel').optional().isIn(['beginner', 'intermediate', 'advanced']),
  body('status').optional().isIn(['draft', 'published', 'archived'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { id } = req.params;
    const { title, description, category, difficultyLevel, thumbnailUrl, status } = req.body;

    if (req.user.role === 'teacher') {
      const ownerCheck = await pool.query('SELECT teacher_id FROM courses WHERE id = $1', [id]);
      if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].teacher_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await pool.query(
      `UPDATE courses 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           difficulty_level = COALESCE($4, difficulty_level),
           thumbnail_url = COALESCE($5, thumbnail_url),
           status = COALESCE($6, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [title, description, category, difficultyLevel, thumbnailUrl, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Log course update
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, 'UPDATE_COURSE', 'course', id, JSON.stringify({ title, category, difficultyLevel, status }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Delete course
router.delete('/:id', authenticateToken, checkRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'teacher') {
      const ownerCheck = await pool.query('SELECT teacher_id FROM courses WHERE id = $1', [id]);
      if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].teacher_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get course info before deletion for audit log
    const courseInfo = await pool.query('SELECT title, category FROM courses WHERE id = $1', [id]);

    const result = await pool.query('DELETE FROM courses WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Log course deletion
    if (courseInfo.rows.length > 0) {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, 'DELETE_COURSE', 'course', id, JSON.stringify({ title: courseInfo.rows[0].title, category: courseInfo.rows[0].category }), req.ip]
      );
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

module.exports = router;
