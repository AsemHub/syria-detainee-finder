-- Add original_data column to detainees
ALTER TABLE detainees
ADD COLUMN IF NOT EXISTS original_data JSONB;

-- Drop the valid_counts constraint if it exists
ALTER TABLE upload_sessions 
DROP CONSTRAINT IF EXISTS valid_counts;

-- Add processing_details column if it doesn't exist
ALTER TABLE upload_sessions
ADD COLUMN IF NOT EXISTS processing_details JSONB DEFAULT '{"current_index": 0, "total": 0}'::jsonb;

-- Add current_record column if it doesn't exist
ALTER TABLE upload_sessions
ADD COLUMN IF NOT EXISTS current_record TEXT;

-- Add a more lenient constraint
ALTER TABLE upload_sessions
ADD CONSTRAINT valid_counts CHECK (
    (processed_records >= 0) AND
    (valid_records >= 0) AND
    (invalid_records >= 0) AND
    (duplicate_records >= 0) AND
    (processed_records >= (valid_records + invalid_records + duplicate_records))
);
