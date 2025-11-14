-- Migration: Store attachment files directly in database
-- This changes the attachment storage from external storage (S3) to database storage

-- Add file_data column to store the actual file content
ALTER TABLE ticket_attachment
ADD COLUMN file_data bytea NULL;

-- Make storage_url nullable since we may not use it anymore
ALTER TABLE ticket_attachment
ALTER COLUMN storage_url DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN ticket_attachment.file_data IS 'Binary file data stored directly in the database';
COMMENT ON COLUMN ticket_attachment.storage_url IS 'Optional external storage URL (deprecated, kept for backward compatibility)';

