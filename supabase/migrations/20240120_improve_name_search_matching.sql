-- Improve name search to better handle partial matches in compound names

-- Update the search function to combine full-text search with pattern matching
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

    -- Convert search text to tsquery
    tsquery_expression := search_text_to_tsquery(query_text);
    
    WITH base_results AS (
        SELECT 
            d.*,
            CASE 
                WHEN query_text IS NOT NULL THEN
                    -- Base full-text search ranking
                    ts_rank(
                        setweight(name_fts, 'A') ||
                        setweight(location_fts, 'B') ||
                        setweight(description_fts, 'C'),
                        tsquery_expression
                    ) + 
                    -- Position-based ranking for names
                    CASE 
                        -- First name match (highest priority)
                        WHEN normalized_name ~ ('^' || normalize_arabic_text(query_text) || '\s') THEN 3.0
                        -- Middle name match (medium priority)
                        WHEN normalized_name ~ ('\s' || normalize_arabic_text(query_text) || '\s') THEN 2.0
                        -- Last name match (lower priority)
                        WHEN normalized_name ~ ('\s' || normalize_arabic_text(query_text) || '$') THEN 1.0
                        -- Any other match
                        WHEN normalized_name ILIKE '%' || normalize_arabic_text(query_text) || '%' THEN 0.5
                        ELSE 0.0
                    END
                ELSE 1.0
            END as rank
        FROM mv_detainees_search d
        WHERE 
            -- Combine full-text search with pattern matching
            (
                query_text IS NULL OR 
                (
                    (search_vector @@ tsquery_expression OR 
                     normalized_name ILIKE '%' || normalize_arabic_text(query_text) || '%')
                )
            )
            -- Apply filters
            AND (filter_status IS NULL OR status = filter_status)
            AND (filter_gender IS NULL OR gender = filter_gender)
            AND (filter_date_from IS NULL OR date_of_detention >= filter_date_from)
            AND (filter_date_to IS NULL OR date_of_detention <= filter_date_to)
            AND (filter_age_min IS NULL OR age_at_detention >= filter_age_min)
            AND (filter_age_max IS NULL OR age_at_detention <= filter_age_max)
            AND (filter_location IS NULL OR last_seen_location ILIKE '%' || filter_location || '%')
            AND (filter_facility IS NULL OR detention_facility ILIKE '%' || filter_facility || '%')
    ),
    counted_results AS (
        SELECT COUNT(*) as total
        FROM base_results
    ),
    paginated_results AS (
        SELECT *
        FROM base_results
        ORDER BY rank DESC, created_at DESC
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
                        'last_seen_location', r.last_seen_location,
                        'status', r.status,
                        'gender', r.gender,
                        'age_at_detention', r.age_at_detention,
                        'date_of_detention', r.date_of_detention,
                        'detention_facility', r.detention_facility,
                        'additional_notes', r.additional_notes,
                        'physical_description', r.physical_description,
                        'contact_info', r.contact_info,
                        'created_at', r.created_at,
                        'last_update_date', r.last_update_date,
                        'source_organization', r.source_organization,
                        'update_history', r.update_history,
                        'last_update_by', r.last_update_by,
                        'last_update_reason', r.last_update_reason
                    )
                )
                FROM paginated_results r
            ), '[]'::jsonb),
            'totalCount', (SELECT total FROM counted_results),
            'pageSize', page_size,
            'currentPage', page_number,
            'totalPages', CEIL((SELECT total FROM counted_results)::float / page_size),
            'hasNextPage', (SELECT total FROM counted_results) > (page_number * page_size),
            'hasPreviousPage', page_number > 1
        )
    INTO search_results;

    RETURN search_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.search_detainees_enhanced TO anon;
