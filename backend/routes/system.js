const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/roleCheck');

// Get system statistics (Admin only)
router.get('/stats', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    // Fetch total users
    const usersCountResult = await pool.query('SELECT COUNT(*) FROM users');
    const totalUsers = parseInt(usersCountResult.rows[0].count);

    // Fetch total courses
    const coursesCountResult = await pool.query('SELECT COUNT(*) FROM courses');
    const totalCourses = parseInt(coursesCountResult.rows[0].count);

    // Fetch active students (role='student' and approval_status='approved')
    const activeStudentsResult = await pool.query(
      "SELECT COUNT(*) FROM users WHERE role = 'student' AND approval_status = 'approved'"
    );
    const activeStudents = parseInt(activeStudentsResult.rows[0].count);

    // Calculate platform growth (simplified: percentage of users created in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsersResult = await pool.query(
      'SELECT COUNT(*) FROM users WHERE created_at >= $1',
      [thirtyDaysAgo]
    );
    const recentUsersCount = parseInt(recentUsersResult.rows[0].count);

    const growthPercentage = totalUsers > 0
      ? Math.round((recentUsersCount / totalUsers) * 100)
      : 0;

    res.json({
      totalUsers,
      totalCourses,
      activeStudents,
      platformGrowth: `+${growthPercentage}%`
    });
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({ error: 'Failed to fetch system statistics' });
  }
});

// Get teacher statistics (Teacher only)
router.get('/teacher/stats', authenticateToken, checkRole('teacher'), async (req, res) => {
  try {
    const teacherId = req.user.id;

    // Fetch total courses for this teacher
    const coursesCountResult = await pool.query(
      'SELECT COUNT(*) FROM courses WHERE teacher_id = $1',
      [teacherId]
    );
    const totalCourses = parseInt(coursesCountResult.rows[0].count);

    // Fetch total students enrolled in this teacher's courses
    const studentsCountResult = await pool.query(
      `SELECT COUNT(DISTINCT student_id) 
       FROM course_enrollments ce 
       JOIN courses c ON ce.course_id = c.id 
       WHERE c.teacher_id = $1`,
      [teacherId]
    );
    const totalStudents = parseInt(studentsCountResult.rows[0].count);

    // Fetch total uploaded lessons in this teacher's courses
    const lessonsCountResult = await pool.query(
      `SELECT COUNT(*) 
       FROM lessons l 
       JOIN courses c ON l.course_id = c.id 
       WHERE c.teacher_id = $1`,
      [teacherId]
    );
    const totalLessons = parseInt(lessonsCountResult.rows[0].count);

    // Fetch average completion percentage across all students in this teacher's courses
    const avgCompletionResult = await pool.query(
      `SELECT AVG(ce.progress_percentage) 
       FROM course_enrollments ce 
       JOIN courses c ON ce.course_id = c.id 
       WHERE c.teacher_id = $1`,
      [teacherId]
    );
    const avgCompletion = Math.round(parseFloat(avgCompletionResult.rows[0].avg) || 0);

    res.json({
      totalCourses,
      totalStudents,
      totalLessons,
      avgCompletion: `${avgCompletion}%`
    });
  } catch (error) {
    console.error('Get teacher stats error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher statistics' });
  }
});

// Get student statistics (Student only)
router.get('/student/stats', authenticateToken, checkRole('student'), async (req, res) => {
  try {
    const studentId = req.user.id;

    // Fetch total enrolled courses
    const enrollmentCountResult = await pool.query(
      'SELECT COUNT(*) FROM course_enrollments WHERE student_id = $1',
      [studentId]
    );
    const enrolledCourses = parseInt(enrollmentCountResult.rows[0].count);

    // Fetch completed courses (progress_percentage = 100)
    const completedCountResult = await pool.query(
      'SELECT COUNT(*) FROM course_enrollments WHERE student_id = $1 AND progress_percentage = 100',
      [studentId]
    );
    const completedCourses = parseInt(completedCountResult.rows[0].count);

    // Fetch average progress percentage
    const avgProgressResult = await pool.query(
      'SELECT AVG(progress_percentage) FROM course_enrollments WHERE student_id = $1',
      [studentId]
    );
    const avgProgress = Math.round(parseFloat(avgProgressResult.rows[0].avg) || 0);

    // Fetch total hours spent (Mocked or estimated based on lessons)
    // For now, let's estimate based on completed lessons if we had a lesson_completions table
    // Since we only have progress_percentage, we'll mock this for now or return a placeholder
    const totalHours = Math.round(enrolledCourses * 5 * (avgProgress / 100)); // Very basic estimation

    res.json({
      enrolledCourses,
      completedCourses,
      avgProgress: `${avgProgress}%`,
      totalHours
    });
  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({ error: 'Failed to fetch student statistics' });
  }
});

module.exports = router;
