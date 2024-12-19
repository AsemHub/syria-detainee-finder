-- DOWN MIGRATION
-- This file reverts all changes made in the consolidated upload feature migration

-- Step 1: Drop Materialized Views and Related Functions
DROP MATERIALIZED VIEW IF EXISTS location_statistics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS detainee_statistics CASCADE;
DROP FUNCTION IF EXISTS refresh_materialized_views();
DROP FUNCTION IF EXISTS search_detainees(text);

-- Step 2: Remove Search Vector
ALTER TABLE public.detainees DROP COLUMN IF EXISTS search_vector;

-- Step 3: Drop Upload Sessions Trigger and Function
DROP TRIGGER IF EXISTS update_upload_sessions_updated_at ON public.upload_sessions;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Step 4: Remove Upload Sessions Security
DROP POLICY IF EXISTS "Allow service role access" ON public.upload_sessions;
DROP POLICY IF EXISTS "Allow authenticated view" ON public.upload_sessions;
ALTER TABLE public.upload_sessions DISABLE ROW LEVEL SECURITY;

-- Step 5: Remove Storage Policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Step 6: Revert Detainees Table Structure
-- Add temporary text columns
ALTER TABLE public.detainees 
    ADD COLUMN gender_text TEXT,
    ADD COLUMN status_text TEXT;

-- Convert enum values back to text
UPDATE public.detainees
SET 
    gender_text = gender::TEXT,
    status_text = status::TEXT;

-- Drop enum columns and rename text columns
ALTER TABLE public.detainees 
    DROP COLUMN gender,
    DROP COLUMN status;

ALTER TABLE public.detainees 
    RENAME COLUMN gender_text TO gender;

ALTER TABLE public.detainees 
    RENAME COLUMN status_text TO status;

-- Step 7: Remove Unique Constraint
ALTER TABLE public.detainees
DROP CONSTRAINT IF EXISTS unique_detainee_record;

-- Step 8: Drop Upload Sessions Table
DROP TABLE IF EXISTS public.upload_sessions;

-- Step 9: Remove Storage Bucket
DELETE FROM storage.buckets WHERE id = 'csv-uploads';

-- Step 10: Drop Custom Types
DROP TYPE IF EXISTS upload_status_enum;
DROP TYPE IF EXISTS detainee_status_enum;
DROP TYPE IF EXISTS gender_enum;
