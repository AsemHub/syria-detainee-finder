SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname IN ('search_detainees', 'search_detainees_by_prefix');

output:
| function_name    | function_definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| search_detainees | CREATE OR REPLACE FUNCTION public.search_detainees(search_query text)
 RETURNS TABLE(id uuid, full_name text, date_of_detention date, last_seen_location text, detention_facility text, physical_description text, age_at_detention integer, gender text, status text, last_update_date timestamp with time zone, contact_info text, additional_notes text, created_at timestamp with time zone, search_rank real)
 LANGUAGE plpgsql
AS $function$
DECLARE
    normalized_query text;
BEGIN
    -- Normalize the search query to handle special characters
    normalized_query := regexp_replace(search_query, '[^a-zA-Z0-9\s|&!()]', '', 'g');
    
    -- Convert the query to tsquery safely
    RETURN QUERY
    SELECT
        d.*,
        ts_rank(d.search_vector, to_tsquery('english', normalized_query)) as search_rank
    FROM detainees d
    WHERE d.search_vector @@ to_tsquery('english', normalized_query)
    ORDER BY search_rank DESC;
EXCEPTION
    WHEN OTHERS THEN
        -- If the query is invalid, return empty result
        RETURN;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| search_detainees | CREATE OR REPLACE FUNCTION public.search_detainees(search_text text, max_results integer DEFAULT 10)
 RETURNS TABLE(id uuid, full_name text, last_seen_location text, status text, gender text, age_at_detention integer, date_of_detention date, notes text, detention_facility text, physical_description text, search_rank real)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    normalized_query text;
    search_tokens text[];
    tsquery_str text;
BEGIN
    IF search_text IS NULL OR length(trim(search_text)) = 0 THEN
        RAISE EXCEPTION 'Search failed: search text cannot be empty'
            USING HINT = 'Please provide a search term';
    END IF;

    normalized_query := lower(trim(search_text));
    
    -- Split the search text into tokens
    search_tokens := regexp_split_to_array(normalized_query, '\s+');
    
    -- Create a tsquery string with | between each token for better recall
    tsquery_str := array_to_string(
        array_agg('(' || quote_literal(token) || ':* | ' || quote_literal(token) || ')'),
        ' & '
    ) FROM unnest(search_tokens) AS token;

    RETURN QUERY
    WITH search_results AS (
        SELECT 
            d.id as result_id,
            d.full_name as result_full_name,
            d.last_seen_location as result_location,
            d.status::text as result_status,
            d.gender::text as result_gender,
            d.age_at_detention as result_age,
            d.date_of_detention as result_date,
            d.additional_notes as result_notes,
            d.detention_facility as result_facility,
            d.physical_description as result_description,
            GREATEST(
                ts_rank(
                    setweight(to_tsvector('simple', COALESCE(d.full_name, '')), 'A') ||
                    setweight(to_tsvector('simple', COALESCE(d.last_seen_location, '')), 'B') ||
                    setweight(to_tsvector('simple', COALESCE(d.detention_facility, '')), 'C'),
                    to_tsquery('simple', tsquery_str)
                ),
                CASE 
                    WHEN d.full_name ILIKE '%' || normalized_query || '%' THEN 1.0
                    WHEN d.last_seen_location ILIKE '%' || normalized_query || '%' THEN 0.8
                    WHEN d.detention_facility ILIKE '%' || normalized_query || '%' THEN 0.6
                    ELSE 0.0
                END
            ) as result_rank
        FROM 
            public.detainees d
        WHERE 
            (
                to_tsvector('simple', COALESCE(d.full_name, '')) @@ to_tsquery('simple', tsquery_str) OR
                to_tsvector('simple', COALESCE(d.last_seen_location, '')) @@ to_tsquery('simple', tsquery_str) OR
                to_tsvector('simple', COALESCE(d.detention_facility, '')) @@ to_tsquery('simple', tsquery_str)
            ) OR
            d.full_name ILIKE '%' || normalized_query || '%' OR
            d.last_seen_location ILIKE '%' || normalized_query || '%' OR
            d.detention_facility ILIKE '%' || normalized_query || '%'
    )
    SELECT 
        result_id as id,
        result_full_name as full_name,
        result_location as last_seen_location,
        result_status as status,
        result_gender as gender,
        result_age as age_at_detention,
        result_date as date_of_detention,
        result_notes as notes,
        result_facility as detention_facility,
        result_description as physical_description,
        result_rank as search_rank
    FROM search_results
    WHERE result_rank > 0
    ORDER BY result_rank DESC
    LIMIT max_results;
END;
$function$
                                                                                                                                                                                 |
| search_detainees | CREATE OR REPLACE FUNCTION public.search_detainees(search_query text DEFAULT NULL::text, status_filter text DEFAULT NULL::text, gender_filter text DEFAULT NULL::text, age_min integer DEFAULT NULL::integer, age_max integer DEFAULT NULL::integer, location_filter text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, full_name text, date_of_detention timestamp with time zone, last_seen_location text, detention_facility text, physical_description text, age_at_detention integer, gender text, status text, last_update_date timestamp with time zone, contact_info text, additional_notes text, created_at timestamp with time zone, search_rank real)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    processed_query text;
    search_tsquery tsquery;
BEGIN
    -- Input validation and preprocessing
    IF search_query IS NOT NULL THEN
        -- Remove special characters and excessive spaces
        processed_query := regexp_replace(search_query, '[^a-zA-Z0-9\s]', ' ', 'g');
        processed_query := regexp_replace(processed_query, '\s+', ' ', 'g');
        processed_query := trim(processed_query);
        
        -- Convert to tsquery format
        IF processed_query <> '' THEN
            processed_query := regexp_replace(processed_query, '\s+', ':* & ', 'g') || ':*';
            -- Safely create tsquery
            BEGIN
                search_tsquery := to_tsquery('english', processed_query);
            EXCEPTION WHEN OTHERS THEN
                -- Fallback to simpler query if conversion fails
                search_tsquery := to_tsquery('english', 'dummy_query');
                RETURN;
            END;
        END IF;
    END IF;

    RETURN QUERY
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
        d.last_update_date,
        d.contact_info,
        d.additional_notes,
        d.created_at,
        CASE 
            WHEN search_query IS NOT NULL AND processed_query <> '' THEN 
                ts_rank(to_tsvector('english', 
                    coalesce(d.full_name, '') || ' ' || 
                    coalesce(d.last_seen_location, '') || ' ' || 
                    coalesce(d.detention_facility, '') || ' ' ||
                    coalesce(d.physical_description, '') || ' ' ||
                    coalesce(d.contact_info, '') || ' ' ||
                    coalesce(d.additional_notes, '')
                ), search_tsquery)
            ELSE 0
        END as search_rank
    FROM 
        public.detainees d
    WHERE 
        (search_query IS NULL OR processed_query = '' OR
            to_tsvector('english', 
                coalesce(d.full_name, '') || ' ' || 
                coalesce(d.last_seen_location, '') || ' ' || 
                coalesce(d.detention_facility, '') || ' ' ||
                coalesce(d.physical_description, '') || ' ' ||
                coalesce(d.contact_info, '') || ' ' ||
                coalesce(d.additional_notes, '')
            ) @@ search_tsquery
        ) AND
        (status_filter IS NULL OR d.status = status_filter) AND
        (gender_filter IS NULL OR d.gender = gender_filter) AND
        (age_min IS NULL OR d.age_at_detention >= age_min) AND
        (age_max IS NULL OR d.age_at_detention <= age_max) AND
        (location_filter IS NULL OR d.last_seen_location ILIKE '%' || location_filter || '%')
    ORDER BY 
        search_rank DESC,
        d.last_update_date DESC
    LIMIT 1000;

EXCEPTION WHEN OTHERS THEN
    -- Log error details
    RAISE WARNING 'Error in search_detainees: %', SQLERRM;
    -- Return empty result set instead of error
    RETURN;
END;
$function$
 |
| search_detainees | CREATE OR REPLACE FUNCTION public.search_detainees(search_text text DEFAULT NULL::text, detention_start_date date DEFAULT NULL::date, detention_end_date date DEFAULT NULL::date, detainee_status text DEFAULT NULL::text, location text DEFAULT NULL::text, gender_filter text DEFAULT NULL::text, age_min integer DEFAULT NULL::integer, age_max integer DEFAULT NULL::integer)
 RETURNS TABLE(id uuid, full_name text, date_of_detention date, last_seen_location text, detention_facility text, status text, gender text, age_at_detention integer, last_update_date timestamp with time zone, search_rank double precision)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH ranked_results AS (
        SELECT 
            d.*,
            CASE 
                WHEN search_text IS NOT NULL THEN 
                    ts_rank(d.search_vector, to_tsquery('english', regexp_replace(search_text, '\s+', ' & ', 'g')))::FLOAT
                ELSE 0.0
            END as search_rank
        FROM detainees d
        WHERE 
            -- Full text search if search_text is provided
            (search_text IS NULL OR d.search_vector @@ to_tsquery('english', regexp_replace(search_text, '\s+', ' & ', 'g')))
            -- Date range filter
            AND (detention_start_date IS NULL OR d.date_of_detention >= detention_start_date)
            AND (detention_end_date IS NULL OR d.date_of_detention <= detention_end_date)
            -- Status filter
            AND (detainee_status IS NULL OR d.status = detainee_status)
            -- Location filter
            AND (location IS NULL OR d.last_seen_location ILIKE '%' || location || '%')
            -- Gender filter
            AND (gender_filter IS NULL OR d.gender = gender_filter)
            -- Age range filter
            AND (age_min IS NULL OR d.age_at_detention >= age_min)
            AND (age_max IS NULL OR d.age_at_detention <= age_max)
    )
    SELECT 
        r.id,
        r.full_name,
        r.date_of_detention,
        r.last_seen_location,
        r.detention_facility,
        r.status,
        r.gender,
        r.age_at_detention,
        r.last_update_date,
        r.search_rank
    FROM ranked_results r
    ORDER BY 
        CASE 
            WHEN search_text IS NOT NULL THEN r.search_rank
            ELSE extract(epoch from r.last_update_date)
        END DESC;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |