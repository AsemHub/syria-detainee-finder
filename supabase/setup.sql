-- Syria Detainee Finder Database Setup
-- This file contains all the necessary SQL commands to set up the database schema,
-- functions, and permissions for the Syria Detainee Finder project.

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
CREATE TYPE public.detainee_status AS ENUM (
    'in_custody',
    'missing',
    'released',
    'deceased',
    'unknown'
);

CREATE TYPE public.detainee_gender AS ENUM (
    'male',
    'female',
    'other',
    'unknown'
);

-- Create the detainees table
CREATE TABLE IF NOT EXISTS public.detainees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    last_seen_location TEXT,
    status TEXT,
    gender TEXT,
    age_at_detention INTEGER,
    date_of_detention TIMESTAMP WITH TIME ZONE,
    detention_facility TEXT,
    physical_description TEXT,
    additional_notes TEXT,
    contact_info TEXT,
    last_update_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    organization TEXT NOT NULL,
    CONSTRAINT age_check CHECK (age_at_detention >= 0 AND age_at_detention <= 150)
);

-- Create materialized view for search optimization
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_detainees_search AS
SELECT
    d.*,
    to_tsvector('arabic', COALESCE(d.full_name, '')) as name_vector,
    to_tsvector('arabic', COALESCE(d.last_seen_location, '')) as location_vector,
    to_tsvector('arabic', COALESCE(d.detention_facility, '')) as facility_vector,
    to_tsvector('arabic', COALESCE(d.physical_description, '')) as description_vector,
    to_tsvector('arabic', 
        COALESCE(d.full_name, '') || ' ' || 
        COALESCE(d.last_seen_location, '') || ' ' || 
        COALESCE(d.detention_facility, '') || ' ' || 
        COALESCE(d.physical_description, '')
    ) as full_vector
FROM public.detainees d;

-- Create indexes on the materialized view
CREATE INDEX IF NOT EXISTS idx_mv_detainees_name ON public.mv_detainees_search USING gin(name_vector);
CREATE INDEX IF NOT EXISTS idx_mv_detainees_location ON public.mv_detainees_search USING gin(location_vector);
CREATE INDEX IF NOT EXISTS idx_mv_detainees_facility ON public.mv_detainees_search USING gin(facility_vector);
CREATE INDEX IF NOT EXISTS idx_mv_detainees_full ON public.mv_detainees_search USING gin(full_vector);

-- Create refresh function and trigger
CREATE OR REPLACE FUNCTION public.refresh_search_view()
RETURNS trigger AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_detainees_search;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refresh_search_view_trigger ON public.detainees;
CREATE TRIGGER refresh_search_view_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.detainees
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.refresh_search_view();

-- Create optimized search function
CREATE OR REPLACE FUNCTION public.search_detainees_v2(
    search_query text,
    page_size int DEFAULT 20,
    cursor_id text DEFAULT NULL,
    cursor_rank float DEFAULT NULL,
    cursor_date timestamp DEFAULT NULL,
    estimate_total boolean DEFAULT true
) RETURNS TABLE (
    results jsonb,
    total_count bigint
) LANGUAGE plpgsql AS $$
DECLARE
    query_tsquery tsquery;
    search_type text;
BEGIN
    -- Normalize query and determine search type
    IF length(search_query) < 3 THEN
        search_type := 'prefix';
        query_tsquery := to_tsquery('arabic', regexp_replace(search_query, '(\w+)', '\1:*', 'g'));
    ELSE
        search_type := 'full';
        query_tsquery := to_tsquery('arabic', regexp_replace(search_query, '\s+', ':* & ', 'g') || ':*');
    END IF;

    RETURN QUERY
    WITH search_results AS (
        SELECT 
            d.*,
            CASE
                WHEN search_type = 'prefix' THEN
                    ts_rank_cd(name_vector, query_tsquery) * 2.0 +
                    ts_rank_cd(location_vector, query_tsquery) * 1.5 +
                    ts_rank_cd(facility_vector, query_tsquery) * 1.2 +
                    ts_rank_cd(description_vector, query_tsquery)
                ELSE
                    ts_rank_cd(full_vector, query_tsquery)
            END as rank
        FROM public.mv_detainees_search d
        WHERE 
            CASE
                WHEN search_type = 'prefix' THEN
                    name_vector @@ query_tsquery OR
                    location_vector @@ query_tsquery OR
                    facility_vector @@ query_tsquery OR
                    description_vector @@ query_tsquery
                ELSE
                    full_vector @@ query_tsquery
            END
            AND (
                cursor_id IS NULL OR
                (d.id, rank, COALESCE(d.last_update_date, d.created_at)) > (cursor_id, cursor_rank, cursor_date)
            )
        ORDER BY rank DESC, d.last_update_date DESC NULLS LAST
        LIMIT page_size
    )
    SELECT 
        jsonb_build_object(
            'results', COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'full_name', full_name,
                    'last_seen_location', last_seen_location,
                    'status', status,
                    'gender', gender,
                    'age_at_detention', age_at_detention,
                    'date_of_detention', date_of_detention,
                    'detention_facility', detention_facility,
                    'physical_description', physical_description,
                    'contact_info', contact_info,
                    'last_update_date', last_update_date,
                    'rank', rank
                )
            ), '[]'::jsonb),
            'total_count', CASE 
                WHEN estimate_total THEN (
                    SELECT count(*)::bigint 
                    FROM public.mv_detainees_search 
                    WHERE 
                        CASE
                            WHEN search_type = 'prefix' THEN
                                name_vector @@ query_tsquery OR
                                location_vector @@ query_tsquery OR
                                facility_vector @@ query_tsquery OR
                                description_vector @@ query_tsquery
                            ELSE
                                full_vector @@ query_tsquery
                        END
                )
                ELSE NULL
            END
        ) as results,
        CASE 
            WHEN estimate_total THEN (
                SELECT count(*)::bigint 
                FROM public.mv_detainees_search 
                WHERE 
                    CASE
                        WHEN search_type = 'prefix' THEN
                            name_vector @@ query_tsquery OR
                            location_vector @@ query_tsquery OR
                            facility_vector @@ query_tsquery OR
                            description_vector @@ query_tsquery
                        ELSE
                            full_vector @@ query_tsquery
                    END
            )
            ELSE NULL
        END as total_count;
END;
$$;

-- Create supporting documents table
CREATE TABLE public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    detainee_id UUID NOT NULL REFERENCES public.detainees(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    document_type TEXT NOT NULL,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    description TEXT,
    file_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT fk_detainee
        FOREIGN KEY(detainee_id) 
        REFERENCES public.detainees(id)
        ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.detainees ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON public.detainees
    FOR SELECT
    USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.detainees TO anon, authenticated;
GRANT SELECT ON public.mv_detainees_search TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_detainees_v2 TO anon, authenticated;

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_last_update_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_update_date = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_detainee_last_update_date
    BEFORE UPDATE ON public.detainees
    FOR EACH ROW
    EXECUTE FUNCTION public.update_last_update_date();

COMMENT ON TABLE public.detainees IS 'Stores information about detained individuals';
COMMENT ON TABLE public.documents IS 'Stores supporting documents related to detainees';
