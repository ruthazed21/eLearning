const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/roleCheck');

// Get student progress for a course
router.get('/course/:courseId', authenticateToken, checkRole('student'), async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check enrollment
    const enrollmentCheck = await pool.query(
      'SELECT * FROM course_enrollments WHERE student_id = $1 AND course_id = $2',
      [req.user.id, courseId]
    );

    if (enrollmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    // Get lesson progress
    const result = await pool.query(
      `SELECT lp.*, l.title, l.order_index
       FROM lesson_progress lp
       JOIN lessons l ON lp.lesson_id = l.id
       WHERE lp.student_id = $1 AND lp.course_id = $2
       ORDER BY l.order_index ASC`,
      [req.user.id, courseId]
    );

    res.json({
      enrollment: enrollmentCheck.rows[0],
      lessons: result.rows
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Get all student progress
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Students can only view their own progress
    if (req.user.role === 'student' && req.user.id !== parseInt(studentId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT ce.course_id, c.title, c.thumbnail_url, ce.progress_percentage, ce.enrolled_at,
       COUNT(lp.id) as completed_lessons,
       (SELECT COUNT(*) FROM lessons WHERE course_id = ce.course_id) as total_lessons
       FROM course_enrollments ce
       JOIN courses c ON ce.course_id = c.id
       LEFT JOIN lesson_progress lp ON lp.student_id = ce.student_id AND lp.course_id = ce.course_id AND lp.completed = true
       WHERE ce.student_id = $1
       GROUP BY ce.course_id, c.title, c.thumbnail_url, ce.progress_percentage, ce.enrolled_at
       ORDER BY ce.enrolled_at DESC`,
      [studentId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get student progress error:', error);
    res.status(500).json({ error: 'Failed to fetch student progress' });
  }
});

// Mark lesson as complete
router.post('/lesson/:lessonId/complete', authenticateToken, checkRole('student'), async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { timeSpent } = req.body;

    // Get lesson and course info
    const lessonResult = await pool.query(
      'SELECT course_id FROM lessons WHERE id = $1',
      [lessonId]
    );

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const courseId = lessonResult.rows[0].course_id;

    // Check enrollment
    const enrollmentCheck = await pool.query(
      'SELECT id FROM course_enrollments WHERE student_id = $1 AND course_id = $2',
      [req.user.id, courseId]
    );

    if (enrollmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    // Insert or update progress
    const result = await pool.query(
      `INSERT INTO lesson_progress (student_id, lesson_id, course_id, completed, completed_at, time_spent_minutes)
       VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, $4)
       ON CONFLICT (student_id, lesson_id)
       DO UPDATE SET completed = true, completed_at = CURRENT_TIMESTAMP, time_spent_minutes = lesson_progress.time_spent_minutes + $4
       RETURNING *`,
      [req.user.id, lessonId, courseId, timeSpent || 0]
    );

    // Update course enrollment progress
    await updateCourseProgress(req.user.id, courseId);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark lesson complete error:', error);
    res.status(500).json({ error: 'Failed to mark lesson as complete' });
  }
});

// Update time spent on lesson
router.post('/lesson/:lessonId/time', authenticateToken, checkRole('student'), async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { timeSpent } = req.body;

    // Get lesson and course info
    const lessonResult = await pool.query(
      'SELECT course_id FROM lessons WHERE id = $1',
      [lessonId]
    );

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const courseId = lessonResult.rows[0].course_id;

    // Insert or update progress
    const result = await pool.query(
      `INSERT INTO lesson_progress (student_id, lesson_id, course_id, time_spent_minutes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (student_id, lesson_id)
       DO UPDATE SET time_spent_minutes = lesson_progress.time_spent_minutes + $4
       RETURNING *`,
      [req.user.id, lessonId, courseId, timeSpent || 0]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update time spent error:', error);
    res.status(500).json({ error: 'Failed to update time spent' });
  }
});

// Helper function to update course progress percentage
async function updateCourseProgress(studentId, courseId) {
  try {
    const progressResult = await pool.query(
      `SELECT 
        (COUNT(CASE WHEN lp.completed = true THEN 1 END)::DECIMAL / COUNT(l.id)::DECIMAL * 100) as progress
       FROM lessons l
       LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.student_id = $1
       WHERE l.course_id = $2`,
      [studentId, courseId]
    );

    const progress = progressResult.rows[0].progress || 0;

    await pool.query(
      'UPDATE course_enrollments SET progress_percentage = $1 WHERE student_id = $2 AND course_id = $3',
      [progress, studentId, courseId]
    );

    // If 100% complete, mark as completed
    if (progress >= 100) {
      await pool.query(
        'UPDATE course_enrollments SET completed_at = CURRENT_TIMESTAMP WHERE student_id = $1 AND course_id = $2 AND completed_at IS NULL',
        [studentId, courseId]
      );
    }
  } catch (error) {
    console.error('Update course progress error:', error);
  }
}

module.exports = router;
