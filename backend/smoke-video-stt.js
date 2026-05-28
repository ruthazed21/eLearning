/**
 * Smoke test: FFmpeg audio extract + Whisper STT → VTT
 * Run: node smoke-video-stt.js
 * First run downloads the Whisper model (~75 MB for whisper-tiny.en).
 */
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { generateTtsAudio } = require('./utils/accessibility');
const { transcribeVideoToSubtitles } = require('./utils/videoTranscription');

const execFileAsync = promisify(execFile);

function getFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    return require('ffmpeg-static');
  } catch {
    return 'ffmpeg';
  }
}

async function ensureTestVideo(mp4Path, wavPath) {
  if (!fs.existsSync(wavPath)) {
    const dir = path.dirname(wavPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await generateTtsAudio(
      'Hello. This is a speech to text smoke test for lecture captions.',
      wavPath
    );
  }

  const ffmpeg = getFfmpeg();
  const dir = path.dirname(mp4Path);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await execFileAsync(ffmpeg, [
    '-y',
    '-f', 'lavfi',
    '-i', 'color=c=black:s=320x240:d=1',
    '-i', wavPath,
    '-c:v', 'libx264',
    '-tune', 'stillimage',
    '-c:a', 'aac',
    '-shortest',
    mp4Path,
  ], { timeout: 120000 });

  if (!fs.existsSync(mp4Path)) {
    throw new Error('Failed to create test MP4');
  }
}

async function main() {
  console.log('FFmpeg binary:', getFfmpeg());

  const wavPath = path.join(__dirname, 'uploads', 'temp-audio', 'smoke-stt-input.wav');
  const mp4Path = path.join(__dirname, 'uploads', 'temp-audio', 'smoke-stt-input.mp4');
  const vttPath = path.join(__dirname, 'uploads', 'subtitles', `smoke-stt-${Date.now()}.vtt`);

  console.log('Building short test video with spoken audio...');
  await ensureTestVideo(mp4Path, wavPath);

  console.log('Running video → VTT transcription (may take 1–3 min first time)...');
  const result = await transcribeVideoToSubtitles(mp4Path, vttPath);

  const vtt = fs.readFileSync(vttPath, 'utf8');
  console.log('\nResult source:', result.source);
  console.log('VTT preview:\n', vtt.slice(0, 600));
  console.log('\nTranscript preview:\n', result.transcript.slice(0, 400));

  if (result.source !== 'whisper') {
    console.error('\nFAIL: expected whisper source (check FFmpeg / model download).');
    process.exit(1);
  }

  const lower = vtt.toLowerCase();
  if (lower.includes('lesson title:') || lower.includes('hello and welcome to this lecture')) {
    console.error('\nFAIL: output looks like template fallback text, not real STT.');
    process.exit(1);
  }

  console.log('\nOK: real STT pipeline produced captions.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
