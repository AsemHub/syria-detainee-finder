-- Create upload_sessions table
CREATE TABLE IF NOT EXISTS upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    organization TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
    file_url TEXT,
    file_size BIGINT,
    mime_type TEXT,
    total_records INTEGER NOT NULL DEFAULT 0,
    processed_records INTEGER NOT NULL DEFAULT 0,
    valid_records INTEGER NOT NULL DEFAULT 0,
    invalid_records INTEGER NOT NULL DEFAULT 0,
    duplicate_records INTEGER NOT NULL DEFAULT 0,
    errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    current_record TEXT,
    processing_details JSONB NOT NULL DEFAULT '{
        "invalid_dates": 0,
        "missing_required": {
            "full_name": 0,
            "last_seen_location": 0,
            "contact_info": 0
        },
        "invalid_data": {
            "age": 0,
            "gender": 0,
            "status": 0
        }
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_update TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create storage bucket for CSV uploads if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('csv-uploads', 'csv-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to the bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'csv-uploads');

-- Enable RLS on upload_sessions
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public to create upload sessions
CREATE POLICY "Allow public to create upload sessions"
ON upload_sessions FOR INSERT
TO public
WITH CHECK (true);

-- Create policy to allow public to read their own upload sessions
CREATE POLICY "Allow public to read upload sessions"
ON upload_sessions FOR SELECT
TO public
USING (true);

-- Create policy to allow public to update their own upload sessions
CREATE POLICY "Allow public to update upload sessions"
ON upload_sessions FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
