# Speech-to-Text Implementation Guide

## ✅ What Changed

The backend now supports **real speech-to-text transcription** for uploaded MP4 videos using OpenAI's Whisper API.

### Before (Dummy Implementation):
- Generated placeholder subtitles based on lesson title/description
- No actual audio processing

### After (Real Implementation):
- Extracts audio from MP4 files
- Sends audio to OpenAI Whisper API for accurate transcription
- Generates proper VTT subtitles with timing
- Stores full transcript in `extracted_text` column
- Graceful fallback to dummy subtitles if API unavailable

---

## 🔧 Required Dependencies

### 1. **FFmpeg** (for audio extraction from video)
FFmpeg extracts audio from MP4 files before sending to Whisper API.

**Installation on Windows:**
- Download: https://ffmpeg.org/download.html
- OR use Chocolatey: `choco install ffmpeg`
- OR use winget: `winget install FFmpeg.FFmpeg`

**Verify installation:**
```powershell
ffmpeg -version
```

### 2. **Node.js Packages** (install these in backend/)
```bash
cd backend
npm install openai form-data node-fetch@2
```

**Packages:**
- `openai`: Official OpenAI SDK for Whisper API
- `form-data`: For multipart form requests to Whisper API
- `node-fetch@2`: HTTP client for API calls (v2 for compatibility)

---

## 🔑 Configuration

### 1. **Get OpenAI API Key**
1. Go to https://platform.openai.com/account/api-keys
2. Create a new API key
3. Copy the key (you won't see it again)

### 2. **Add to `.env` file** in `backend/`

```env
# Existing config...
OPENAI_API_KEY=sk-your-api-key-here
```

**Example:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=e_learning_db
DB_USER=eduaccess_user
DB_PASSWORD=postgresql

# Server Configuration
PORT=5000

# Frontend CORS
FRONTEND_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=hamimesfin@gmail.com
SMTP_PASS=enzikxgihmqruidb
EMAIL_FROM=no-reply@eduaccess.com

# OpenAI Whisper API for Speech-to-Text
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 3. **Restart backend**
```bash
cd backend
npm run dev
```

---

## 🎯 How It Works

When a teacher uploads a video file:

1. **Video Upload** → File saved to `/uploads/videos/`
2. **Audio Extraction** → FFmpeg extracts MP3 from MP4
3. **Whisper API Call** → Audio sent to OpenAI Whisper
4. **Transcription** → Full transcript returned
5. **VTT Generation** → Subtitles created with timing estimates
6. **Database Save** → `extracted_text` and `transcript` columns filled
7. **Cleanup** → Temporary audio file deleted

---

## 💰 Cost Considerations

**OpenAI Whisper API Pricing:**
- $0.006 per minute of audio
- Example: 1-hour video = ~$0.36

**Cost optimization:**
- Only processes when real video uploaded (not dummy subtitles)
- Graceful fallback if API unavailable
- Can batch process videos during off-hours

---

## 🔍 Testing the Implementation

### 1. **Test with a video file**
- Open frontend → Teacher dashboard
- Upload a lesson with an MP4 video
- Watch backend logs for:
  ```
  Starting speech-to-text processing for video...
  Extracting audio from video...
  Sending audio to OpenAI Whisper API...
  Speech-to-text processing completed successfully
  ```

### 2. **Verify in database**
```sql
SELECT id, title, extracted_text, transcript 
FROM lessons 
WHERE video_url IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 1;
```

### 3. **Check VTT file**
Navigate to: `backend/uploads/subtitles/` → Open latest `.vtt` file
Should contain proper timing and transcript text.

---

## 🚨 Troubleshooting

### "ffmpeg not found"
**Solution:** Install ffmpeg properly and restart terminal/backend
```powershell
ffmpeg -version  # Should show version info
```

### "OPENAI_API_KEY is missing"
**Solution:** 
1. Add key to `.env` file
2. Restart backend: `npm run dev`
3. Check logs: Should say "Starting speech-to-text processing..."

### "Whisper API error: Invalid API key"
**Solution:** 
1. Verify API key is correct in `.env`
2. Check it's not expired (regenerate from OpenAI dashboard)
3. Ensure no extra spaces/characters

### "Audio extraction failed"
**Solution:**
1. Verify FFmpeg is in system PATH
2. Check video file is valid MP4
3. Ensure `/uploads/videos/` directory exists and is writable

### "Request timeout"
**Solution:**
- Whisper API can take 1-5 minutes for long videos
- Backend is configured with generous timeout
- Check backend logs for progress

---

## 📋 Alternative Speech-to-Text Services

If you don't want to use OpenAI, alternatives:

### **Google Cloud Speech-to-Text**
- More expensive per minute (~$0.02-$0.04)
- Higher accuracy
- Requires Google Cloud credentials

### **AWS Transcribe**
- Similar pricing to Whisper ($0.0001 per second)
- Good accuracy
- Requires AWS credentials

### **Self-hosted Whisper (Python)**
- Free but requires Python + model downloads
- Slower processing
- Complex setup

---

## 📝 Files Modified

1. **`backend/utils/accessibility.js`**
   - Added `processVideoForSpeechToText()` function
   - Added `generateVttFromTranscript()` helper
   - Modified `generateSubtitlesAndTranscript()` as fallback

2. **`backend/routes/lessons.js`**
   - Updated video processing to call new speech-to-text function
   - Added graceful fallback to dummy subtitles
   - Added warning if API key not configured

---

## ✨ Next Steps

1. ✅ Install FFmpeg
2. ✅ Install Node packages: `npm install openai form-data node-fetch@2`
3. ✅ Get OpenAI API key from https://platform.openai.com/account/api-keys
4. ✅ Add `OPENAI_API_KEY` to `.env`
5. ✅ Restart backend: `npm run dev`
6. ✅ Upload a test video from teacher dashboard
7. ✅ Check logs and database for transcript

---

**Questions?** Check backend logs with: `npm run dev` and look for "speech-to-text" messages.
