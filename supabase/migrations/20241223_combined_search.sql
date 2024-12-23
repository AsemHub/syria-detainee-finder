-- Drop existing triggers if any
DROP TRIGGER IF EXISTS update_normalized_name ON detainees;
DROP TRIGGER IF EXISTS insert_normalized_name ON detainees;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.search_detainees_enhanced(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.search_detainees(text, int, text, float, timestamp, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.normalize_arabic_text(text) CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_detainees_search;

-- Drop existing columns
ALTER TABLE detainees
    DROP COLUMN IF EXISTS name_fts,
    DROP COLUMN IF EXISTS location_fts,
    DROP COLUMN IF EXISTS description_fts,
    DROP COLUMN IF EXISTS contact_fts,
    DROP COLUMN IF EXISTS gender_terms,
    DROP COLUMN IF EXISTS normalized_name;

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

    -- Normalize teh marbuta and heh
    normalized := regexp_replace(normalized, 'ة', 'ه', 'g');

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

-- Add normalized text columns
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
    ) STORED;

-- Drop the auto-refresh trigger and function
DROP TRIGGER IF EXISTS refresh_search_view_trigger ON detainees;
DROP FUNCTION IF EXISTS refresh_search_view CASCADE;

-- Drop and recreate materialized view
DROP MATERIALIZED VIEW IF EXISTS mv_detainees_search;
CREATE MATERIALIZED VIEW mv_detainees_search AS
SELECT
    d.id,
    d.full_name,
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
    d.source_document_id,
    d.organization,
    to_tsvector('arabic', COALESCE(normalize_arabic_text(d.full_name), '')) ||
    to_tsvector('arabic', COALESCE(normalize_arabic_text(d.last_seen_location), '')) ||
    to_tsvector('arabic', COALESCE(normalize_arabic_text(d.detention_facility), '')) ||
    to_tsvector('arabic', COALESCE(normalize_arabic_text(d.physical_description), '')) ||
    to_tsvector('arabic', COALESCE(normalize_arabic_text(d.additional_notes), '')) as search_vector,
    CASE 
        WHEN d.gender = 'female' THEN 'انثى أنثى امرأة نساء سيدة فتاة بنت نسائي مؤنث'
        WHEN d.gender = 'male' THEN 'ذكر رجل رجال شاب ولد مذكر'
        ELSE ''
    END as gender_terms
FROM detainees d;

-- Create indexes on the materialized view
CREATE INDEX IF NOT EXISTS idx_mv_detainees_search_vector ON mv_detainees_search USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_mv_detainees_full_name ON mv_detainees_search USING btree(full_name);

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE mv_detainees_search TO service_role;
GRANT ALL PRIVILEGES ON TABLE detainees TO service_role;
GRANT SELECT ON mv_detainees_search TO authenticated;
GRANT SELECT ON TABLE detainees TO authenticated;

-- Create a function to manually refresh the view
CREATE OR REPLACE FUNCTION refresh_mv_detainees_search()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_detainees_search;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the refresh function
GRANT EXECUTE ON FUNCTION refresh_mv_detainees_search() TO service_role;

-- Drop and recreate the normalize_detainee_fields function
DROP FUNCTION IF EXISTS normalize_detainee_fields() CASCADE;

CREATE OR REPLACE FUNCTION normalize_detainee_fields()
RETURNS trigger AS $$
BEGIN
    -- Only normalize text fields that exist and are not null
    IF NEW.full_name IS NOT NULL THEN
        NEW.full_name = normalize_arabic_text(NEW.full_name);
    END IF;
    
    IF NEW.last_seen_location IS NOT NULL THEN
        NEW.last_seen_location = normalize_arabic_text(NEW.last_seen_location);
    END IF;
    
    IF NEW.detention_facility IS NOT NULL THEN
        NEW.detention_facility = normalize_arabic_text(NEW.detention_facility);
    END IF;
    
    IF NEW.physical_description IS NOT NULL THEN
        NEW.physical_description = normalize_arabic_text(NEW.physical_description);
    END IF;
    
    IF NEW.additional_notes IS NOT NULL THEN
        NEW.additional_notes = normalize_arabic_text(NEW.additional_notes);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS normalize_detainee_fields_trigger ON detainees;
CREATE TRIGGER normalize_detainee_fields_trigger
    BEFORE INSERT OR UPDATE ON detainees
    FOR EACH ROW
    EXECUTE FUNCTION normalize_detainee_fields();

-- Drop and recreate the search vector update function
DROP FUNCTION IF EXISTS update_detainee_search_vector() CASCADE;

CREATE OR REPLACE FUNCTION update_detainee_search_vector()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector = 
        setweight(to_tsvector('arabic', COALESCE(normalize_arabic_text(NEW.full_name), '')), 'A') ||
        setweight(to_tsvector('arabic', COALESCE(normalize_arabic_text(NEW.last_seen_location), '')), 'B') ||
        setweight(to_tsvector('arabic', COALESCE(normalize_arabic_text(NEW.detention_facility), '')), 'B') ||
        setweight(to_tsvector('arabic', COALESCE(normalize_arabic_text(NEW.physical_description), '')), 'C') ||
        setweight(to_tsvector('arabic', COALESCE(normalize_arabic_text(NEW.additional_notes), '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trig_update_search_vector
    BEFORE INSERT OR UPDATE ON detainees
    FOR EACH ROW
    EXECUTE FUNCTION update_detainee_search_vector();

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
            ) as rank
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
            -- Middle name with ال prefix
            OR d.full_name ~* ('\mال' || normalized_query || '\M')
            -- Start of word match for compound names
            OR d.full_name ~* ('\m' || normalized_query)
            -- Detention facility match
            OR d.detention_facility ~* normalized_query
            -- Gender terms match
            OR normalize_arabic_text(d.gender_terms) ~* ('\m' || normalized_query || '\M')
            -- Full-text search fallback
            OR search_vector @@ to_tsquery('arabic', normalized_query)
    ),
    paginated_results AS (
        SELECT *
        FROM ranked_results
        ORDER BY 
            CASE WHEN sort_ascending THEN rank ELSE -rank END,
            CASE WHEN sort_ascending THEN id::text ELSE id::text END DESC
        LIMIT page_size
        OFFSET (page_number - 1) * page_size
    )
    SELECT 
        jsonb_build_object(
            'results', COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', pr.id,
                        'gender', pr.gender,
                        'status', pr.status,
                        'full_name', pr.full_name,
                        'created_at', pr.created_at,
                        'search_rank', pr.rank,
                        'contact_info', pr.contact_info,
                        'additional_notes', pr.additional_notes,
                        'age_at_detention', pr.age_at_detention,
                        'last_update_date', pr.last_update_date,
                        'date_of_detention', pr.date_of_detention,
                        'detention_facility', pr.detention_facility,
                        'last_seen_location', pr.last_seen_location,
                        'source_organization', pr.source_organization,
                        'physical_description', pr.physical_description
                    )
                    ORDER BY 
                        CASE WHEN sort_ascending THEN pr.rank ELSE -pr.rank END,
                        CASE WHEN sort_ascending THEN pr.id::text ELSE pr.id::text END DESC
                ), '[]'::jsonb
            ),
            'totalCount', COALESCE(total_count, 0),
            'currentPage', page_number,
            'totalPages', CASE 
                WHEN total_count IS NOT NULL 
                THEN CEIL(total_count::float / page_size)
                ELSE NULL 
            END,
            'hasNextPage', CASE 
                WHEN total_count IS NOT NULL 
                THEN total_count > (page_number * page_size)
                ELSE NULL 
            END,
            'hasPreviousPage', page_number > 1,
            'pageSize', page_size
        ) INTO search_results
    FROM paginated_results pr;

    RETURN search_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT SELECT ON mv_detainees_search TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_detainees_enhanced(jsonb) TO anon, authenticated;

-- Grant permissions to service role
GRANT ALL PRIVILEGES ON TABLE mv_detainees_search TO service_role;
GRANT ALL PRIVILEGES ON TABLE detainees TO service_role;
GRANT EXECUTE ON FUNCTION refresh_mv_detainees_search() TO service_role;
GRANT EXECUTE ON FUNCTION normalize_arabic_text(text) TO service_role;
GRANT EXECUTE ON FUNCTION update_detainee_search_vector() TO service_role;
GRANT EXECUTE ON FUNCTION normalize_detainee_fields() TO service_role;

-- Grant permissions to authenticated users
GRANT SELECT ON TABLE mv_detainees_search TO authenticated;
GRANT SELECT ON TABLE detainees TO authenticated;
GRANT EXECUTE ON FUNCTION search_detainees_enhanced(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_arabic_text(text) TO authenticated;

-- Test the search function
SELECT jsonb_pretty(
    search_detainees_enhanced(
        jsonb_build_object(
            'query', 'علي',
            'page_size', 10,
            'page_number', 1,
            'estimate_total', true,
            'sort_ascending', false
        )
    )
);
