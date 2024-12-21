-- Migration to optimize search performance further
-- Set work_mem for better query performance
ALTER DATABASE CURRENT SET work_mem = '64MB';

-- Create additional specialized indexes for search optimization
CREATE INDEX IF NOT EXISTS idx_detainees_search_mv_normalized_name_trgm 
ON detainees_search_mv USING GIN (normalized_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_detainees_search_mv_normalized_location_trgm 
ON detainees_search_mv USING GIN (normalized_location gin_trgm_ops);

-- Create index for secondary search text to improve performance of full-text search
CREATE INDEX IF NOT EXISTS idx_detainees_search_mv_secondary_search_trgm 
ON detainees_search_mv USING GIN (secondary_search_text gin_trgm_ops);

-- Drop existing function to replace with optimized version
DROP FUNCTION IF EXISTS search_detainees_enhanced(jsonb);

-- Create optimized search function with improved ranking and performance
CREATE OR REPLACE FUNCTION public.search_detainees_enhanced(
    params jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb AS $$
DECLARE
    p_search_query text;
    p_page_size int;
    p_cursor_id uuid;
    p_cursor_rank float;
    p_cursor_date date;
    p_estimate_total boolean;
    p_include_secondary boolean;
    mv_count int;
    total_count int;
    normalized_query text;
    search_tsquery tsquery;
    results jsonb;
    sample_matches jsonb;
    debug_info jsonb;
BEGIN
    -- Extract parameters with improved validation
    p_search_query := COALESCE(params->>'search_query', '');
    p_page_size := COALESCE((params->>'page_size')::int, 20);
    p_cursor_id := (params->>'cursor_id')::uuid;
    p_cursor_rank := (params->>'cursor_rank')::float;
    p_cursor_date := (params->>'cursor_date')::date;
    p_estimate_total := COALESCE((params->>'estimate_total')::boolean, true);
    p_include_secondary := COALESCE((params->>'include_secondary')::boolean, true);

    -- Validate parameters
    IF p_search_query = '' THEN
        RAISE EXCEPTION 'Search query cannot be empty';
    END IF;
    IF p_page_size < 1 OR p_page_size > 100 THEN
        p_page_size := 20; -- Reset to default if invalid
    END IF;

    -- Get count of records in materialized view for statistics
    SELECT COUNT(*) INTO mv_count FROM detainees_search_mv;
    
    -- Normalize the search query
    normalized_query := normalize_arabic_text(p_search_query);
    
    -- Create ts_query with improved handling of Arabic text
    search_tsquery := to_tsquery('arabic', 
        string_agg(lexeme, ' & ') 
        FROM unnest(regexp_split_to_array(normalized_query, '\s+')) lexeme
    );

    -- Calculate total count if needed (using more efficient estimation)
    IF p_estimate_total AND p_cursor_id IS NULL THEN
        SELECT count_estimate('SELECT 1 FROM detainees_search_mv d WHERE ' || 
            CASE 
                WHEN p_include_secondary THEN
                    'document_vector @@ $1 OR ' ||
                    'similarity(normalized_name, $2) > 0.3 OR ' ||
                    'similarity(normalized_location, $2) > 0.3 OR ' ||
                    'primary_search_text ILIKE $3 OR ' ||
                    'secondary_search_text ILIKE $3'
                ELSE
                    'document_vector @@ $1 OR ' ||
                    'similarity(normalized_name, $2) > 0.3 OR ' ||
                    'similarity(normalized_location, $2) > 0.3 OR ' ||
                    'primary_search_text ILIKE $3'
            END,
            ARRAY[search_tsquery, normalized_query, '%' || p_search_query || '%']
        ) INTO total_count;
    END IF;

    -- Get sample matches for debugging
    SELECT jsonb_build_object(
        'exact_name_matches', (
            SELECT jsonb_agg(jsonb_build_object('id', id, 'name', full_name))
            FROM (
                SELECT id, full_name 
                FROM detainees_search_mv 
                WHERE normalized_name = normalized_query 
                LIMIT 3
            ) t
        ),
        'similar_name_matches', (
            SELECT jsonb_agg(jsonb_build_object('id', id, 'name', full_name, 'similarity', sim))
            FROM (
                SELECT id, full_name, similarity(normalized_name, normalized_query) as sim
                FROM detainees_search_mv 
                WHERE similarity(normalized_name, normalized_query) > 0.3
                ORDER BY sim DESC
                LIMIT 3
            ) t
        ),
        'location_matches', (
            SELECT jsonb_agg(jsonb_build_object('id', id, 'location', last_seen_location))
            FROM (
                SELECT id, last_seen_location
                FROM detainees_search_mv 
                WHERE normalized_location = normalized_query
                LIMIT 3
            ) t
        )
    ) INTO sample_matches;

    -- Build debug info
    debug_info := jsonb_build_object(
        'normalized_query', normalized_query,
        'search_tsquery', search_tsquery::text,
        'mv_record_count', mv_count,
        'sample_matches', sample_matches,
        'search_params', params
    );

    -- Main search query with improved ranking
    WITH ranked_results AS (
        SELECT 
            d.*,
            GREATEST(
                -- Exact matches get highest priority
                CASE WHEN normalized_name = normalized_query THEN 1.0
                     WHEN normalized_location = normalized_query THEN 0.9
                     ELSE 0.0 
                END,
                -- Similarity matches
                similarity(normalized_name, normalized_query) * 0.8,
                similarity(normalized_location, normalized_query) * 0.7,
                -- Text search matches
                ts_rank_cd(document_vector, search_tsquery) * 0.6,
                -- Trigram similarity for partial matches
                CASE 
                    WHEN primary_search_text ILIKE '%' || p_search_query || '%' THEN 0.5
                    WHEN p_include_secondary AND secondary_search_text ILIKE '%' || p_search_query || '%' THEN 0.4
                    ELSE 0.0
                END
            ) as search_rank
        FROM detainees_search_mv d
        WHERE 
            -- Cursor-based pagination
            (CASE WHEN p_cursor_id IS NOT NULL THEN
                (search_rank, date_of_detention, id) < (p_cursor_rank, p_cursor_date, p_cursor_id)
            ELSE true END)
            AND
            -- Improved search conditions
            (
                normalized_name = normalized_query OR
                normalized_location = normalized_query OR
                similarity(normalized_name, normalized_query) > 0.3 OR
                similarity(normalized_location, normalized_query) > 0.3 OR
                document_vector @@ search_tsquery OR
                primary_search_text ILIKE '%' || p_search_query || '%' OR
                (p_include_secondary AND secondary_search_text ILIKE '%' || p_search_query || '%')
            )
    )
    SELECT jsonb_build_object(
        'data', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'full_name', full_name,
                    'last_seen_location', last_seen_location,
                    'status', status,
                    'gender', gender,
                    'age_at_detention', age_at_detention,
                    'date_of_detention', date_of_detention,
                    'detention_facility', detention_facility,
                    'additional_notes', additional_notes,
                    'physical_description', physical_description,
                    'contact_info', contact_info,
                    'last_update_date', last_update_date,
                    'search_rank', search_rank
                )
            )
            FROM (
                SELECT *
                FROM ranked_results
                ORDER BY search_rank DESC, date_of_detention DESC NULLS LAST, id
                LIMIT p_page_size
            ) t
        ),
        'metadata', jsonb_build_object(
            'totalCount', total_count,
            'hasNextPage', (SELECT COUNT(*) > p_page_size FROM ranked_results),
            'lastCursor', (
                SELECT jsonb_build_object(
                    'id', id,
                    'rank', search_rank,
                    'date', date_of_detention
                )
                FROM ranked_results
                ORDER BY search_rank DESC, date_of_detention DESC NULLS LAST, id
                LIMIT 1 OFFSET p_page_size - 1
            ),
            'debug', debug_info
        )
    ) INTO results;

    RETURN results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to estimate result count efficiently
CREATE OR REPLACE FUNCTION count_estimate(query text, params text[] DEFAULT '{}') 
RETURNS integer AS $$
DECLARE
    rec record;
    rows integer;
BEGIN
    FOR rec IN EXECUTE 'EXPLAIN ' || query USING params[1], params[2], params[3]
    LOOP
        rows := substring(rec."QUERY PLAN" FROM ' rows=([[:digit:]]+)');
        EXIT WHEN rows IS NOT NULL;
    END LOOP;
 
    RETURN rows;
END;
$$ LANGUAGE plpgsql STABLE;
