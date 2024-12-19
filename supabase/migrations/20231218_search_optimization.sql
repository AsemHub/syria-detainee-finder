-- Drop existing objects
DROP FUNCTION IF EXISTS public.search_detainees(search_query text);
DROP FUNCTION IF EXISTS public.search_detainees_by_prefix(search_prefix text);
DROP MATERIALIZED VIEW IF EXISTS public.detainees_search_mv;

-- Create materialized view for search
CREATE MATERIALIZED VIEW public.detainees_search_mv AS
SELECT
    d.id,
    d.name,
    d.name_ar,
    d.location,
    d.location_ar,
    d.facility,
    d.facility_ar,
    d.status,
    d.gender,
    d.date_of_detention,
    d.age_at_detention,
    d.last_update_date,
    LOWER(COALESCE(d.name, '')) as name_lower,
    LOWER(COALESCE(d.name_ar, '')) as name_ar_lower,
    LOWER(COALESCE(d.location, '')) as location_lower,
    LOWER(COALESCE(d.location_ar, '')) as location_ar_lower,
    LOWER(COALESCE(d.facility, '')) as facility_lower,
    LOWER(COALESCE(d.facility_ar, '')) as facility_ar_lower,
    -- Trigram fields for similarity matching
    LOWER(COALESCE(d.name, '')) as name_trigrams,
    LOWER(COALESCE(d.name_ar, '')) as name_ar_trigrams,
    LOWER(COALESCE(d.location, '')) as location_trigrams,
    LOWER(COALESCE(d.location_ar, '')) as location_ar_trigrams,
    LOWER(COALESCE(d.facility, '')) as facility_trigrams,
    LOWER(COALESCE(d.facility_ar, '')) as facility_ar_trigrams,
    -- Full-text search vectors
    setweight(to_tsvector('arabic', COALESCE(d.name_ar, '')), 'A') ||
    setweight(to_tsvector('arabic', COALESCE(d.location_ar, '')), 'B') ||
    setweight(to_tsvector('arabic', COALESCE(d.facility_ar, '')), 'C') as arabic_fts_document,
    setweight(to_tsvector('english', COALESCE(d.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(d.location, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(d.facility, '')), 'C') as english_fts_document
FROM public.detainees d;

-- Create indexes for materialized view
CREATE UNIQUE INDEX ON public.detainees_search_mv (id);
CREATE INDEX ON public.detainees_search_mv USING gin(name_trigrams gin_trgm_ops);
CREATE INDEX ON public.detainees_search_mv USING gin(name_ar_trigrams gin_trgm_ops);
CREATE INDEX ON public.detainees_search_mv USING gin(location_trigrams gin_trgm_ops);
CREATE INDEX ON public.detainees_search_mv USING gin(location_ar_trigrams gin_trgm_ops);
CREATE INDEX ON public.detainees_search_mv USING gin(facility_trigrams gin_trgm_ops);
CREATE INDEX ON public.detainees_search_mv USING gin(facility_ar_trigrams gin_trgm_ops);
CREATE INDEX ON public.detainees_search_mv USING gin(arabic_fts_document);
CREATE INDEX ON public.detainees_search_mv USING gin(english_fts_document);
CREATE INDEX ON public.detainees_search_mv (status);
CREATE INDEX ON public.detainees_search_mv (gender);
CREATE INDEX ON public.detainees_search_mv (date_of_detention);
CREATE INDEX ON public.detainees_search_mv (age_at_detention);

-- Create function for prefix search
CREATE OR REPLACE FUNCTION public.search_detainees_by_prefix(search_prefix text)
RETURNS SETOF public.detainees_search_mv
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (mv.id) mv.*
    FROM public.detainees_search_mv mv
    WHERE 
        mv.name_lower LIKE LOWER(search_prefix) || '%' OR
        mv.name_ar_lower LIKE LOWER(search_prefix) || '%' OR
        mv.location_lower LIKE LOWER(search_prefix) || '%' OR
        mv.location_ar_lower LIKE LOWER(search_prefix) || '%' OR
        mv.facility_lower LIKE LOWER(search_prefix) || '%' OR
        mv.facility_ar_lower LIKE LOWER(search_prefix) || '%'
    ORDER BY mv.id, mv.last_update_date DESC
    LIMIT 10;
END;
$$;

-- Create main search function
CREATE OR REPLACE FUNCTION public.search_detainees(
    search_query text,
    max_results integer DEFAULT 10
)
RETURNS SETOF public.detainees_search_mv
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    normalized_query text;
    has_arabic boolean;
BEGIN
    -- Normalize query
    normalized_query := LOWER(TRIM(search_query));
    has_arabic := normalized_query ~ '[؀-ۿ]';
    
    RETURN QUERY
    WITH ranked_results AS (
        SELECT DISTINCT ON (mv.id) mv.*,
            CASE
                -- Exact matches (highest priority)
                WHEN mv.name_lower = normalized_query OR 
                     mv.name_ar_lower = normalized_query OR
                     mv.location_lower = normalized_query OR 
                     mv.location_ar_lower = normalized_query OR
                     mv.facility_lower = normalized_query OR 
                     mv.facility_ar_lower = normalized_query
                THEN 1
                -- Prefix matches (high priority)
                WHEN mv.name_lower LIKE normalized_query || '%' OR 
                     mv.name_ar_lower LIKE normalized_query || '%' OR
                     mv.location_lower LIKE normalized_query || '%' OR 
                     mv.location_ar_lower LIKE normalized_query || '%' OR
                     mv.facility_lower LIKE normalized_query || '%' OR 
                     mv.facility_ar_lower LIKE normalized_query || '%'
                THEN 2
                -- Trigram similarity matches (medium priority)
                WHEN mv.name_trigrams % normalized_query OR 
                     mv.name_ar_trigrams % normalized_query OR
                     mv.location_trigrams % normalized_query OR 
                     mv.location_ar_trigrams % normalized_query OR
                     mv.facility_trigrams % normalized_query OR 
                     mv.facility_ar_trigrams % normalized_query
                THEN 3
                -- Full-text search matches (lower priority)
                WHEN has_arabic AND 
                     mv.arabic_fts_document @@ plainto_tsquery('arabic', normalized_query)
                THEN 4
                WHEN NOT has_arabic AND 
                     mv.english_fts_document @@ plainto_tsquery('english', normalized_query)
                THEN 4
                ELSE 5
            END as rank
        FROM public.detainees_search_mv mv
        WHERE
            -- Exact matches
            mv.name_lower = normalized_query OR 
            mv.name_ar_lower = normalized_query OR
            mv.location_lower = normalized_query OR 
            mv.location_ar_lower = normalized_query OR
            mv.facility_lower = normalized_query OR 
            mv.facility_ar_lower = normalized_query OR
            -- Prefix matches
            mv.name_lower LIKE normalized_query || '%' OR 
            mv.name_ar_lower LIKE normalized_query || '%' OR
            mv.location_lower LIKE normalized_query || '%' OR 
            mv.location_ar_lower LIKE normalized_query || '%' OR
            mv.facility_lower LIKE normalized_query || '%' OR 
            mv.facility_ar_lower LIKE normalized_query || '%' OR
            -- Trigram similarity matches
            mv.name_trigrams % normalized_query OR 
            mv.name_ar_trigrams % normalized_query OR
            mv.location_trigrams % normalized_query OR 
            mv.location_ar_trigrams % normalized_query OR
            mv.facility_trigrams % normalized_query OR 
            mv.facility_ar_trigrams % normalized_query OR
            -- Full-text search matches
            (has_arabic AND mv.arabic_fts_document @@ plainto_tsquery('arabic', normalized_query)) OR
            (NOT has_arabic AND mv.english_fts_document @@ plainto_tsquery('english', normalized_query))
    )
    SELECT r.*
    FROM ranked_results r
    ORDER BY r.rank, r.last_update_date DESC
    LIMIT max_results;
END;
$$;

-- Create refresh trigger
CREATE OR REPLACE FUNCTION refresh_detainees_search_mv()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.detainees_search_mv;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS refresh_detainees_search_mv_trigger ON public.detainees;
CREATE TRIGGER refresh_detainees_search_mv_trigger
    AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
    ON public.detainees
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_detainees_search_mv();

-- Initial refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY public.detainees_search_mv;
