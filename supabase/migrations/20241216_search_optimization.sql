-- Create materialized view for detainee search
-- CREATE MATERIALIZED VIEW IF NOT EXISTS public.detainees_search_mv AS
-- SELECT 
--     id,
--     full_name,
--     date_of_detention,
--     last_seen_location,
--     detention_facility,
--     physical_description,
--     age_at_detention,
--     gender,
--     status,
--     last_update_date,
--     contact_info,
--     additional_notes,
--     created_at,
--     to_tsvector('english', 
--         coalesce(full_name, '') || ' ' || 
--         coalesce(last_seen_location, '') || ' ' || 
--         coalesce(detention_facility, '') || ' ' ||
--         coalesce(physical_description, '') || ' ' ||
--         coalesce(contact_info, '') || ' ' ||
--         coalesce(additional_notes, '')
--     ) as document
-- FROM public.detainees;

-- Create index on the materialized view
-- CREATE INDEX IF NOT EXISTS detainees_search_mv_idx ON public.detainees_search_mv USING gin(document);
-- CREATE INDEX IF NOT EXISTS detainees_search_mv_id_idx ON public.detainees_search_mv(id);
-- CREATE INDEX IF NOT EXISTS detainees_search_mv_update_date_idx ON public.detainees_search_mv(last_update_date DESC);

-- Create function to refresh materialized view
-- CREATE OR REPLACE FUNCTION public.refresh_detainees_search_mv()
-- RETURNS void
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- BEGIN
--     REFRESH MATERIALIZED VIEW CONCURRENTLY public.detainees_search_mv;
-- END;
-- $$;

-- Create GIN indexes for full-text search columns
CREATE INDEX IF NOT EXISTS detainees_full_name_gin_idx ON public.detainees USING gin(to_tsvector('english', coalesce(full_name, '')));
CREATE INDEX IF NOT EXISTS detainees_location_gin_idx ON public.detainees USING gin(to_tsvector('english', coalesce(last_seen_location, '')));
CREATE INDEX IF NOT EXISTS detainees_facility_gin_idx ON public.detainees USING gin(to_tsvector('english', coalesce(detention_facility, '')));

-- Create function to search detainees with better error handling
CREATE OR REPLACE FUNCTION public.search_detainees(
    search_query text DEFAULT NULL,
    status_filter text DEFAULT NULL,
    gender_filter text DEFAULT NULL,
    age_min integer DEFAULT NULL,
    age_max integer DEFAULT NULL,
    location_filter text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    full_name text,
    date_of_detention timestamp with time zone,
    last_seen_location text,
    detention_facility text,
    physical_description text,
    age_at_detention integer,
    gender text,
    status text,
    last_update_date timestamp with time zone,
    contact_info text,
    additional_notes text,
    created_at timestamp with time zone,
    search_rank real
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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
$$;

-- Create indexes to optimize search
CREATE INDEX IF NOT EXISTS detainees_full_name_idx ON public.detainees USING gin(to_tsvector('english', coalesce(full_name, '')));
CREATE INDEX IF NOT EXISTS detainees_location_idx ON public.detainees USING gin(to_tsvector('english', coalesce(last_seen_location, '')));
CREATE INDEX IF NOT EXISTS detainees_facility_idx ON public.detainees USING gin(to_tsvector('english', coalesce(detention_facility, '')));
CREATE INDEX IF NOT EXISTS detainees_update_date_idx ON public.detainees(last_update_date DESC);
CREATE INDEX IF NOT EXISTS detainees_status_idx ON public.detainees(status);
CREATE INDEX IF NOT EXISTS detainees_gender_idx ON public.detainees(gender);
CREATE INDEX IF NOT EXISTS detainees_age_idx ON public.detainees(age_at_detention);

-- Create trigger function to refresh materialized view
-- CREATE OR REPLACE FUNCTION public.refresh_search_mv_trigger()
-- RETURNS trigger
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- BEGIN
--     PERFORM public.refresh_detainees_search_mv();
--     RETURN NULL;
-- END;
-- $$;

-- Create trigger to refresh materialized view
-- DROP TRIGGER IF EXISTS refresh_search_mv_trigger ON public.detainees;
-- CREATE TRIGGER refresh_search_mv_trigger
--     AFTER INSERT OR UPDATE OR DELETE ON public.detainees
--     FOR EACH STATEMENT
--     EXECUTE FUNCTION public.refresh_search_mv_trigger();

-- Initial refresh of materialized view
-- SELECT public.refresh_detainees_search_mv();
