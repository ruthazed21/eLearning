-- Migration to add subtitle support to lessons table
-- Run this script to update existing databases

-- Add subtitle_url column to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS subtitle_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN lessons.subtitle_url IS 'Path to subtitle/caption file (VTT format) for accessibility';