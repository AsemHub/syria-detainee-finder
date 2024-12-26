-- Syria Detainee Finder Initial Database Setup

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Setup Arabic text search configuration
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_ts_config WHERE cfgname = 'arabic'
    ) THEN
        CREATE TEXT SEARCH CONFIGURATION arabic (PARSER = default);
        ALTER TEXT SEARCH CONFIGURATION arabic ALTER MAPPING FOR word, numword, asciiword, asciihword, hword, numhword, hword_part, hword_numpart, hword_asciipart WITH arabic_stem;
    END IF;
END
$$;

-- Create custom types
DROP TYPE IF EXISTS status_enum CASCADE;
CREATE TYPE status_enum AS ENUM (
    'in_custody',
    'missing',
    'released',
    'deceased',
    'unknown'
);

DROP TYPE IF EXISTS gender_enum CASCADE;
CREATE TYPE gender_enum AS ENUM (
    'male',
    'female',
    'unknown'
);

-- Create the detainees table
CREATE TABLE IF NOT EXISTS public.detainees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    original_name TEXT,
    last_seen_location TEXT,
    status status_enum DEFAULT 'unknown',
    gender gender_enum DEFAULT 'unknown',
    age_at_detention INTEGER,
    date_of_detention DATE,
    detention_facility TEXT,
    physical_description TEXT,
    additional_notes TEXT,
    contact_info TEXT,
    last_update_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    source_organization TEXT DEFAULT 'Public',
    organization TEXT,
    source_document_id TEXT
);

-- Create upload_sessions table
CREATE TABLE IF NOT EXISTS public.upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'pending',
    organization TEXT NOT NULL,
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    valid_records INTEGER DEFAULT 0,
    invalid_records INTEGER DEFAULT 0,
    duplicate_records INTEGER DEFAULT 0,
    skipped_duplicates INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    error_message TEXT,
    processing_details JSONB DEFAULT '{}'::jsonb,
    current_record TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_detainees_full_name ON public.detainees (full_name);
CREATE INDEX IF NOT EXISTS idx_detainees_original_name ON public.detainees (original_name);
CREATE INDEX IF NOT EXISTS idx_detainees_last_seen_location ON public.detainees (last_seen_location);
CREATE INDEX IF NOT EXISTS idx_detainees_status ON public.detainees (status);
CREATE INDEX IF NOT EXISTS idx_detainees_gender ON public.detainees (gender);
CREATE INDEX IF NOT EXISTS idx_detainees_date_of_detention ON public.detainees (date_of_detention);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON public.upload_sessions (status);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_organization ON public.upload_sessions (organization);

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_upload_sessions_updated_at
    BEFORE UPDATE ON public.upload_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Grant necessary permissions
ALTER TABLE public.detainees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.detainees TO anon;
GRANT ALL ON TABLE public.upload_sessions TO anon;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
