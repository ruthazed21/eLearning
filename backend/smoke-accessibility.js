/**
 * Quick smoke test for accessibility pipeline (PDF extract, template VTT, TTS).
 * Run: node smoke-accessibility.js
 */
const path = require('path');
const fs = require('fs');
const {
  extractTextFromPdf,
  generateTtsAudio,
  generateSubtitlesAndTranscript,
} = require('./utils/accessibility');

async function main() {
  const results = { pdf: 'skip', vtt: 'skip', tts: 'skip' };

  const pdf = path.join(__dirname, '..', 'sample.pdf');
  if (fs.existsSync(pdf)) {
    const text = await extractTextFromPdf(pdf);
    results.pdf = `ok (${text.length} chars)`;
    console.log('PDF extract:', results.pdf);
    console.log('  preview:', text.slice(0, 100).replace(/\s+/g, ' '));
  } else {
    console.log('PDF extract: skip (no sample.pdf at repo root)');
  }

  const subPath = path.join(__dirname, 'uploads', 'subtitles', `smoke-${Date.now()}.vtt`);
  const stt = generateSubtitlesAndTranscript('Smoke Lesson', 'Test description', subPath);
  results.vtt = fs.existsSync(subPath) ? `ok (transcript ${stt.transcript.length} chars)` : 'fail';
  console.log('Template VTT/STT:', results.vtt);

  const audioPath = path.join(__dirname, 'uploads', 'audios', `smoke-tts-${Date.now()}.wav`);
  try {
    await generateTtsAudio('This is a smoke test for text to speech.', audioPath);
    const size = fs.existsSync(audioPath) ? fs.statSync(audioPath).size : 0;
    results.tts = size > 0 ? `ok (${size} bytes)` : 'fail (empty file)';
    console.log('TTS (Windows SAPI):', results.tts);
  } catch (err) {
    results.tts = `fail (${err.message})`;
    console.log('TTS (Windows SAPI):', results.tts);
  }

  const failed = Object.values(results).some((v) => v.startsWith('fail'));
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
