const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { PDFParse } = require('pdf-parse');
const AdmZip = require('adm-zip');
const logger = require('../logger');

/**
 * Extracts raw text from a PDF file.
 * Uses pdf-parse v2 PDFParse class API.
 * @param {string} filePath - Absolute path to the PDF file.
 * @returns {Promise<string>} The extracted text.
 */
async function extractTextFromPdf(filePath) {
  let parser = null;
  try {
    const dataBuffer = fs.readFileSync(filePath);
    parser = new PDFParse({ data: new Uint8Array(dataBuffer) });
    const result = await parser.getText();
    // result.text contains concatenated page text
    const text = (result.text || '').trim();
    return text || 'No text content found in PDF.';
  } catch (error) {
    logger.error('Error extracting text from PDF:', { error: error.message, filePath });
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  } finally {
    if (parser) {
      try { await parser.destroy(); } catch (_) { /* ignore cleanup errors */ }
    }
  }
}

/**
 * Extracts text from a PPTX file.
 * @param {string} filePath - Absolute path to the PPTX file.
 * @returns {Promise<string>} The extracted text.
 */
async function extractTextFromPptx(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();
    
    // Slide entries are stored as ppt/slides/slide{N}.xml
    const slideEntries = [];
    zipEntries.forEach(entry => {
      const match = entry.entryName.match(/^ppt\/slides\/slide(\d+)\.xml$/);
      if (match) {
        slideEntries.push({
          num: parseInt(match[1]),
          entry: entry
        });
      }
    });

    if (slideEntries.length === 0) {
      return 'Empty presentation: no slides found.';
    }

    // Sort slide entries numerically (slide1, slide2, slide3, etc.)
    slideEntries.sort((a, b) => a.num - b.num);

    let extractedText = '';
    slideEntries.forEach(slide => {
      const xmlContent = zip.readAsText(slide.entry);
      
      // Extract text contained in <a:t>...</a:t> elements
      // Regex matches '<a:t>TEXT</a:t>' or '<a:t xml:space="preserve">TEXT</a:t>'
      const regex = /<a:t(?:\s+[^>]*)?>([^<]*)<\/a:t>/g;
      let match;
      const slideTexts = [];
      
      while ((match = regex.exec(xmlContent)) !== null) {
        if (match[1]) {
          slideTexts.push(match[1]);
        }
      }

      if (slideTexts.length > 0) {
        extractedText += `--- Slide ${slide.num} ---\n`;
        extractedText += slideTexts.join(' ').replace(/\s+/g, ' ').trim() + '\n\n';
      }
    });

    return extractedText.trim();
  } catch (error) {
    logger.error('Error extracting text from PPTX:', { error: error.message, filePath });
    throw new Error(`Failed to extract text from PPTX: ${error.message}`);
  }
}

/**
 * Generates an audio WAV file using the Windows Speech API (SAPI) via PowerShell.
 * @param {string} text - Text to read.
 * @param {string} outputPath - Output file path.
 * @returns {Promise<string>} Path to the generated audio file.
 */
function generateTtsAudio(text, outputPath) {
  return new Promise((resolve, reject) => {
    if (!text || !text.trim()) {
      return reject(new Error('TTS text cannot be empty'));
    }

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write text to a temporary file to avoid command-line quoting issues
    const tempTextFile = path.join(
      dir, 
      `temp-tts-${Date.now()}-${Math.round(Math.random() * 1e9)}.txt`
    );
    
    try {
      // Clean up text format slightly for speech
      const cleanedText = text
        .replace(/["']/g, '') // remove quotes to avoid PS parsing issues
        .replace(/[\r\n]+/g, ' '); // remove newlines
      
      fs.writeFileSync(tempTextFile, cleanedText, 'utf8');
    } catch (e) {
      logger.error('Failed to write temp text file for TTS:', e);
      return reject(e);
    }

    // Escape backslashes for PowerShell path strings
    const escapedTempPath = tempTextFile.replace(/\\/g, '\\\\');
    const escapedOutputPath = outputPath.replace(/\\/g, '\\\\');

    const psScript = `
      Add-Type -AssemblyName System.Speech;
      $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
      $synth.SetOutputToWaveFile('${escapedOutputPath}');
      $text = Get-Content -Path '${escapedTempPath}' -Raw;
      $synth.Speak($text);
      $synth.Dispose();
    `;

    // Flatten scripts into one-liner
    const oneLiner = psScript.replace(/\r?\n/g, ' ').trim();

    exec(`powershell -Command "${oneLiner}"`, (error, stdout, stderr) => {
      // Always cleanup temp text file
      try {
        if (fs.existsSync(tempTextFile)) {
          fs.unlinkSync(tempTextFile);
        }
      } catch (cleanupErr) {
        logger.error('Error deleting temp text file:', cleanupErr);
      }

      if (error) {
        logger.error('PowerShell SAPI TTS Error:', { error: error.message, stderr });
        return reject(error);
      }

      logger.info(`TTS audio successfully generated: ${outputPath}`);
      resolve(outputPath);
    });
  });
}

/**
 * Fallback captions when FFmpeg/Whisper STT is unavailable (title/description only).
 * Real video speech transcription lives in utils/videoTranscription.js.
 * @param {string} title - Lesson title.
 * @param {string} description - Lesson description.
 * @param {string} subtitlePath - Path to output subtitle VTT file.
 * @returns {object} { transcript }
 */
function generateSubtitlesAndTranscript(title, description, subtitlePath) {
  const cleanTitle = title || 'Untitled Lesson';
  const cleanDesc = description || 'In this lesson, we cover course material and reference slides.';

  // VTT Subtitles Content
  const vttContent = `WEBVTT

00:00:01.000 --> 00:00:06.000
Lesson Title: ${cleanTitle}

00:00:07.000 --> 00:00:15.000
Hello and welcome to this lecture session. Today we are going to learn about ${cleanTitle}.

00:00:16.000 --> 00:00:25.000
Here is a quick overview of what we will cover: ${cleanDesc}.

00:00:26.000 --> 00:00:35.000
Please make sure you have downloaded all the lecture slides and notes.

00:00:36.000 --> 00:00:45.000
Let's get started with our core topic. Please pay close attention.
`;

  // Standard Transcript Text
  const transcript = `[00:01] Lesson Title: ${cleanTitle}
[00:07] Hello and welcome to this lecture session. Today we are going to learn about ${cleanTitle}.
[00:16] Here is a quick overview of what we will cover: ${cleanDesc}.
[00:26] Please make sure you have downloaded all the lecture slides and notes.
[00:36] Let's get started with our core topic. Please pay close attention.`;

  // Write subtitle file
  const dir = path.dirname(subtitlePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(subtitlePath, vttContent, 'utf8');
  logger.info(`VTT subtitles successfully generated: ${subtitlePath}`);

  return { transcript };
}

module.exports = {
  extractTextFromPdf,
  extractTextFromPptx,
  generateTtsAudio,
  generateSubtitlesAndTranscript
};
