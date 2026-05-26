# Video speech-to-text (captions)

This project generates **real WebVTT subtitles** from the **audio track of uploaded lecture videos**.

## Workflow

1. Teacher uploads a video via `POST /api/lessons` (unchanged frontend).
2. `backend/routes/lessons.js` saves the file under `uploads/videos/`.
3. If no manual `.vtt` was uploaded, `backend/utils/videoTranscription.js` runs:
   - **FFmpeg** extracts mono 16 kHz WAV → `uploads/temp-audio/` (deleted after STT).
   - **Whisper** (`@xenova/transformers`, model `Xenova/whisper-tiny.en` by default) transcribes speech with timestamps.
   - A `.vtt` file is written to `uploads/subtitles/`; plain text goes to `lessons.transcript`.
4. If FFmpeg or Whisper fails, `generateSubtitlesAndTranscript()` in `accessibility.js` writes **template** captions (title/description) so the lesson still has subtitles.

Manual `.vtt` upload by the teacher **skips** auto STT and uses `parseVttToTranscript()` as before.

## Files

| File | Role |
|------|------|
| `utils/videoTranscription.js` | FFmpeg extract + Whisper + VTT/transcript builders |
| `utils/accessibility.js` | Template fallback only (`generateSubtitlesAndTranscript`) |
| `routes/lessons.js` | Calls STT on create/update when video present and no manual VTT |

## Dependencies

### FFmpeg (required for real captions)

- **`ffmpeg-static`** is included in `package.json` and used automatically (no separate install needed on most machines).
- Alternatively install FFmpeg on PATH, or set `FFMPEG_PATH` in `.env` to your `ffmpeg.exe` full path.
  - Windows: `winget install Gyan.FFmpeg`
  - Verify: `ffmpeg -version`

### npm

- `@xenova/transformers` — runs Whisper in Node (no Python). First run downloads the model (~75 MB for `whisper-tiny.en`).
- `wavefile` — loads FFmpeg WAV output in Node (`read_audio` needs a browser `AudioContext`).
- `ffmpeg-static` — bundled `ffmpeg.exe` for Windows/macOS/Linux.

Install:

```bash
cd backend
npm install
```

## Environment (optional)

```env
# Full path if ffmpeg is not on PATH (Windows example)
# FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe

# Hugging Face / Xenova model id (default: Xenova/whisper-tiny.en)
# WHISPER_MODEL=Xenova/whisper-small.en

# Language hint for Whisper (default: model default, often english for .en models)
# WHISPER_LANGUAGE=english
```

## Performance notes

- Transcription runs **synchronously** during lesson create/update. Long videos can take several minutes; the HTTP request stays open until STT finishes or falls back.
- For production, consider a background job queue and a `caption_status` column later.
- Use a smaller model (`whisper-tiny`) for dev; `whisper-small` for better accuracy.

## Verify installation

```bash
cd backend
npm install
npm run smoke:stt
```

Expect `Result source: whisper` and VTT text from spoken audio (not “Lesson Title: …” template lines).

## Re-transcription

- **New video file** on update → old auto `.vtt` deleted, STT runs again.
- **Manual VTT upload** → STT skipped; transcript parsed from file.
- **Title/description only** → does **not** re-run STT (captions stay tied to video audio).
