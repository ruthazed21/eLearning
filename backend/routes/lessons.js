const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const pool = require('../db/connection');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/roleCheck');

// Configure multer for video and subtitle uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') {
      cb(null, path.join(__dirname, '../uploads/videos'));
    } else if (file.fieldname === 'subtitle') {
      cb(null, path.join(__dirname, '../uploads/subtitles'));
    } else {
      cb(new Error('Invalid field name'));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    if (file.fieldname === 'video') {
      cb(null, `video-${uniqueSuffix}${ext}`);
    } else if (file.fieldname === 'subtitle') {
      cb(null, `subtitle-${uniqueSuffix}${ext}`);
    }
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video' && file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else if (file.fieldname === 'subtitle' && (file.mimetype === 'text/vtt' || file.originalname.endsWith('.vtt'))) {
      cb(null, true);
    } else {
      cb(new Error('Only video files and VTT subtitle files are allowed'));
    }
  },
});

// Get lessons for a course
router.get('/course/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    const result = await pool.query(
      'SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index ASC',
      [courseId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

// Get lesson by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM lessons WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
});

// Create lesson (Teacher and Admin only)
router.post('/', authenticateToken, checkRole('teacher', 'admin'), upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'subtitle', maxCount: 1 }
]), [
  body('courseId').isInt(),
  body('title').trim().notEmpty(),
  body('orderIndex').isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { courseId, title, description, content, videoUrl, subtitleUrl, orderIndex, durationMinutes } = req.body;

  // Handle uploaded files
  let finalVideoUrl = videoUrl || null;
  let finalSubtitleUrl = subtitleUrl || null;
  
  if (req.files) {
    if (req.files.video && req.files.video[0]) {
      finalVideoUrl = `/uploads/videos/${req.files.video[0].filename}`;
    }
    if (req.files.subtitle && req.files.subtitle[0]) {
      finalSubtitleUrl = `/uploads/subtitles/${req.files.subtitle[0].filename}`;
    }
  }

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
      `INSERT INTO lessons (course_id, title, description, content, video_url, subtitle_url, order_index, duration_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [courseId, title, description || null, content || null, finalVideoUrl, finalSubtitleUrl, orderIndex, durationMinutes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

// Update lesson
router.put('/:id', authenticateToken, checkRole('teacher', 'admin'), upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'subtitle', maxCount: 1 }
]), [
  body('title').optional().trim().notEmpty(),
  body('orderIndex').optional().isInt(),
  body('durationMinutes').optional().isInt({ min: 0 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { id } = req.params;
    const { title, description, content, videoUrl, subtitleUrl, orderIndex, durationMinutes } = req.body;

    // Handle uploaded files
    let finalVideoUrl = videoUrl !== undefined ? videoUrl : undefined;
    let finalSubtitleUrl = subtitleUrl !== undefined ? subtitleUrl : undefined;
    
    if (req.files) {
      if (req.files.video && req.files.video[0]) {
        finalVideoUrl = `/uploads/videos/${req.files.video[0].filename}`;
      }
      if (req.files.subtitle && req.files.subtitle[0]) {
        finalSubtitleUrl = `/uploads/subtitles/${req.files.subtitle[0].filename}`;
      }
    }

    // Check course ownership for teachers
    if (req.user.role === 'teacher') {
      const ownerCheck = await pool.query(
        `SELECT c.teacher_id FROM courses c
         JOIN lessons l ON c.id = l.course_id
         WHERE l.id = $1`,
        [id]
      );
      if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].teacher_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await pool.query(
      `UPDATE lessons 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           content = COALESCE($3, content),
           video_url = COALESCE($4, video_url),
           subtitle_url = COALESCE($5, subtitle_url),
           order_index = COALESCE($6, order_index),
           duration_minutes = COALESCE($7, duration_minutes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [title, description, content, finalVideoUrl, finalSubtitleUrl, orderIndex, durationMinutes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// Delete lesson
router.delete('/:id', authenticateToken, checkRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check course ownership for teachers
    if (req.user.role === 'teacher') {
      const ownerCheck = await pool.query(
        `SELECT c.teacher_id FROM courses c
         JOIN lessons l ON c.id = l.course_id
         WHERE l.id = $1`,
        [id]
      );
      if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].teacher_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await pool.query('DELETE FROM lessons WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

module.exports = router;
