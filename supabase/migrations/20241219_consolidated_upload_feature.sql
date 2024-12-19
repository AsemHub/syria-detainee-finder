-- CONSOLIDATED UPLOAD FEATURE MIGRATION
-- This file combines all upload-related migrations into a single file
-- Created: 2024-12-19

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Step 1: Create necessary ENUMs
DO $$ BEGIN
    -- Upload status enum
    CREATE TYPE upload_status_enum AS ENUM ('processing', 'completed', 'failed');
    -- Detainee status enum
    CREATE TYPE detainee_status_enum AS ENUM ('in_custody', 'missing', 'released', 'deceased', 'unknown');
    -- Gender enum
    CREATE TYPE gender_enum AS ENUM ('male', 'female', 'unknown');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create Storage Bucket for CSV Files
INSERT INTO storage.buckets (id, name, public)
VALUES ('csv-uploads', 'csv-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Configure bucket settings
UPDATE storage.buckets
SET 
    file_size_limit = 10485760, -- 10MB limit
    allowed_mime_types = ARRAY['text/csv', 'application/vnd.ms-excel']
WHERE id = 'csv-uploads';

-- Step 3: Create Upload Sessions Table
CREATE TABLE IF NOT EXISTS public.upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    skipped_duplicates INTEGER DEFAULT 0,
    status upload_status_enum DEFAULT 'processing',
    error_message TEXT,
    processing_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Add Unique Constraint to Detainees
-- Remove any existing duplicates first
WITH ranked_records AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY full_name, date_of_detention ORDER BY created_at DESC) as rn
    FROM detainees
)
DELETE FROM detainees
WHERE id IN (
    SELECT id 
    FROM ranked_records 
    WHERE rn > 1
);

-- Add unique constraint
ALTER TABLE detainees
ADD CONSTRAINT IF NOT EXISTS unique_detainee_record 
UNIQUE (full_name, date_of_detention);

COMMENT ON CONSTRAINT unique_detainee_record ON detainees 
IS 'Prevents duplicate entries for the same person with the same detention date';

-- Step 5: Update Detainees Table Structure
-- Add and convert gender and status to enums
ALTER TABLE public.detainees 
    ADD COLUMN IF NOT EXISTS gender_new gender_enum,
    ADD COLUMN IF NOT EXISTS status_new detainee_status_enum;

-- Update the new enum columns
UPDATE public.detainees
SET 
    gender_new = CASE 
        WHEN LOWER(gender) = 'male' THEN 'male'::gender_enum
        WHEN LOWER(gender) = 'female' THEN 'female'::gender_enum
        ELSE 'unknown'::gender_enum
    END,
    status_new = CASE 
        WHEN LOWER(status) = 'in_custody' THEN 'in_custody'::detainee_status_enum
        WHEN LOWER(status) = 'missing' THEN 'missing'::detainee_status_enum
        WHEN LOWER(status) = 'released' THEN 'released'::detainee_status_enum
        WHEN LOWER(status) = 'deceased' THEN 'deceased'::detainee_status_enum
        ELSE 'unknown'::detainee_status_enum
    END
WHERE gender_new IS NULL OR status_new IS NULL;

-- Drop old columns and rename new ones
ALTER TABLE public.detainees 
    DROP COLUMN IF EXISTS gender,
    DROP COLUMN IF EXISTS status;

ALTER TABLE public.detainees 
    RENAME COLUMN gender_new TO gender;

ALTER TABLE public.detainees 
    RENAME COLUMN status_new TO status;

-- Set default values
ALTER TABLE public.detainees 
    ALTER COLUMN gender SET DEFAULT 'unknown'::gender_enum,
    ALTER COLUMN status SET DEFAULT 'unknown'::detainee_status_enum;

-- Step 6: Storage Policies
-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage policies
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'csv-uploads');

CREATE POLICY "Allow service role access"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'csv-uploads');

CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'csv-uploads');

CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'csv-uploads' AND (auth.uid() = owner OR auth.role() = 'service_role'))
WITH CHECK (bucket_id = 'csv-uploads');

CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'csv-uploads' AND (auth.uid() = owner OR auth.role() = 'service_role'));

-- Step 7: Upload Sessions Security
-- Enable RLS
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow service role access" ON public.upload_sessions
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated view" ON public.upload_sessions
    FOR SELECT TO authenticated
    USING (true);

-- Step 8: Create Updated At Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_upload_sessions_updated_at
    BEFORE UPDATE ON public.upload_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Add Search Vector and Vector Search Function
ALTER TABLE public.detainees 
DROP COLUMN IF EXISTS search_vector;

ALTER TABLE public.detainees 
ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(full_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(last_seen_location, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(detention_facility, '')), 'B')
) STORED;

-- Create search function with proper return type
CREATE OR REPLACE FUNCTION public.search_detainees(
    search_text text,
    max_results integer DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    full_name text,
    last_seen_location text,
    status text,
    gender text,
    age_at_detention integer,
    date_of_detention date,
    notes text,
    detention_facility text,
    physical_description text,
    search_rank float4
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    normalized_query text;
    search_tokens text[];
    tsquery_str text;
BEGIN
    IF search_text IS NULL OR length(trim(search_text)) = 0 THEN
        RAISE EXCEPTION 'Search failed: search text cannot be empty'
            USING HINT = 'Please provide a search term';
    END IF;

    normalized_query := lower(trim(search_text));
    
    -- Split the search text into tokens
    search_tokens := regexp_split_to_array(normalized_query, '\s+');
    
    -- Create a tsquery string with | between each token for better recall
    tsquery_str := array_to_string(
        array_agg('(' || quote_literal(token) || ':* | ' || quote_literal(token) || ')'),
        ' & '
    ) FROM unnest(search_tokens) AS token;

    RETURN QUERY
    WITH ranked_results AS (
        SELECT 
            d.id,
            d.full_name,
            d.last_seen_location,
            d.status::text,
            d.gender::text,
            d.age_at_detention,
            d.date_of_detention,
            d.additional_notes as notes,
            d.detention_facility,
            d.physical_description,
            GREATEST(
                ts_rank(
                    setweight(to_tsvector('simple', COALESCE(d.full_name, '')), 'A') ||
                    setweight(to_tsvector('simple', COALESCE(d.last_seen_location, '')), 'B') ||
                    setweight(to_tsvector('simple', COALESCE(d.detention_facility, '')), 'C'),
                    to_tsquery('simple', tsquery_str)
                ),
                CASE 
                    WHEN d.full_name ILIKE '%' || normalized_query || '%' THEN 1.0
                    WHEN d.last_seen_location ILIKE '%' || normalized_query || '%' THEN 0.8
                    WHEN d.detention_facility ILIKE '%' || normalized_query || '%' THEN 0.6
                    ELSE 0.0
                END
            ) as search_rank
        FROM 
            public.detainees d
        WHERE 
            (
                to_tsvector('simple', COALESCE(d.full_name, '')) @@ to_tsquery('simple', tsquery_str) OR
                to_tsvector('simple', COALESCE(d.last_seen_location, '')) @@ to_tsquery('simple', tsquery_str) OR
                to_tsvector('simple', COALESCE(d.detention_facility, '')) @@ to_tsquery('simple', tsquery_str)
            ) OR
            d.full_name ILIKE '%' || normalized_query || '%' OR
            d.last_seen_location ILIKE '%' || normalized_query || '%' OR
            d.detention_facility ILIKE '%' || normalized_query || '%'
    )
    SELECT *
    FROM ranked_results
    WHERE search_rank > 0
    ORDER BY search_rank DESC
    LIMIT max_results;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.search_detainees(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_detainees(text, integer) TO service_role;

-- Create indexes to support the search
DROP INDEX IF EXISTS idx_detainees_fulltext_search;
CREATE INDEX idx_detainees_fulltext_search ON public.detainees USING gin(
    setweight(to_tsvector('simple', COALESCE(full_name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(last_seen_location, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(detention_facility, '')), 'C')
);

-- Step 10: Create Materialized Views
-- Create materialized view for detainee statistics
DROP MATERIALIZED VIEW IF EXISTS detainee_statistics;
CREATE MATERIALIZED VIEW detainee_statistics AS
SELECT
    COUNT(*) as total_detainees,
    COUNT(*) FILTER (WHERE status = 'in_custody') as in_custody_count,
    COUNT(*) FILTER (WHERE status = 'missing') as missing_count,
    COUNT(*) FILTER (WHERE status = 'released') as released_count,
    COUNT(*) FILTER (WHERE status = 'deceased') as deceased_count,
    COUNT(*) FILTER (WHERE status = 'unknown') as unknown_status_count,
    COUNT(*) FILTER (WHERE gender = 'male') as male_count,
    COUNT(*) FILTER (WHERE gender = 'female') as female_count,
    COUNT(*) FILTER (WHERE gender = 'unknown') as unknown_gender_count,
    COUNT(DISTINCT detention_facility) as unique_facilities_count,
    COUNT(DISTINCT last_seen_location) as unique_locations_count,
    MIN(date_of_detention) as earliest_detention_date,
    MAX(date_of_detention) as latest_detention_date
FROM
    detainees;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX ON detainee_statistics (total_detainees);

-- Create materialized view for location statistics
DROP MATERIALIZED VIEW IF EXISTS location_statistics;
CREATE MATERIALIZED VIEW location_statistics AS
SELECT
    last_seen_location,
    COUNT(*) as total_detainees,
    COUNT(*) FILTER (WHERE status = 'in_custody') as in_custody_count,
    COUNT(*) FILTER (WHERE status = 'missing') as missing_count,
    COUNT(*) FILTER (WHERE status = 'released') as released_count,
    COUNT(*) FILTER (WHERE status = 'deceased') as deceased_count,
    COUNT(*) FILTER (WHERE status = 'unknown') as unknown_count
FROM
    detainees
WHERE
    last_seen_location IS NOT NULL
GROUP BY
    last_seen_location
ORDER BY
    total_detainees DESC;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX ON location_statistics (last_seen_location);

-- Create refresh function for materialized views
CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
RETURNS void AS $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'detainee_statistics' 
        AND indexdef LIKE '%UNIQUE%'
    ) THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY detainee_statistics;
    ELSE
        REFRESH MATERIALIZED VIEW detainee_statistics;
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'location_statistics' 
        AND indexdef LIKE '%UNIQUE%'
    ) THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY location_statistics;
    ELSE
        REFRESH MATERIALIZED VIEW location_statistics;
    END IF;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.refresh_materialized_views() TO authenticated;

-- Initial refresh of views
SELECT public.refresh_materialized_views();
