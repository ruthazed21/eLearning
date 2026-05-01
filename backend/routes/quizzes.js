const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../db/connection');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/roleCheck');

// Get all available quizzes for a student based on their enrolled courses
router.get('/available', authenticateToken, checkRole('student'), async (req, res) => {
  try {
    const studentId = req.user.id;

    const query = `
      SELECT q.*, c.title as course_title,
             (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count
      FROM quizzes q
      JOIN courses c ON q.course_id = c.id
      JOIN course_enrollments ce ON c.id = ce.course_id
      WHERE ce.student_id = $1
      ORDER BY q.created_at DESC
    `;

    const result = await pool.query(query, [studentId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get available quizzes error:', error);
    res.status(500).json({ error: 'Failed to fetch available quizzes' });
  }
});

// Get quizzes for a course
router.get('/course/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    const result = await pool.query(
      `SELECT q.*, 
       (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count
       FROM quizzes q
       WHERE q.course_id = $1
       ORDER BY q.created_at DESC`,
      [courseId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// Get quiz by ID with questions
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const quizResult = await pool.query('SELECT * FROM quizzes WHERE id = $1', [id]);

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quiz = quizResult.rows[0];

    // Get questions with options
    const questionsResult = await pool.query(
      'SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index ASC',
      [id]
    );

    for (let question of questionsResult.rows) {
      const optionsResult = await pool.query(
        'SELECT * FROM quiz_options WHERE question_id = $1 ORDER BY order_index ASC',
        [question.id]
      );
      question.options = optionsResult.rows;
    }

    quiz.questions = questionsResult.rows;

    res.json(quiz);
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

// Create quiz (Teacher and Admin only)
router.post('/', authenticateToken, checkRole('teacher', 'admin'), [
  body('courseId').isInt(),
  body('title').trim().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { courseId, lessonId, title, description, passingScore, timeLimitMinutes } = req.body;

  try {
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
      `INSERT INTO quizzes (course_id, lesson_id, title, description, passing_score, time_limit_minutes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [courseId, lessonId || null, title, description || null, passingScore || 70, timeLimitMinutes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// Update quiz (Teacher and Admin only)
router.put('/:id', authenticateToken, checkRole('teacher', 'admin'), [
  body('title').optional().trim().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { title, description, passingScore, timeLimitMinutes } = req.body;

  try {
    // Check course ownership for teachers
    if (req.user.role === 'teacher') {
      const ownerCheck = await pool.query(
        `SELECT c.teacher_id FROM courses c
         JOIN quizzes q ON c.id = q.course_id
         WHERE q.id = $1`,
        [id]
      );
      if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].teacher_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await pool.query(
      `UPDATE quizzes 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           passing_score = COALESCE($3, passing_score),
           time_limit_minutes = COALESCE($4, time_limit_minutes)
       WHERE id = $5
       RETURNING *`,
      [title, description, passingScore, timeLimitMinutes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

// Delete quiz (Teacher and Admin only)
router.delete('/:id', authenticateToken, checkRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check course ownership for teachers
    if (req.user.role === 'teacher') {
      const ownerCheck = await pool.query(
        `SELECT c.teacher_id FROM courses c
         JOIN quizzes q ON c.id = q.course_id
         WHERE q.id = $1`,
        [id]
      );
      if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].teacher_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await pool.query('DELETE FROM quizzes WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

// Add question to quiz (Teacher and Admin only)
router.post('/:id/questions', authenticateToken, checkRole('teacher', 'admin'), [
  body('questionText').trim().notEmpty(),
  body('questionType').isIn(['multiple_choice', 'true_false', 'short_answer']),
  body('orderIndex').isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { questionText, questionType, points, orderIndex, options } = req.body;

  try {
    // Check course ownership for teachers
    if (req.user.role === 'teacher') {
      const ownerCheck = await pool.query(
        `SELECT c.teacher_id FROM courses c
         JOIN quizzes q ON c.id = q.course_id
         WHERE q.id = $1`,
        [id]
      );
      if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].teacher_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Create question
    const questionResult = await pool.query(
      `INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, order_index)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, questionText, questionType, points || 1, orderIndex]
    );

    const question = questionResult.rows[0];

    // Add options if provided
    if (options && Array.isArray(options)) {
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        await pool.query(
          `INSERT INTO quiz_options (question_id, option_text, is_correct, order_index)
           VALUES ($1, $2, $3, $4)`,
          [question.id, option.text, option.isCorrect || false, i]
        );
      }

      // Get question with options
      const optionsResult = await pool.query(
        'SELECT * FROM quiz_options WHERE question_id = $1 ORDER BY order_index ASC',
        [question.id]
      );
      question.options = optionsResult.rows;
    }

    res.status(201).json(question);
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({ error: 'Failed to add question' });
  }
});

// Update question (Teacher and Admin only)
router.put('/questions/:questionId', authenticateToken, checkRole('teacher', 'admin'), [
  body('questionText').optional().trim().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { questionId } = req.params;
  const { questionText, points, options } = req.body;

  try {
    // Check course ownership for teachers
    if (req.user.role === 'teacher') {
      const ownerCheck = await pool.query(
        `SELECT c.teacher_id FROM courses c
         JOIN quizzes q ON c.id = q.course_id
         JOIN quiz_questions qq ON q.id = qq.quiz_id
         WHERE qq.id = $1`,
        [questionId]
      );
      if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].teacher_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Update question
    const result = await pool.query(
      `UPDATE quiz_questions 
       SET question_text = COALESCE($1, question_text),
           points = COALESCE($2, points)
       WHERE id = $3
       RETURNING *`,
      [questionText, points, questionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const question = result.rows[0];

    // Update options if provided
    if (options && Array.isArray(options)) {
      // Delete existing options
      await pool.query('DELETE FROM quiz_options WHERE question_id = $1', [questionId]);

      // Add new options
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        await pool.query(
          `INSERT INTO quiz_options (question_id, option_text, is_correct, order_index)
           VALUES ($1, $2, $3, $4)`,
          [questionId, option.text, option.isCorrect || false, i]
        );
      }

      // Get updated options
      const optionsResult = await pool.query(
        'SELECT * FROM quiz_options WHERE question_id = $1 ORDER BY order_index ASC',
        [questionId]
      );
      question.options = optionsResult.rows;
    }

    res.json(question);
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// Delete question (Teacher and Admin only)
router.delete('/questions/:questionId', authenticateToken, checkRole('teacher', 'admin'), async (req, res) => {
  try {
    const { questionId } = req.params;

    // Check course ownership for teachers
    if (req.user.role === 'teacher') {
      const ownerCheck = await pool.query(
        `SELECT c.teacher_id FROM courses c
         JOIN quizzes q ON c.id = q.course_id
         JOIN quiz_questions qq ON q.id = qq.quiz_id
         WHERE qq.id = $1`,
        [questionId]
      );
      if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].teacher_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await pool.query('DELETE FROM quiz_questions WHERE id = $1 RETURNING id', [questionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Submit quiz attempt (Student only)
router.post('/:id/attempt', authenticateToken, checkRole('student'), async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;

    // Get quiz with questions and correct answers
    const quizResult = await pool.query('SELECT * FROM quizzes WHERE id = $1', [id]);

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quiz = quizResult.rows[0];

    // Get questions with correct answers
    const questionsResult = await pool.query(
      'SELECT * FROM quiz_questions WHERE quiz_id = $1',
      [id]
    );

    let totalPoints = 0;
    let earnedPoints = 0;

    for (let question of questionsResult.rows) {
      totalPoints += question.points;

      const correctOptionsResult = await pool.query(
        'SELECT id FROM quiz_options WHERE question_id = $1 AND is_correct = true',
        [question.id]
      );

      const correctOptionIds = correctOptionsResult.rows.map(row => row.id);
      const userAnswer = answers[question.id];

      if (userAnswer && correctOptionIds.includes(parseInt(userAnswer))) {
        earnedPoints += question.points;
      }
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= quiz.passing_score;

    // Save attempt
    const attemptResult = await pool.query(
      `INSERT INTO quiz_attempts (student_id, quiz_id, score, total_points, passed, answers, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       RETURNING *`,
      [req.user.id, id, score, totalPoints, passed, JSON.stringify(answers)]
    );

    res.json({
      attempt: attemptResult.rows[0],
      score,
      totalPoints,
      earnedPoints,
      passed
    });
  } catch (error) {
    console.error('Submit quiz attempt error:', error);
    res.status(500).json({ error: 'Failed to submit quiz attempt' });
  }
});

// Get all quiz attempts for the authenticated student
router.get('/student/attempts', authenticateToken, checkRole('student'), async (req, res) => {
  try {
    const studentId = req.user.id;

    const query = `
      SELECT qa.*, q.title as quiz_title, c.category, c.title as course_title 
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN courses c ON q.course_id = c.id
      WHERE qa.student_id = $1
      ORDER BY qa.started_at DESC, qa.completed_at DESC
    `;

    const result = await pool.query(query, [studentId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get student attempts error:', error);
    res.status(500).json({ error: 'Failed to fetch student attempts' });
  }
});

// Get student quiz attempts for a specific quiz
router.get('/:id/attempts', authenticateToken, checkRole('student'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM quiz_attempts WHERE student_id = $1 AND quiz_id = $2 ORDER BY started_at DESC',
      [req.user.id, id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get quiz attempts error:', error);
    res.status(500).json({ error: 'Failed to fetch quiz attempts' });
  }
});

module.exports = router;
