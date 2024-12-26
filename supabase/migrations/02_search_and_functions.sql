-- Syria Detainee Finder Search Functions and Extensions

-- Create the Arabic text normalization function
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

    -- Remove tashkeel (diacritics)
    normalized := regexp_replace(normalized, '[ًٌٍَُِّْٰٕٖٓٔ]', '', 'g');

    -- Normalize hamza forms
    normalized := regexp_replace(normalized, '[أإآ]', 'ا', 'g');
    normalized := regexp_replace(normalized, 'ئ|ؤ', 'ء', 'g');

    -- Normalize alef forms
    normalized := regexp_replace(normalized, 'ٱ|إ|آ|ٲ|ٳ|ٵ', 'ا', 'g');

    -- Normalize teh marbuta and heh at word end
    normalized := regexp_replace(normalized, 'ه\M', 'ة', 'g');  -- Convert final ه to ة

    -- Normalize alef maksura and yeh
    normalized := regexp_replace(normalized, '[ىیي]', 'ي', 'g');

    -- Normalize waw variations
    normalized := regexp_replace(normalized, 'ۥ|ۆ', 'و', 'g');

    -- Normalize kaf
    normalized := regexp_replace(normalized, 'ك', 'ک', 'g');

    -- Remove non-Arabic characters except numbers, spaces, and common punctuation
    normalized := regexp_replace(normalized, '[^\s\u0600-\u06FF0-9.,!?-]', '', 'g');

    -- Normalize whitespace
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

-- Create the enhanced search function
CREATE OR REPLACE FUNCTION public.search_detainees_enhanced(search_params JSONB)
RETURNS JSONB AS $$
DECLARE
    query_text TEXT;
    normalized_query TEXT;
    page_size INT;
    page_number INT;
    sort_ascending BOOLEAN;
    estimate_total BOOLEAN;
    total_count INT;
    search_results JSONB;
BEGIN
    -- Extract parameters with defaults
    query_text := search_params->>'query';
    
    -- Return empty result if query doesn't contain Arabic
    IF NOT contains_arabic(query_text) THEN
        RETURN jsonb_build_object(
            'results', '[]'::jsonb,
            'totalCount', 0,
            'pageSize', COALESCE((search_params->>'page_size')::INT, 20),
            'currentPage', COALESCE((search_params->>'page_number')::INT, 1),
            'totalPages', 0,
            'hasNextPage', false,
            'hasPreviousPage', false
        );
    END IF;

    page_size := COALESCE((search_params->>'page_size')::INT, 20);
    page_number := COALESCE((search_params->>'page_number')::INT, 1);
    sort_ascending := COALESCE((search_params->>'sort_ascending')::BOOLEAN, false);
    estimate_total := COALESCE((search_params->>'estimate_total')::BOOLEAN, true);
    
    -- Normalize the query text and handle compound terms
    normalized_query := normalize_arabic_text(query_text);
    
    -- Handle spaces in compound terms
    IF normalized_query ~ '\s' THEN
        normalized_query := regexp_replace(normalized_query, '\s+', ' & ', 'g');
    END IF;

    -- Calculate total count if needed
    IF estimate_total THEN
        SELECT COUNT(*) INTO total_count
        FROM mv_detainees_search d
        WHERE 
            -- Exact word boundaries match
            d.full_name ~* ('\m' || normalized_query || '\M')
            -- Surname pattern
            OR d.full_name ~* ('\mال' || normalized_query || '\M$')
            -- First name match
            OR d.full_name ~* ('^' || normalized_query || '\M')
            -- Middle name with ال prefix
            OR d.full_name ~* ('\mال' || normalized_query || '\M')
            -- Start of word match for compound names
            OR d.full_name ~* ('\m' || normalized_query)
            -- Detention facility match
            OR d.detention_facility ~* normalized_query
            -- Gender terms match
            OR normalize_arabic_text(d.gender_terms) ~* ('\m' || normalized_query || '\M')
            -- Full-text search fallback
            OR search_vector @@ to_tsquery('arabic', normalized_query);
    END IF;

    -- Main search query with enhanced ranking
    WITH match_weights AS (
        SELECT
            3.0 as gender_match_weight,    -- Highest priority for gender term matches
            2.5 as exact_word_weight,      -- For exact standalone word matches
            2.0 as surname_weight,         -- For surname matches ending with "العلي"
            1.8 as facility_weight,        -- For detention facility matches
            1.5 as middle_name_weight,     -- For matches with "ال" prefix in middle of names
            1.2 as partial_start_weight,   -- For matches at start of compound names
            0.8 as partial_match_weight,   -- For other partial matches
            0.5 as weak_match_weight       -- For weak matches
    ),
    ranked_results AS (
        SELECT 
            d.*,
            GREATEST(
                ts_rank(search_vector, to_tsquery('arabic', normalized_query)),
                CASE 
                    -- Exact full name match
                    WHEN d.full_name ~* ('^' || normalized_query || '$') THEN 1.0
                    -- Surname match
                    WHEN d.full_name ~* ('\m' || normalized_query || '$') THEN 0.8
                    -- First name match
                    WHEN d.full_name ~* ('^' || normalized_query || '\M') THEN 0.7
                    -- Middle name match
                    WHEN d.full_name ~* ('\m' || normalized_query || '\M') THEN 0.6
                    -- Partial name match
                    WHEN d.full_name ~* normalized_query THEN 0.5
                    -- Location match
                    WHEN d.last_seen_location ~* normalized_query THEN 0.4
                    -- Facility match
                    WHEN d.detention_facility ~* normalized_query THEN 0.4
                    -- Gender terms match
                    WHEN normalize_arabic_text(d.gender_terms) ~* ('\m' || normalized_query || '\M') THEN 0.3
                    ELSE 0.0
                END
            ) as search_rank
        FROM mv_detainees_search d
        WHERE
            -- Exact full name match
            d.full_name ~* ('^' || normalized_query || '$')
            -- Surname match (word at end)
            OR d.full_name ~* ('\m' || normalized_query || '$')
            -- First name match (word at start)
            OR d.full_name ~* ('^' || normalized_query || '\M')
            -- Middle name match
            OR d.full_name ~* ('\m' || normalized_query || '\M')
            -- Name with ال prefix at end
            OR d.full_name ~* ('\mال' || normalized_query || '\M$')
            -- Name with ال prefix in middle
            OR d.full_name ~* ('\mال' || normalized_query || '\M')
            -- Start of word match for compound names
            OR d.full_name ~* ('\m' || normalized_query)
            -- Detention facility match
            OR d.detention_facility ~* normalized_query
            -- Gender terms match
            OR normalize_arabic_text(d.gender_terms) ~* ('\m' || normalized_query || '\M')
            -- Full-text search fallback
            OR search_vector @@ to_tsquery('arabic', normalized_query)
        ORDER BY 
            search_rank DESC,
            CASE WHEN sort_ascending THEN d.effective_date END ASC,
            CASE WHEN NOT sort_ascending THEN d.effective_date END DESC
        LIMIT page_size
        OFFSET (page_number - 1) * page_size
    )
    SELECT 
        jsonb_build_object(
            'results', COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', r.id,
                    'full_name', r.full_name,
                    'original_name', r.original_name,
                    'date_of_detention', r.date_of_detention,
                    'last_seen_location', r.last_seen_location,
                    'detention_facility', r.detention_facility,
                    'physical_description', r.physical_description,
                    'age_at_detention', r.age_at_detention,
                    'gender', r.gender,
                    'status', r.status,
                    'contact_info', r.contact_info,
                    'additional_notes', r.additional_notes,
                    'created_at', r.created_at,
                    'last_update_date', r.last_update_date,
                    'source_organization', r.source_organization,
                    'search_rank', r.search_rank
                )
            ), '[]'::jsonb),
            'totalCount', COALESCE(total_count, 0),
            'pageSize', page_size,
            'currentPage', page_number,
            'totalPages', CASE 
                WHEN total_count IS NULL THEN 0
                ELSE CEIL(total_count::float / page_size)
            END,
            'hasNextPage', CASE 
                WHEN total_count IS NULL THEN false
                ELSE (page_number * page_size) < total_count
            END,
            'hasPreviousPage', page_number > 1
        ) INTO search_results
    FROM ranked_results r;

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
