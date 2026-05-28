const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const pool = require('../db/connection');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/roleCheck');
const {
  extractTextFromPdf,
  extractTextFromPptx,
  generateTtsAudio,
} = require('../utils/accessibility');
const { transcribeVideoToSubtitles } = require('../utils/videoTranscription');

// Helper to parse VTT content to plain text transcript
function parseVttToTranscript(vttText) {
  return vttText
    .replace(/WEBVTT[\s\S]*?\n\n/, '') // remove header
    .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/g, '') // remove long timestamps
    .replace(/\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}\.\d{3}/g, '') // remove short timestamps
    .replace(/^\d+$/gm, '') // remove cue numbers if any
    .replace(/\r?\n+/g, '\n') // remove empty lines
    .trim();
}

// Helper to delete local file safely
const deleteLocalFile = (filePath) => {
  if (!filePath) return;
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.error(`Failed to delete old file: ${filePath}`, err);
  }
};

/**
 * Run Whisper STT in the background after a lesson is saved.
 * Updates the lesson row in the DB when transcription completes.
 * Does NOT generate fake/template captions on failure — logs the error instead.
 *
 * @param {number} lessonId       - DB id of the lesson to update.
 * @param {string} fullVideoPath  - Absolute path to the uploaded video file.
 * @param {string} subtitlePath   - Absolute path where the .vtt should be written.
 * @param {string} subtitleUrl    - Relative URL to store in the DB (e.g. /uploads/subtitles/…).
 */
async function runSttInBackground(lessonId, fullVideoPath, subtitlePath, subtitleUrl) {
  try {
    console.log(`[STT] Starting background transcription for lesson ${lessonId}`);
    const stt = await transcribeVideoToSubtitles(fullVideoPath, subtitlePath);

    await pool.query(
      `UPDATE lessons
         SET subtitle_url = $1,
             transcript   = $2,
             updated_at   = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [subtitleUrl, stt.transcript, lessonId]
    );

    console.log(`[STT] Subtitles saved for lesson ${lessonId} (source: ${stt.source})`);
  } catch (err) {
    // Log the real error — do NOT write fake captions
    console.error(`[STT] Transcription failed for lesson ${lessonId}:`, err.message);
    // Mark the lesson so the teacher knows subtitles are unavailable
    await pool.query(
      `UPDATE lessons
         SET subtitle_url = NULL,
             transcript   = NULL,
             updated_at   = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [lessonId]
    ).catch((dbErr) => console.error('[STT] Failed to clear subtitle_url after STT error:', dbErr.message));
  }
}

// Configure multer for video and subtitle uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir;
    if (file.fieldname === 'video') {
      uploadDir = path.join(__dirname, '../uploads/videos');
    } else if (file.fieldname === 'subtitle') {
      uploadDir = path.join(__dirname, '../uploads/subtitles');
    } else if (file.fieldname === 'document') {
      uploadDir = path.join(__dirname, '../uploads/documents');
    } else {
      return cb(new Error('Invalid field name'));
    }

    try {
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (mkdirErr) {
      cb(mkdirErr);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    if (file.fieldname === 'video') {
      cb(null, `video-${uniqueSuffix}${ext}`);
    } else if (file.fieldname === 'subtitle') {
      cb(null, `subtitle-${uniqueSuffix}${ext}`);
    } else if (file.fieldname === 'document') {
      cb(null, `document-${uniqueSuffix}${ext}`);
    } else {
      cb(new Error('Invalid field name'));
    }
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
  fileFilter: (req, file, cb) => {
    const normalizedName = file.originalname.toLowerCase();
    const documentAllowed = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];

    if (file.fieldname === 'video' && file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else if (file.fieldname === 'subtitle' && (file.mimetype === 'text/vtt' || normalizedName.endsWith('.vtt'))) {
      cb(null, true);
    } else if (
      file.fieldname === 'document' &&
      (documentAllowed.includes(file.mimetype) || normalizedName.endsWith('.pdf') || normalizedName.endsWith('.ppt') || normalizedName.endsWith('.pptx'))
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only video files, VTT subtitles, and PDF/PPT documents are allowed'));
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
  { name: 'subtitle', maxCount: 1 },
  { name: 'document', maxCount: 1 }
]), [
  body('courseId').isInt(),
  body('title').trim().notEmpty(),
  body('orderIndex').isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { courseId, title, description, content, videoUrl, subtitleUrl, documentUrl, orderIndex, durationMinutes } = req.body;

  // Handle uploaded files
  let finalVideoUrl = videoUrl || null;
  let finalSubtitleUrl = subtitleUrl || null;
  let finalDocumentUrl = documentUrl || null;
  
  if (req.files) {
    if (req.files.video && req.files.video[0]) {
      finalVideoUrl = `/uploads/videos/${req.files.video[0].filename}`;
    }
    if (req.files.subtitle && req.files.subtitle[0]) {
      finalSubtitleUrl = `/uploads/subtitles/${req.files.subtitle[0].filename}`;
    }
    if (req.files.document && req.files.document[0]) {
      finalDocumentUrl = `/uploads/documents/${req.files.document[0].filename}`;
    }
  }

  if (!finalVideoUrl && !finalDocumentUrl) {
    return res.status(400).json({ error: 'Please upload either a video or a document for the lesson.' });
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

    let extractedText = null;
    let finalAudioUrl = null;
    let transcript = null;

    // Process Document for Blind accessibility (Text extraction & TTS)
    if (finalDocumentUrl) {
      try {
        const fullDocPath = path.join(__dirname, '..', finalDocumentUrl);
        const lowerName = finalDocumentUrl.toLowerCase();
        let extracted = '';
        
        if (lowerName.endsWith('.pdf')) {
          extracted = await extractTextFromPdf(fullDocPath);
        } else if (lowerName.endsWith('.pptx')) {
          extracted = await extractTextFromPptx(fullDocPath);
        } else {
          extracted = `Lesson Document content reference: ${title}`;
        }

        extractedText = extracted || `Content from ${path.basename(finalDocumentUrl)}`;
        
        // Generate SAPI WAV TTS audio file
        const uniqueAudioName = `audio-${Date.now()}-${Math.round(Math.random() * 1e9)}.wav`;
        const audioPath = path.join(__dirname, '../uploads/audios', uniqueAudioName);
        
        const audioDir = path.dirname(audioPath);
        if (!fs.existsSync(audioDir)) {
          fs.mkdirSync(audioDir, { recursive: true });
        }

        // Limit length of text to speak to prevent power shell hangs
        const ttsText = extractedText.length > 3000
          ? extractedText.substring(0, 2997) + '...'
          : extractedText;

        await generateTtsAudio(ttsText, audioPath);
        finalAudioUrl = `/uploads/audios/${uniqueAudioName}`;
      } catch (docErr) {
        console.error('Error processing uploaded document for accessibility:', docErr);
      }
    }

    // Process Video for Deaf accessibility (FFmpeg + Whisper STT, or manual VTT)
    if (finalVideoUrl) {
      const manualSubtitleUpload = Boolean(req.files?.subtitle?.[0]);
      if (manualSubtitleUpload && finalSubtitleUrl) {
        // Teacher uploaded a real .vtt — parse it to plain-text transcript
        try {
          const fullSubPath = path.join(__dirname, '..', finalSubtitleUrl);
          if (fs.existsSync(fullSubPath)) {
            const vttText = fs.readFileSync(fullSubPath, 'utf8');
            transcript = parseVttToTranscript(vttText);
          }
        } catch (subErr) {
          console.error('Error reading manual subtitle file:', subErr);
        }
      }
      // If no manual subtitle was uploaded, Whisper will run in the background
      // after the lesson is saved. subtitle_url stays null until STT completes.
    }

    const result = await pool.query(
      `INSERT INTO lessons (
         course_id, title, description, content, video_url, subtitle_url, 
         document_url, order_index, duration_minutes, audio_url, extracted_text, transcript
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        courseId, title, description || null, content || null, finalVideoUrl, finalSubtitleUrl, 
        finalDocumentUrl, orderIndex, durationMinutes || null, finalAudioUrl, extractedText, transcript
      ]
    );

    const savedLesson = result.rows[0];

    // Kick off background STT if a video was uploaded without a manual subtitle
    if (finalVideoUrl && !finalSubtitleUrl) {
      const uniqueSubName = `subtitle-${Date.now()}-${Math.round(Math.random() * 1e9)}.vtt`;
      const subtitlePath = path.join(__dirname, '../uploads/subtitles', uniqueSubName);
      const fullVideoPath = path.join(__dirname, '..', finalVideoUrl);
      const subtitleUrl = `/uploads/subtitles/${uniqueSubName}`;

      // Fire-and-forget — do not await so the HTTP response is sent immediately
      runSttInBackground(savedLesson.id, fullVideoPath, subtitlePath, subtitleUrl);
    }

    res.status(201).json(savedLesson);
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

// Update lesson
router.put('/:id', authenticateToken, checkRole('teacher', 'admin'), upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'subtitle', maxCount: 1 },
  { name: 'document', maxCount: 1 }
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
    const { title, description, content, videoUrl, subtitleUrl, documentUrl, orderIndex, durationMinutes } = req.body;

    const existingLesson = await pool.query(
      'SELECT title, description, video_url, subtitle_url, document_url, audio_url, extracted_text, transcript FROM lessons WHERE id = $1',
      [id]
    );

    if (existingLesson.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const lessonData = existingLesson.rows[0];

    // Handle uploaded files and preserve current media if no new file is provided.
    let finalVideoUrl = lessonData.video_url;
    let finalSubtitleUrl = lessonData.subtitle_url;
    let finalDocumentUrl = lessonData.document_url;
    let finalAudioUrl = lessonData.audio_url;
    let extractedText = lessonData.extracted_text;
    let transcript = lessonData.transcript;

    if (videoUrl !== undefined) {
      finalVideoUrl = videoUrl;
    }
    if (subtitleUrl !== undefined) {
      finalSubtitleUrl = subtitleUrl;
    }
    if (documentUrl !== undefined) {
      finalDocumentUrl = documentUrl;
    }

    let docChanged = false;
    let videoChanged = false;
    let subtitleChanged = false;

    if (req.files) {
      if (req.files.video && req.files.video[0]) {
        // Delete old video file
        deleteLocalFile(lessonData.video_url);
        finalVideoUrl = `/uploads/videos/${req.files.video[0].filename}`;
        videoChanged = true;
      }
      if (req.files.subtitle && req.files.subtitle[0]) {
        // Delete old subtitle file
        deleteLocalFile(lessonData.subtitle_url);
        finalSubtitleUrl = `/uploads/subtitles/${req.files.subtitle[0].filename}`;
        subtitleChanged = true;
      }
      if (req.files.document && req.files.document[0]) {
        // Delete old document & TTS files
        deleteLocalFile(lessonData.document_url);
        deleteLocalFile(lessonData.audio_url);
        finalDocumentUrl = `/uploads/documents/${req.files.document[0].filename}`;
        docChanged = true;
      }
    }

    if (!finalVideoUrl && !finalDocumentUrl) {
      return res.status(400).json({ error: 'Lesson must include either a video or a document.' });
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

    // Re-extract document text and generate TTS if new document was uploaded
    if (docChanged && finalDocumentUrl) {
      try {
        const fullDocPath = path.join(__dirname, '..', finalDocumentUrl);
        const lowerName = finalDocumentUrl.toLowerCase();
        let extracted = '';

        if (lowerName.endsWith('.pdf')) {
          extracted = await extractTextFromPdf(fullDocPath);
        } else if (lowerName.endsWith('.pptx')) {
          extracted = await extractTextFromPptx(fullDocPath);
        } else {
          extracted = `Lesson Document content reference: ${title || lessonData.title}`;
        }

        extractedText = extracted || `Content from ${path.basename(finalDocumentUrl)}`;

        const uniqueAudioName = `audio-${Date.now()}-${Math.round(Math.random() * 1e9)}.wav`;
        const audioPath = path.join(__dirname, '../uploads/audios', uniqueAudioName);

        const ttsText = extractedText.length > 3000
          ? extractedText.substring(0, 2997) + '...'
          : extractedText;

        await generateTtsAudio(ttsText, audioPath);
        finalAudioUrl = `/uploads/audios/${uniqueAudioName}`;
      } catch (docErr) {
        console.error('Error re-processing document for accessibility:', docErr);
      }
    }

    // Re-generate captions when a new video is uploaded, or parse manual VTT upload
    if (subtitleChanged && finalSubtitleUrl) {
      // Teacher uploaded a real .vtt — parse it to plain-text transcript
      try {
        const fullSubPath = path.join(__dirname, '..', finalSubtitleUrl);
        if (fs.existsSync(fullSubPath)) {
          const vttText = fs.readFileSync(fullSubPath, 'utf8');
          transcript = parseVttToTranscript(vttText);
        }
      } catch (subErr) {
        console.error('Error reading manual subtitle file:', subErr);
      }
    } else if (videoChanged && finalVideoUrl) {
      // New video uploaded without a manual subtitle — delete old subtitle and
      // let Whisper regenerate in the background after we respond.
      deleteLocalFile(lessonData.subtitle_url);
      finalSubtitleUrl = null; // will be set by background STT
      transcript = null;
    }

    const result = await pool.query(
      `UPDATE lessons 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           content = COALESCE($3, content),
           video_url = COALESCE($4, video_url),
           subtitle_url = $5,
           document_url = COALESCE($6, document_url),
           audio_url = COALESCE($7, audio_url),
           extracted_text = COALESCE($8, extracted_text),
           transcript = $9,
           order_index = COALESCE($10, order_index),
           duration_minutes = COALESCE($11, duration_minutes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [
        title, description, content, finalVideoUrl, finalSubtitleUrl, finalDocumentUrl, 
        finalAudioUrl, extractedText, transcript, orderIndex, durationMinutes, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const savedLesson = result.rows[0];

    // Kick off background STT if a new video was uploaded without a manual subtitle
    if (videoChanged && finalVideoUrl && !subtitleChanged) {
      const uniqueSubName = `subtitle-${Date.now()}-${Math.round(Math.random() * 1e9)}.vtt`;
      const subtitlePath = path.join(__dirname, '../uploads/subtitles', uniqueSubName);
      const fullVideoPath = path.join(__dirname, '..', finalVideoUrl);
      const subtitleUrl = `/uploads/subtitles/${uniqueSubName}`;

      // Fire-and-forget — do not await so the HTTP response is sent immediately
      runSttInBackground(savedLesson.id, fullVideoPath, subtitlePath, subtitleUrl);
    }

    res.json(savedLesson);
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

/**
 * POST /api/lessons/:id/regenerate-subtitles
 * Manually trigger Whisper STT for a lesson that has a video but no subtitles,
 * or to replace existing subtitles with a fresh transcription.
 * Responds immediately with 202 Accepted; STT runs in the background.
 */
router.post('/:id/regenerate-subtitles', authenticateToken, checkRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT video_url, subtitle_url FROM lessons WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const lesson = existing.rows[0];

    if (!lesson.video_url) {
      return res.status(400).json({ error: 'This lesson has no video — subtitles cannot be generated.' });
    }

    // Check ownership for teachers
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

    // Delete old subtitle file if present
    deleteLocalFile(lesson.subtitle_url);

    // Clear subtitle_url and transcript so the frontend shows "Generating…"
    await pool.query(
      `UPDATE lessons SET subtitle_url = NULL, transcript = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    const uniqueSubName = `subtitle-${Date.now()}-${Math.round(Math.random() * 1e9)}.vtt`;
    const subtitlePath = path.join(__dirname, '../uploads/subtitles', uniqueSubName);
    const fullVideoPath = path.join(__dirname, '..', lesson.video_url);
    const subtitleUrl = `/uploads/subtitles/${uniqueSubName}`;

    // Fire-and-forget background STT
    runSttInBackground(Number(id), fullVideoPath, subtitlePath, subtitleUrl);

    res.status(202).json({
      message: 'Subtitle generation started. Subtitles will be available shortly.',
      lessonId: id,
    });
  } catch (error) {
    console.error('Regenerate subtitles error:', error);
    res.status(500).json({ error: 'Failed to start subtitle generation' });
  }
});

// Delete lesson
router.delete('/:id', authenticateToken, checkRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch existing files first to delete them
    const existing = await pool.query(
      'SELECT video_url, subtitle_url, document_url, audio_url FROM lessons WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const lessonData = existing.rows[0];

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

    // Clean up local files
    deleteLocalFile(lessonData.video_url);
    deleteLocalFile(lessonData.subtitle_url);
    deleteLocalFile(lessonData.document_url);
    deleteLocalFile(lessonData.audio_url);

    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

module.exports = router;
