const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const logger = require('../logger');

const execFileAsync = promisify(execFile);

/** Cached Whisper pipeline (loaded once per server process). */
let transcriberPromise = null;

/**
 * Resolve FFmpeg binary.
 * Priority: FFMPEG_PATH env var → system "ffmpeg" on PATH → ffmpeg-static npm bundle.
 * The .env already sets FFMPEG_PATH=ffmpeg which points to the system install.
 */
function getFfmpegCommand() {
  // 1. Explicit env override (e.g. FFMPEG_PATH=ffmpeg or full path)
  if (process.env.FFMPEG_PATH) {
    return process.env.FFMPEG_PATH;
  }
  // 2. ffmpeg-static npm bundle (may not have the .exe if installed with --ignore-scripts)
  try {
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
      return ffmpegStatic;
    }
  } catch (_) {
    /* optional dependency */
  }
  // 3. System ffmpeg on PATH
  return 'ffmpeg';
}

/**
 * Extract mono 16 kHz PCM WAV from a video file (required for local Whisper).
 * @param {string} videoPath - Absolute path to video.
 * @param {string} audioPath - Absolute path for output .wav.
 */
async function extractAudioFromVideo(videoPath, audioPath) {
  const ffmpeg = getFfmpegCommand();
  const dir = path.dirname(audioPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await execFileAsync(
    ffmpeg,
    [
      '-i', videoPath,
      '-vn',
      '-acodec', 'pcm_s16le',
      '-ar', '16000',
      '-ac', '1',
      audioPath,
      '-y',
    ],
    { maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60 * 1000 }
  );

  if (!fs.existsSync(audioPath)) {
    throw new Error('FFmpeg did not produce an audio file');
  }

  logger.info('Audio extracted from video for STT', { videoPath, audioPath });
  return audioPath;
}

/**
 * Format seconds as WebVTT timestamp (HH:MM:SS.mmm).
 */
function formatVttTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const wholeSecs = Math.floor(secs);
  const ms = Math.round((secs - wholeSecs) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(wholeSecs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/**
 * Build WebVTT from Whisper segment chunks.
 */
function buildVttFromChunks(chunks) {
  const lines = ['WEBVTT', ''];
  chunks.forEach((chunk) => {
    const text = (chunk.text || '').trim();
    if (!text) return;
    const [start, end] = chunk.timestamp || [0, 0];
    const safeEnd = end > start ? end : start + 2;
    lines.push(`${formatVttTime(start)} --> ${formatVttTime(safeEnd)}`);
    lines.push(text);
    lines.push('');
  });
  return `${lines.join('\n').trim()}\n`;
}

/**
 * Plain-text transcript with [MM:SS] prefixes for the student transcript panel.
 */
function buildTranscriptFromChunks(chunks) {
  return chunks
    .map((chunk) => {
      const text = (chunk.text || '').trim();
      if (!text) return '';
      const start = (chunk.timestamp && chunk.timestamp[0]) || 0;
      const mm = String(Math.floor(start / 60)).padStart(2, '0');
      const ss = String(Math.floor(start % 60)).padStart(2, '0');
      return `[${mm}:${ss}] ${text}`;
    })
    .filter(Boolean)
    .join('\n');
}

async function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline } = await import('@xenova/transformers');
      const model = process.env.WHISPER_MODEL || 'Xenova/whisper-tiny.en';
      logger.info(`Loading Whisper model "${model}" (first request may download model files)...`);
      return pipeline('automatic-speech-recognition', model);
    })();
  }
  return transcriberPromise;
}

/**
 * Load WAV as Float32Array @ 16 kHz for Transformers.js (Node has no AudioContext).
 */
function loadWavForWhisper(audioPath) {
  const { WaveFile } = require('wavefile');
  const buffer = fs.readFileSync(audioPath);
  const wav = new WaveFile(buffer);
  wav.toSampleRate(16000);
  wav.toBitDepth('32f');
  let samples = wav.getSamples();
  if (Array.isArray(samples)) {
    if (samples.length === 0) {
      throw new Error('WAV file contains no audio samples');
    }
    samples = samples[0];
  }
  return Float32Array.from(samples);
}

/**
 * Run local Whisper (Transformers.js) on a 16 kHz WAV file.
 * @returns {Promise<Array<{timestamp: [number, number], text: string}>>}
 */
async function transcribeAudioWithWhisper(audioPath) {
  const transcriber = await getTranscriber();
  const audio = loadWavForWhisper(audioPath);

  const options = {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: true,
    task: 'transcribe',
  };

  if (process.env.WHISPER_LANGUAGE) {
    options.language = process.env.WHISPER_LANGUAGE;
  }

  const result = await transcriber(audio, options);

  if (result.chunks && result.chunks.length > 0) {
    return result.chunks;
  }

  const text = (result.text || '').trim();
  if (!text) {
    throw new Error('Whisper returned empty transcription');
  }

  return [{ timestamp: [0, 30], text }];
}

/**
 * Full pipeline: video → FFmpeg audio → Whisper → .vtt + transcript.
 *
 * NO fake/template fallback. If FFmpeg or Whisper fails, this throws so the
 * caller can handle the error explicitly (e.g. mark the lesson as
 * "subtitles pending" rather than storing fake captions).
 *
 * @param {string} videoPath    - Absolute path to uploaded video.
 * @param {string} subtitlePath - Absolute path for output .vtt.
 * @returns {Promise<{ transcript: string, source: 'whisper' }>}
 * @throws {Error} if FFmpeg extraction or Whisper transcription fails.
 */
async function transcribeVideoToSubtitles(videoPath, subtitlePath) {
  const tempDir = path.join(path.dirname(subtitlePath), '..', 'temp-audio');
  const tempAudioPath = path.join(tempDir, `stt-${Date.now()}-${Math.round(Math.random() * 1e9)}.wav`);

  try {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    // Step 1: Extract mono 16 kHz WAV from the video using FFmpeg
    await extractAudioFromVideo(videoPath, tempAudioPath);

    // Step 2: Run Whisper on the extracted audio
    const chunks = await transcribeAudioWithWhisper(tempAudioPath);

    // Step 3: Build VTT and plain-text transcript from Whisper segments
    const vttContent = buildVttFromChunks(chunks);
    const transcript = buildTranscriptFromChunks(chunks);

    if (!transcript.trim()) {
      throw new Error('Whisper returned empty transcription — the video may be silent or contain no speech');
    }

    // Step 4: Write the VTT file
    const subDir = path.dirname(subtitlePath);
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }
    fs.writeFileSync(subtitlePath, vttContent, 'utf8');

    logger.info('Real STT subtitles generated from video audio', {
      subtitlePath,
      segmentCount: chunks.length,
    });

    return { transcript, source: 'whisper' };
  } finally {
    // Always clean up the temporary WAV file
    if (fs.existsSync(tempAudioPath)) {
      try {
        fs.unlinkSync(tempAudioPath);
      } catch (cleanupErr) {
        logger.warn('Could not delete temp STT audio file', {
          tempAudioPath,
          error: cleanupErr.message,
        });
      }
    }
  }
}

module.exports = {
  extractAudioFromVideo,
  transcribeVideoToSubtitles,
  buildVttFromChunks,
  buildTranscriptFromChunks,
};
