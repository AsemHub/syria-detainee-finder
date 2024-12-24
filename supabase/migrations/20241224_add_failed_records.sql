-- Add failed_records column to upload_sessions table
ALTER TABLE upload_sessions ADD COLUMN IF NOT EXISTS failed_records JSONB;

-- Add an index for faster querying of failed records
CREATE INDEX IF NOT EXISTS idx_upload_sessions_failed_records ON upload_sessions USING GIN (failed_records);

-- Comment on the column
COMMENT ON COLUMN upload_sessions.failed_records IS 'Stores failed records with their error details in JSON format';
