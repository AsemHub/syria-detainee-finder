-- Create extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Set work_mem for better query performance
SET work_mem = '32MB';

-- Keep the normalize_arabic_text function as is since it works well
CREATE OR REPLACE FUNCTION public.normalize_arabic_text(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    normalized text;
BEGIN
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;

    normalized := regexp_replace(input_text, '\u0629', '\u0647', 'g');  -- Ta marbuta to Ha
    normalized := regexp_replace(normalized, '\u0649', '\u064A', 'g');  -- Alef maksura to Ya
    normalized := regexp_replace(normalized, '\u0622', '\u0627', 'g');  -- Alef madda to Alef
    normalized := regexp_replace(normalized, '\u0623', '\u0627', 'g');  -- Hamza above Alef to Alef
    normalized := regexp_replace(normalized, '\u0625', '\u0627', 'g');  -- Hamza below Alef to Alef
    normalized := regexp_replace(normalized, '\u0626', '\u064A', 'g');  -- Hamza above Ya to Ya
    normalized := regexp_replace(normalized, '\u0624', '\u0648', 'g');  -- Waw with Hamza to Waw
    normalized := regexp_replace(normalized, '\u0621', '', 'g');        -- Remove standalone Hamza
    normalized := regexp_replace(normalized, '[\u064B-\u065F\u0670\u0640]', '', 'g');
    normalized := regexp_replace(normalized, '\s+', ' ', 'g');
    
    RETURN trim(normalized);
END;
$$;

-- Drop existing materialized view and functions
DROP MATERIALIZED VIEW IF EXISTS detainees_search_mv CASCADE;
DROP FUNCTION IF EXISTS refresh_search_mv() CASCADE;
DROP FUNCTION IF EXISTS search_detainees_enhanced(text, int, uuid, float, date, boolean, boolean) CASCADE;
DROP FUNCTION IF EXISTS search_detainees_enhanced(text, int, uuid, float, date, boolean) CASCADE;
DROP FUNCTION IF EXISTS search_detainees_enhanced(jsonb) CASCADE;

-- Create materialized view with optimized search text
CREATE MATERIALIZED VIEW detainees_search_mv AS
SELECT 
    d.id,
    d.full_name,
    d.last_seen_location,
    d.status,
    d.gender,
    d.age_at_detention,
    d.date_of_detention,
    d.detention_facility,
    substring(COALESCE(d.additional_notes, '') for 500) as additional_notes,
    substring(COALESCE(d.physical_description, '') for 500) as physical_description,
    d.contact_info,
    d.last_update_date,
    normalize_arabic_text(d.full_name) as normalized_name,
    normalize_arabic_text(d.last_seen_location) as normalized_location,
    lower(
        COALESCE(d.full_name, '') || ' ' || 
        COALESCE(normalize_arabic_text(d.full_name), '') || ' ' ||
        COALESCE(d.last_seen_location, '') || ' ' || 
        COALESCE(normalize_arabic_text(d.last_seen_location), '') || ' ' ||
        COALESCE(d.detention_facility, '')
    ) as primary_search_text,
    lower(
        COALESCE(substring(d.additional_notes for 500), '') || ' ' ||
        COALESCE(substring(d.physical_description for 500), '')
    ) as secondary_search_text,
    setweight(to_tsvector('arabic', COALESCE(d.full_name, '')), 'A') ||
    setweight(to_tsvector('arabic', COALESCE(normalize_arabic_text(d.full_name), '')), 'A') ||
    setweight(to_tsvector('arabic', COALESCE(d.last_seen_location, '')), 'B') ||
    setweight(to_tsvector('arabic', COALESCE(normalize_arabic_text(d.last_seen_location), '')), 'B') ||
    setweight(to_tsvector('arabic', COALESCE(d.detention_facility, '')), 'C') ||
    setweight(to_tsvector('arabic', 
        COALESCE(substring(d.additional_notes for 500), '') || ' ' || 
        COALESCE(substring(d.physical_description for 500), '')
    ), 'D') as document_vector
FROM detainees d;

-- Create optimized indexes
CREATE UNIQUE INDEX idx_detainees_search_mv_id ON detainees_search_mv (id);
CREATE INDEX idx_detainees_search_mv_document_vector ON detainees_search_mv USING GIN (document_vector);
CREATE INDEX idx_detainees_search_mv_primary_search_trgm ON detainees_search_mv USING GIN (primary_search_text gin_trgm_ops);
CREATE INDEX idx_detainees_search_mv_date ON detainees_search_mv (date_of_detention DESC NULLS LAST);

-- Create new function with JSON parameter
CREATE OR REPLACE FUNCTION public.search_detainees_enhanced(
    params jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb AS $$
DECLARE
    results jsonb;
    total_count integer;
    normalized_query text;
    search_tsquery tsquery;
    search_term text;
    min_query_length constant int := 2;
    
    p_search_query text;
    p_page_size int;
    p_cursor_id uuid;
    p_cursor_rank float;
    p_cursor_date date;
    p_estimate_total boolean;
    p_include_secondary boolean;
BEGIN
    -- Extract parameters
    p_search_query := COALESCE(TRIM((params->>'search_query')::text), '');
    p_page_size := COALESCE((params->>'page_size')::int, 10);
    p_cursor_id := NULLIF(params->>'cursor_id', '')::uuid;
    p_cursor_rank := NULLIF(params->>'cursor_rank', '')::float;
    p_cursor_date := NULLIF(params->>'cursor_date', '')::date;
    p_estimate_total := COALESCE((params->>'estimate_total')::boolean, true);
    p_include_secondary := COALESCE((params->>'include_secondary')::boolean, true);

    -- Input validation
    IF p_search_query IS NULL OR length(trim(p_search_query)) < min_query_length THEN
        RETURN jsonb_build_object(
            'data', '[]'::jsonb,
            'metadata', jsonb_build_object(
                'totalCount', 0,
                'hasNextPage', false,
                'lastCursor', NULL
            )
        );
    END IF;

    -- Normalize query and create search terms
    normalized_query := normalize_arabic_text(trim(p_search_query));
    search_tsquery := websearch_to_tsquery('arabic', normalized_query);
    search_term := lower(normalized_query);

    -- Validate search terms
    IF search_tsquery IS NULL THEN
        RETURN jsonb_build_object(
            'data', '[]'::jsonb,
            'metadata', jsonb_build_object(
                'totalCount', 0,
                'hasNextPage', false,
                'lastCursor', NULL
            )
        );
    END IF;

    -- Get total count if needed (only on first page)
    IF p_estimate_total AND p_cursor_id IS NULL THEN
        WITH matching_records AS (
            SELECT 1
            FROM detainees_search_mv d
            WHERE 
                search_tsquery @@ d.document_vector
                OR d.primary_search_text LIKE '%' || search_term || '%'
                OR (p_include_secondary AND d.secondary_search_text LIKE '%' || search_term || '%')
        )
        SELECT COUNT(*) INTO total_count
        FROM matching_records;
    END IF;

    -- Main search query with ranking
    WITH ranked_results AS (
        SELECT 
            d.id,
            d.full_name,
            d.date_of_detention,
            d.last_seen_location,
            d.detention_facility,
            d.status,
            d.gender,
            d.age_at_detention,
            d.additional_notes,
            d.physical_description,
            d.contact_info,
            d.last_update_date,
            CASE
                WHEN d.normalized_name = normalized_query THEN 1.0
                WHEN search_tsquery @@ d.document_vector THEN 0.9
                WHEN d.primary_search_text LIKE '%' || search_term || '%' THEN 0.7
                WHEN p_include_secondary AND d.secondary_search_text LIKE '%' || search_term || '%' THEN 0.5
                ELSE 0.0
            END as computed_rank
        FROM detainees_search_mv d
        WHERE 
            d.normalized_name = normalized_query
            OR search_tsquery @@ d.document_vector
            OR d.primary_search_text LIKE '%' || search_term || '%'
            OR (p_include_secondary AND d.secondary_search_text LIKE '%' || search_term || '%')
    ),
    search_results AS (
        SELECT r.*
        FROM ranked_results r
        WHERE
            p_cursor_id IS NULL OR
            (r.computed_rank < p_cursor_rank) OR 
            (r.computed_rank = p_cursor_rank AND r.date_of_detention < p_cursor_date) OR
            (r.computed_rank = p_cursor_rank AND r.date_of_detention = p_cursor_date AND r.id > p_cursor_id)
        ORDER BY 
            r.computed_rank DESC,
            r.date_of_detention DESC NULLS LAST,
            r.id ASC
        LIMIT p_page_size + 1
    )
    SELECT 
        jsonb_build_object(
            'data', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', s.id,
                            'fullName', s.full_name,
                            'lastSeenLocation', s.last_seen_location,
                            'status', s.status,
                            'gender', s.gender,
                            'ageAtDetention', s.age_at_detention,
                            'dateOfDetention', s.date_of_detention,
                            'detentionFacility', s.detention_facility,
                            'additionalNotes', s.additional_notes,
                            'physicalDescription', s.physical_description,
                            'contactInfo', s.contact_info,
                            'lastUpdateDate', s.last_update_date
                        )
                    )
                    FROM (
                        SELECT s.* 
                        FROM search_results s 
                        LIMIT p_page_size
                    ) s
                ),
                '[]'::jsonb
            ),
            'metadata', jsonb_build_object(
                'totalCount', COALESCE(total_count, 0),
                'hasNextPage', EXISTS (
                    SELECT 1 FROM search_results OFFSET p_page_size
                ),
                'lastCursor', (
                    SELECT jsonb_build_object(
                        'id', id,
                        'rank', computed_rank,
                        'date', date_of_detention
                    )
                    FROM search_results
                    LIMIT 1 OFFSET p_page_size - 1
                )
            )
        ) INTO results;

    RETURN results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create a background worker for materialized view refresh
CREATE OR REPLACE FUNCTION refresh_search_mv()
RETURNS trigger AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_stat_user_tables 
        WHERE relname = 'detainees_search_mv' 
        AND now() - last_autovacuum < interval '15 minutes'
    ) THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY detainees_search_mv;
        ANALYZE detainees_search_mv;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for batched refresh
CREATE TRIGGER trig_refresh_search_mv
    AFTER INSERT OR UPDATE OR DELETE ON detainees
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_search_mv();

-- Initial refresh and analyze
REFRESH MATERIALIZED VIEW CONCURRENTLY detainees_search_mv;
ANALYZE detainees_search_mv;
ANALYZE detainees;
