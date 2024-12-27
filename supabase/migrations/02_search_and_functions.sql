-- Syria Detainee Finder Search Functions and Extensions

-- Create enum types for detainee status and gender if they don't exist
DO $$ BEGIN
    CREATE TYPE status_enum AS ENUM (
        'in_custody',
        'missing',
        'released',
        'deceased',
        'unknown'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE gender_enum AS ENUM (
        'male',
        'female'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Revised normalize_arabic_text function with comprehensive Arabic normalization
CREATE OR REPLACE FUNCTION public.normalize_arabic_text(input_text text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
    normalized text;
BEGIN
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;

    normalized := input_text;

    -- Convert to NFKC normalized form (handles various Unicode representations)
    normalized := normalize(normalized, NFKC);

    -- Remove tatweel (kashida)
    normalized := regexp_replace(normalized, 'ـ', '', 'g');

    -- Remove tashkeel (diacritics) - comprehensive Unicode ranges
    normalized := regexp_replace(normalized, '[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]', '', 'g');

    -- Normalize ligatures to their component letters
    normalized := regexp_replace(normalized, 'ﻻ|ﻼ|ﻷ|ﻸ|ﻹ|ﻺ|ﻵ|ﻶ', 'لا', 'g');

    -- Normalize hamza forms comprehensively
    normalized := regexp_replace(normalized, '[أإآٲٳٵ]', 'ا', 'g');  -- All hamza-carrying alifs to alif
    normalized := regexp_replace(normalized, '[ئؤ]', 'ء', 'g');     -- Hamza on carriers to hamza

    -- Normalize all alif forms to plain alif
    normalized := regexp_replace(normalized, 'ٱ', 'ا', 'g');        -- Alif wasla to alif

    -- Normalize teh marbuta and heh at word end
    normalized := regexp_replace(normalized, 'ه\M', 'ة', 'g');      -- Final heh to teh marbuta

    -- Normalize alif maksura to alif
    normalized := regexp_replace(normalized, 'ى', 'ا', 'g');        -- Alif maksura to alif

    -- Normalize Persian/Urdu yeh to Arabic yeh
    normalized := regexp_replace(normalized, 'ی', 'ي', 'g');        -- Persian yeh to Arabic yeh

    -- Normalize waw variations
    normalized := regexp_replace(normalized, 'ۥ|ۆ', 'و', 'g');      -- Various waw forms to waw

    -- Normalize kaf forms
    normalized := regexp_replace(normalized, 'ک', 'ك', 'g');        -- Persian kaf to Arabic kaf
    
    -- Remove non-Arabic characters except numbers, spaces, and common punctuation
    normalized := regexp_replace(normalized, '[^\s\u0600-\u06FF0-9.,!?-]', '', 'g');

    -- Normalize whitespace (remove extra spaces)
    normalized := regexp_replace(normalized, '\s+', ' ', 'g');
    normalized := trim(normalized);

    -- Convert to lower case (for any non-Arabic characters that might remain)
    normalized := lower(normalized);

    RETURN normalized;
END;
$$;

-- Create function to check if text contains Arabic characters
CREATE OR REPLACE FUNCTION public.contains_arabic(text_to_check text)
RETURNS boolean AS $$
BEGIN
    RETURN text_to_check ~ '[؀-ۿ]';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create the name normalization function
CREATE OR REPLACE FUNCTION normalize_name(name text)
RETURNS text AS $$
BEGIN
    IF name IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN normalize_arabic_text(name);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create or replace function for effective date
CREATE OR REPLACE FUNCTION get_effective_date(detention_date date)
RETURNS date AS $$
BEGIN
    RETURN COALESCE(detention_date, '1900-01-01'::date);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add normalized text columns and effective date
ALTER TABLE detainees
    ADD COLUMN IF NOT EXISTS name_fts tsvector GENERATED ALWAYS AS (to_tsvector('arabic', normalize_arabic_text(COALESCE(full_name, '')))) STORED,
    ADD COLUMN IF NOT EXISTS location_fts tsvector GENERATED ALWAYS AS (to_tsvector('arabic', normalize_arabic_text(COALESCE(last_seen_location, '')))) STORED,
    ADD COLUMN IF NOT EXISTS description_fts tsvector GENERATED ALWAYS AS (to_tsvector('arabic', normalize_arabic_text(COALESCE(physical_description, '') || ' ' || COALESCE(additional_notes, '')))) STORED,
    ADD COLUMN IF NOT EXISTS contact_fts tsvector GENERATED ALWAYS AS (to_tsvector('arabic', normalize_arabic_text(COALESCE(contact_info, '')))) STORED,
    ADD COLUMN IF NOT EXISTS gender_terms text GENERATED ALWAYS AS (
        CASE 
            WHEN gender = 'female' THEN 'انثى أنثى امرأة نساء سيدة فتاة بنت نسائي مؤنث'
            WHEN gender = 'male' THEN 'ذكر رجل رجال شاب ولد مذكر'
            ELSE ''
        END
    ) STORED,
    ADD COLUMN IF NOT EXISTS normalized_name text GENERATED ALWAYS AS (normalize_name(full_name)) STORED,
    ADD COLUMN IF NOT EXISTS effective_date date GENERATED ALWAYS AS (get_effective_date(date_of_detention::date)) STORED,
    ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('arabic', COALESCE(normalize_arabic_text(full_name), '')), 'A') ||
        setweight(to_tsvector('arabic', COALESCE(normalize_arabic_text(last_seen_location), '')), 'B') ||
        setweight(to_tsvector('arabic', COALESCE(normalize_arabic_text(detention_facility), '')), 'C') ||
        setweight(to_tsvector('arabic', COALESCE(normalize_arabic_text(physical_description), '')), 'D') ||
        setweight(to_tsvector('arabic', COALESCE(normalize_arabic_text(additional_notes), '')), 'D') ||
        setweight(to_tsvector('arabic', COALESCE(normalize_arabic_text(gender_terms), '')), 'B')
    ) STORED;

-- Create unique index on normalized name and effective date
DROP INDEX IF EXISTS unique_detainee_record_normalized;
CREATE UNIQUE INDEX unique_detainee_record_normalized 
ON detainees (normalized_name, effective_date, organization) 
WHERE normalized_name IS NOT NULL;

-- Create materialized view for search
DROP MATERIALIZED VIEW IF EXISTS mv_detainees_search;
CREATE MATERIALIZED VIEW mv_detainees_search AS
SELECT
    d.id,
    d.full_name,
    d.original_name,
    d.date_of_detention,
    d.last_seen_location,
    d.detention_facility,
    d.physical_description,
    d.age_at_detention,
    d.gender,
    d.status,
    d.contact_info,
    d.additional_notes,
    d.created_at,
    d.last_update_date,
    d.source_organization,
    d.organization,
    d.normalized_name,
    d.effective_date,
    d.gender_terms,
    d.search_vector
FROM detainees d;

-- Create indexes on the materialized view
CREATE INDEX idx_mv_search_normalized_name ON mv_detainees_search (normalized_name);
CREATE INDEX idx_mv_search_vector ON mv_detainees_search USING gin(search_vector);
CREATE INDEX idx_mv_search_effective_date ON mv_detainees_search (effective_date);

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.search_detainees_enhanced(jsonb);

-- Create the enhanced search function
CREATE OR REPLACE FUNCTION public.search_detainees_enhanced(search_params JSONB)
RETURNS JSONB AS $$
DECLARE
    query_text text;
    normalized_query text;
    page_size int;
    page_number int;
    estimate_total boolean;
    filter_status text;
    filter_gender text;
    filter_date_from date;
    filter_date_to date;
    filter_age_min int;
    filter_age_max int;
    filter_location text;
    filter_facility text;
    total_count int;
    search_results JSONB;
BEGIN
    -- Extract parameters with defaults
    query_text := search_params->>'query';
    page_size := COALESCE((search_params->>'pageSize')::int, 20);
    page_number := COALESCE((search_params->>'pageNumber')::int, 1);
    estimate_total := COALESCE((search_params->>'estimateTotal')::boolean, true);
    
    -- Extract filter parameters
    filter_status := search_params->>'detentionStatus';
    filter_gender := search_params->>'gender';
    filter_date_from := (search_params->>'dateFrom')::date;
    filter_date_to := (search_params->>'dateTo')::date;
    filter_age_min := (search_params->>'ageMin')::int;
    filter_age_max := (search_params->>'ageMax')::int;
    filter_location := search_params->>'location';
    filter_facility := search_params->>'facility';
    
    -- Return empty result if query doesn't contain Arabic
    IF query_text IS NOT NULL AND NOT contains_arabic(query_text) THEN
        RETURN jsonb_build_object(
            'results', '[]'::jsonb,
            'totalCount', 0,
            'pageSize', page_size,
            'currentPage', page_number,
            'totalPages', 0,
            'hasNextPage', false,
            'hasPreviousPage', false
        );
    END IF;

    normalized_query := normalize_arabic_text(query_text);
    
    WITH base_results AS (
        SELECT 
            d.*,
            CASE 
                WHEN query_text IS NOT NULL THEN
                    GREATEST(
                        ts_rank(name_fts, to_tsquery('arabic', normalized_query)),
                        ts_rank(location_fts, to_tsquery('arabic', normalized_query)),
                        ts_rank(description_fts, to_tsquery('arabic', normalized_query))
                    )
                ELSE 1.0  -- Default rank when no query
            END as rank_score
        FROM detainees d
        WHERE 
            -- Text search condition (only if query_text is provided)
            (
                query_text IS NULL OR 
                name_fts @@ to_tsquery('arabic', normalized_query) OR
                location_fts @@ to_tsquery('arabic', normalized_query) OR
                description_fts @@ to_tsquery('arabic', normalized_query)
            )
            -- Filter conditions (applied independently of text search)
            AND (filter_status IS NULL OR status::text = filter_status)
            AND (filter_gender IS NULL OR gender::text = filter_gender)
            AND (filter_date_from IS NULL OR date_of_detention >= filter_date_from)
            AND (filter_date_to IS NULL OR date_of_detention <= filter_date_to)
            AND (filter_age_min IS NULL OR age_at_detention >= filter_age_min)
            AND (filter_age_max IS NULL OR age_at_detention <= filter_age_max)
            AND (filter_location IS NULL OR normalize_arabic_text(last_seen_location) LIKE '%' || normalize_arabic_text(filter_location) || '%')
            AND (filter_facility IS NULL OR normalize_arabic_text(detention_facility) LIKE '%' || normalize_arabic_text(filter_facility) || '%')
    ),
    ranked_results AS (
        SELECT *
        FROM base_results
        ORDER BY 
            CASE 
                WHEN query_text IS NOT NULL THEN rank_score
                ELSE 0.0  -- When no query, don't order by rank
            END DESC,
            date_of_detention DESC NULLS LAST
        LIMIT page_size
        OFFSET (page_number - 1) * page_size
    )
    SELECT 
        jsonb_build_object(
            'results', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', r.id,
                        'full_name', r.full_name,
                        'original_name', r.original_name,
                        'gender', r.gender,
                        'status', r.status,
                        'age_at_detention', r.age_at_detention,
                        'date_of_detention', r.date_of_detention,
                        'detention_facility', r.detention_facility,
                        'last_seen_location', r.last_seen_location,
                        'physical_description', r.physical_description,
                        'additional_notes', r.additional_notes,
                        'contact_info', r.contact_info,
                        'created_at', r.created_at,
                        'last_update_date', r.last_update_date,
                        'source_organization', r.source_organization,
                        'search_rank', r.rank_score
                    )
                )
                FROM ranked_results r
            ), '[]'::jsonb),
            'totalCount', COALESCE((
                SELECT COUNT(*)
                FROM base_results
            ), 0),
            'pageSize', page_size,
            'currentPage', page_number,
            'totalPages', CASE 
                WHEN total_count IS NULL THEN 1
                ELSE CEIL(total_count::float / page_size)
            END,
            'hasNextPage', EXISTS (
                SELECT 1 FROM ranked_results OFFSET page_size LIMIT 1
            ),
            'hasPreviousPage', page_number > 1
        ) INTO search_results;

    RETURN search_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.normalize_arabic_text TO anon;
GRANT EXECUTE ON FUNCTION public.contains_arabic TO anon;
GRANT EXECUTE ON FUNCTION public.normalize_name TO anon;
GRANT EXECUTE ON FUNCTION public.get_effective_date TO anon;
GRANT EXECUTE ON FUNCTION public.search_detainees_enhanced TO anon;
GRANT SELECT ON mv_detainees_search TO anon;
