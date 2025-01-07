-- Improve name search to better handle spaces while preserving existing functionality

-- Add forcibly disappeared status to the enum
DO $$ BEGIN
    ALTER TYPE status_enum ADD VALUE IF NOT EXISTS 'forcibly_disappeared';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Make full_name and contact_info required
ALTER TABLE detainees 
    ALTER COLUMN full_name SET NOT NULL,
    ALTER COLUMN contact_info SET NOT NULL;

-- Update status mapping
CREATE OR REPLACE FUNCTION public.map_status_display(status text)
RETURNS text AS $$
BEGIN
    RETURN CASE status
        WHEN 'in_custody' THEN 'معتقل'
        WHEN 'missing' THEN 'مفقود'
        WHEN 'released' THEN 'مطلق سراح'
        WHEN 'deceased' THEN 'متوفى'
        WHEN 'forcibly_disappeared' THEN 'مغيب قسراً'
        WHEN 'unknown' THEN 'غير معروف'
        ELSE 'غير معروف'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add normalized text columns and effective date if they don't exist
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

-- Ensure indexes exist
DROP INDEX IF EXISTS unique_detainee_record_normalized;
CREATE UNIQUE INDEX unique_detainee_record_normalized 
ON detainees (normalized_name, effective_date) 
WHERE normalized_name IS NOT NULL;

-- Refresh materialized view with all necessary columns
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
    d.normalized_name,
    d.effective_date,
    d.gender_terms,
    d.name_fts,
    d.location_fts,
    d.description_fts,
    d.contact_fts,
    d.search_vector
FROM detainees d;

-- Create indexes on the materialized view
CREATE UNIQUE INDEX idx_mv_search_id ON mv_detainees_search (id);
CREATE INDEX idx_mv_search_normalized_name ON mv_detainees_search (normalized_name);
CREATE INDEX idx_mv_search_vector ON mv_detainees_search USING gin(search_vector);
CREATE INDEX idx_mv_search_effective_date ON mv_detainees_search (effective_date);

-- Create a function to convert search text to tsquery with better space handling
CREATE OR REPLACE FUNCTION public.search_text_to_tsquery(search_text text)
RETURNS tsquery AS $$
DECLARE
    normalized_text text;
    tsquery_result tsquery;
BEGIN
    -- Normalize the input text
    normalized_text := normalize_arabic_text(search_text);
    
    -- Return empty tsquery if input is empty
    IF normalized_text IS NULL OR normalized_text = '' THEN
        RETURN to_tsquery('arabic', '');
    END IF;

    -- Split the text into words and process each word
    WITH words AS (
        SELECT word, length(trim(word)) as word_length
        FROM unnest(string_to_array(normalized_text, ' ')) AS word
        WHERE length(trim(word)) > 0
    ),
    processed_words AS (
        SELECT
            CASE 
                WHEN word_length <= 3 THEN word -- For short words (3 chars or less), use exact match
                ELSE word || ':*'  -- For longer words, use prefix match
            END AS processed_word
        FROM words
    )
    SELECT string_agg(processed_word, ' & ')
    INTO normalized_text
    FROM processed_words;

    -- Convert to tsquery, with fallback for empty string
    IF normalized_text IS NULL OR normalized_text = '' THEN
        RETURN to_tsquery('arabic', '');
    END IF;

    RETURN to_tsquery('arabic', normalized_text);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the search function to use the new text processing while preserving existing features
CREATE OR REPLACE FUNCTION public.search_detainees_enhanced(search_params JSONB)
RETURNS JSONB AS $$
DECLARE
    query_text text;
    tsquery_expression tsquery;
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

    -- Convert search text to tsquery with improved space handling
    tsquery_expression := search_text_to_tsquery(query_text);
    
    WITH base_results AS (
        SELECT 
            d.*,
            CASE 
                WHEN query_text IS NOT NULL THEN
                    -- Use weighted ranking for different fields
                    ts_rank(
                        setweight(name_fts, 'A') ||
                        setweight(location_fts, 'B') ||
                        setweight(description_fts, 'C'),
                        tsquery_expression
                    ) * 
                    -- Boost exact matches
                    CASE 
                        WHEN full_name ILIKE '%' || query_text || '%' THEN 2.0
                        ELSE 1.0
                    END
                ELSE 1.0
            END as search_rank
        FROM mv_detainees_search d
        WHERE (query_text IS NULL OR search_vector @@ tsquery_expression)
            -- Status filter with special handling for معتقل and مغيب قسراً
            AND (
                filter_status IS NULL OR 
                CASE 
                    WHEN filter_status IN ('معتقل', 'مغيب قسراً') THEN 
                        status IN ('معتقل', 'مغيب قسراً')
                    ELSE 
                        status = filter_status
                END
            )
            -- Other filters
            AND (filter_gender IS NULL OR gender = filter_gender)
            AND (filter_age_min IS NULL OR age_at_detention >= filter_age_min)
            AND (filter_age_max IS NULL OR age_at_detention <= filter_age_max)
            AND (filter_location IS NULL OR last_seen_location ILIKE '%' || filter_location || '%')
            AND (filter_facility IS NULL OR detention_facility ILIKE '%' || filter_facility || '%')
            AND (filter_date_from IS NULL OR date_of_detention >= filter_date_from)
            AND (filter_date_to IS NULL OR date_of_detention <= filter_date_to)
    ),
    ranked_results AS (
        SELECT *
        FROM base_results
        ORDER BY 
            CASE 
                WHEN query_text IS NOT NULL THEN search_rank
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
                        'search_rank', r.search_rank
                    )
                )
                FROM ranked_results r
            ), '[]'::jsonb),
            'totalCount', (
                SELECT COUNT(*)
                FROM base_results
            ),
            'pageSize', page_size,
            'currentPage', page_number,
            'totalPages', CEIL((SELECT COUNT(*) FROM base_results)::float / page_size),
            'hasNextPage', EXISTS (
                SELECT 1 FROM base_results
                OFFSET (page_number * page_size)
                LIMIT 1
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
GRANT EXECUTE ON FUNCTION public.search_text_to_tsquery TO anon;
GRANT EXECUTE ON FUNCTION public.search_detainees_enhanced TO anon;
GRANT EXECUTE ON FUNCTION public.map_status_display TO anon;
GRANT SELECT ON mv_detainees_search TO anon;

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION public.refresh_mv_detainees_search()
RETURNS void AS $$
BEGIN
    -- Try concurrent refresh first
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_detainees_search;
    EXCEPTION WHEN OTHERS THEN
        -- If concurrent refresh fails, do a regular refresh
        REFRESH MATERIALIZED VIEW mv_detainees_search;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_mv_detainees_search TO anon;
