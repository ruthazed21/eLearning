-- Migration to add accessibility columns to lessons table
-- Run this script to update existing databases

-- Add accessibility columns if they do not exist
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Add comments for documentation
COMMENT ON COLUMN lessons.audio_url IS 'Path to generated TTS audio file (WAV format)';
COMMENT ON COLUMN lessons.extracted_text IS 'Extracted text content from lesson documents (PDF/PPT/PPTX)';
COMMENT ON COLUMN lessons.transcript IS 'Auto-generated transcript/captions text from video/audio content';
