-- Migration to add extracted_text and transcript columns to lessons table
-- Run this script to update existing databases

-- Add extracted_text column to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS extracted_text TEXT;

-- Add transcript column to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Add comments for documentation
COMMENT ON COLUMN lessons.extracted_text IS 'Extracted text content from lesson documents for full-text search and accessibility';
COMMENT ON COLUMN lessons.transcript IS 'Transcript of lesson video/audio content';
