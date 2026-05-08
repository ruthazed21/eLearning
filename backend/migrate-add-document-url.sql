-- Add document_url column to lessons table and support PDF/PPT uploads for lessons
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS document_url TEXT;

COMMENT ON COLUMN lessons.document_url IS 'Path to uploaded lesson document files (PDF/PPT/PPTX)';
