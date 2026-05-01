const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/roleCheck');

// Get student enrollments
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Students can only view their own enrollments
    if (req.user.role === 'student' && req.user.id !== parseInt(studentId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT e.*, c.title, c.description, c.thumbnail_url, c.category, c.difficulty_level,
       u.full_name as teacher_name,
       (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as total_lessons
       FROM course_enrollments e
       JOIN courses c ON e.course_id = c.id
       LEFT JOIN users u ON c.teacher_id = u.id
       WHERE e.student_id = $1
       ORDER BY e.enrolled_at DESC`,
      [studentId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// Get course enrollments (Teacher and Admin only)
router.get('/course/:courseId', authenticateToken, checkRole('teacher', 'admin'), async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check course ownership for teachers
    if (req.user.role === 'teacher') {
      const ownerCheck = await pool.query(
        'SELECT teacher_id FROM courses WHERE id = $1',
        [courseId]
      );
      if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].teacher_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await pool.query(
      `SELECT e.*, u.full_name, u.email
       FROM course_enrollments e
       JOIN users u ON e.student_id = u.id
       WHERE e.course_id = $1
       ORDER BY e.enrolled_at DESC`,
      [courseId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get course enrollments error:', error);
    res.status(500).json({ error: 'Failed to fetch course enrollments' });
  }
});

// Enroll in course (Student only)
router.post('/', authenticateToken, checkRole('student'), async (req, res) => {
  const { courseId } = req.body;

  try {
    // Check if course exists and is published
    const courseCheck = await pool.query(
      'SELECT id, status FROM courses WHERE id = $1',
      [courseId]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (courseCheck.rows[0].status !== 'published') {
      return res.status(400).json({ error: 'Course is not available for enrollment' });
    }

    // Check if already enrolled
    const enrollmentCheck = await pool.query(
      'SELECT id FROM course_enrollments WHERE student_id = $1 AND course_id = $2',
      [req.user.id, courseId]
    );

    if (enrollmentCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // Create enrollment
    const result = await pool.query(
      `INSERT INTO course_enrollments (student_id, course_id)
       VALUES ($1, $2)
       RETURNING *`,
      [req.user.id, courseId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Enroll course error:', error);
    res.status(500).json({ error: 'Failed to enroll in course' });
  }
});

// Unenroll from course (Student only)
router.delete('/:courseId', authenticateToken, checkRole('student'), async (req, res) => {
  try {
    const { courseId } = req.params;

    const result = await pool.query(
      'DELETE FROM course_enrollments WHERE student_id = $1 AND course_id = $2 RETURNING id',
      [req.user.id, courseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.json({ message: 'Unenrolled successfully' });
  } catch (error) {
    console.error('Unenroll course error:', error);
    res.status(500).json({ error: 'Failed to unenroll from course' });
  }
});

module.exports = router;
