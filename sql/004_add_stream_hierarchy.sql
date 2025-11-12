-- Migration: Add hierarchical structure to streams
-- This allows streams to have parent-child relationships

-- Add parent_stream_id column to stream table
ALTER TABLE stream
ADD COLUMN parent_stream_id uuid NULL REFERENCES stream(id) ON DELETE CASCADE;

-- Create index for parent streams
CREATE INDEX ix_stream_parent ON stream(parent_stream_id) WHERE parent_stream_id IS NOT NULL;

-- Add a check constraint to prevent circular references (optional but recommended)
-- Note: This only prevents direct self-reference, not deeper cycles
ALTER TABLE stream
ADD CONSTRAINT chk_stream_no_self_parent CHECK (id != parent_stream_id);

-- Add a comment explaining the hierarchy
COMMENT ON COLUMN stream.parent_stream_id IS 'NULL for parent/root streams, references parent stream ID for child streams';

