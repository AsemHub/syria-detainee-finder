-- Drop all functions first to avoid conflicts
DROP FUNCTION IF EXISTS search_detainees_advanced(text, text, text, text, int, int, date, date, int, int);
DROP FUNCTION IF EXISTS search_detainees_advanced(text, text, text, text, int, int, date, date, int, int, text, text);
DROP FUNCTION IF EXISTS search_detainees_by_name(text, int, int);

-- Drop dependent objects
DROP VIEW IF EXISTS detainees_search;
DROP TRIGGER IF EXISTS detainees_search_vector_update ON detainees;

-- Drop the existing generated column
ALTER TABLE IF EXISTS detainees 
DROP COLUMN IF EXISTS search_vector;

-- Add the search_vector column as a generated column with weighted fields
ALTER TABLE detainees
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(last_seen_location, '') || ' ' || coalesce(detention_facility, '')), 'B') ||
    setweight(to_tsvector('english', 
        coalesce(physical_description, '') || ' ' || 
        coalesce(gender, '') || ' ' || 
        coalesce(status, '') || ' ' ||
        coalesce(nullif(additional_notes, 'test'), '')
    ), 'C')
) STORED;

-- Create index on the search vector
CREATE INDEX IF NOT EXISTS idx_detainees_search_vector 
ON detainees USING gin(search_vector);

-- Create extension for trigram support if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add trigram index for partial matching
CREATE INDEX IF NOT EXISTS idx_detainees_name_trigram 
ON detainees USING gin (full_name gin_trgm_ops);

-- Function to normalize and prepare search text
CREATE OR REPLACE FUNCTION prepare_search_text(input_text text)
RETURNS text AS $$
BEGIN
    RETURN regexp_replace(
        regexp_replace(
            lower(input_text),
            '[^a-z0-9\s]',
            ' ',
            'g'
        ),
        '\s+',
        ' ',
        'g'
    );
END;
$$ LANGUAGE plpgsql;

-- Create a specialized name-only search function
CREATE OR REPLACE FUNCTION search_detainees_by_name(
    name_query text,
    page_number int DEFAULT 1,
    page_size int DEFAULT 10
) RETURNS TABLE (
    id uuid,
    full_name text,
    date_of_detention date,
    last_seen_location text,
    detention_facility text,
    physical_description text,
    age_at_detention integer,
    gender text,
    status text,
    last_update_date timestamptz,
    contact_info text,
    additional_notes text,
    created_at timestamptz,
    name_similarity float4,
    total_count bigint
) AS $$
DECLARE
    v_limit int;
    v_offset int;
BEGIN
    v_limit := LEAST(page_size, 100);
    v_offset := (page_number - 1) * v_limit;
    
    RETURN QUERY
    WITH name_results AS (
        SELECT 
            d.*,
            similarity(lower(d.full_name), lower(name_query)) as exact_similarity,
            similarity(
                lower(regexp_replace(d.full_name, '[^a-zA-Z0-9]', '', 'g')),
                lower(regexp_replace(name_query, '[^a-zA-Z0-9]', '', 'g'))
            ) as normalized_similarity,
            COUNT(*) OVER() as total_count
        FROM detainees d
        WHERE 
            similarity(lower(d.full_name), lower(name_query)) > 0.3 OR
            d.full_name ILIKE '%' || name_query || '%' OR
            regexp_replace(lower(d.full_name), '[^a-zA-Z0-9]', '', 'g') LIKE 
            '%' || regexp_replace(lower(name_query), '[^a-zA-Z0-9]', '', 'g') || '%'
    )
    SELECT 
        r.id,
        r.full_name,
        r.date_of_detention,
        r.last_seen_location,
        r.detention_facility,
        r.physical_description,
        r.age_at_detention,
        r.gender,
        r.status,
        r.last_update_date,
        r.contact_info,
        r.additional_notes,
        r.created_at,
        GREATEST(r.exact_similarity, r.normalized_similarity)::float4 as name_similarity,
        r.total_count
    FROM name_results r
    ORDER BY 
        GREATEST(r.exact_similarity, r.normalized_similarity) DESC,
        r.last_update_date DESC
    LIMIT v_limit
    OFFSET v_offset;
END;
$$ LANGUAGE plpgsql;

-- Create the advanced search function with sorting options
CREATE OR REPLACE FUNCTION search_detainees_advanced(
    search_text text,
    location_text text,
    status_text text,
    gender_filter text,
    min_age int,
    max_age int,
    detention_date_start date,
    detention_date_end date,
    page_number int,
    page_size int,
    sort_by text,
    sort_order text
) RETURNS TABLE (
    id uuid,
    full_name text,
    date_of_detention date,
    last_seen_location text,
    detention_facility text,
    physical_description text,
    age_at_detention integer,
    gender text,
    status text,
    last_update_date timestamptz,
    contact_info text,
    additional_notes text,
    created_at timestamptz,
    search_rank float4,
    name_similarity float4,
    total_count bigint
) AS $$
DECLARE
    v_limit int;
    v_offset int;
    v_prepared_search text;
    v_tsquery tsquery;
    v_order_by text;
BEGIN
    -- Calculate limit and offset
    v_limit := LEAST(page_size, 100);
    v_offset := (page_number - 1) * v_limit;
    
    -- Prepare search text and create tsquery
    IF search_text IS NOT NULL THEN
        v_prepared_search := prepare_search_text(search_text);
        v_prepared_search := regexp_replace(v_prepared_search, '\s+', ' & ', 'g');
        v_prepared_search := regexp_replace(v_prepared_search, '([^\s&|!]+)', '\1:*', 'g');
        v_tsquery := to_tsquery('english', v_prepared_search);
    END IF;
    
    -- Determine order by clause
    v_order_by := CASE 
        WHEN sort_by = 'name' THEN 
            format('full_name %s, last_update_date DESC', sort_order)
        WHEN sort_by = 'date' THEN 
            format('date_of_detention %s, last_update_date DESC', sort_order)
        WHEN sort_by = 'age' THEN 
            format('age_at_detention %s, last_update_date DESC', sort_order)
        ELSE 
            '(text_rank + name_sim) DESC, last_update_date DESC'
    END;
    
    RETURN QUERY EXECUTE format(
        'WITH base_results AS (
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
                    WHEN $1 IS NOT NULL THEN 
                        ts_rank_cd(d.search_vector, $2, 32) * 0.6::float4 +
                        CASE 
                            WHEN d.full_name ILIKE ''%%'' || $1 || ''%%'' THEN 0.4
                            ELSE 0
                        END::float4
                    ELSE 0.0 
                END as text_rank,
                CASE 
                    WHEN $1 IS NOT NULL THEN 
                        similarity(lower(d.full_name), lower($1))::float4
                    ELSE 0.0 
                END as name_sim,
                COUNT(*) OVER() as total_count
            FROM detainees d
            WHERE (
                $1 IS NULL OR
                d.search_vector @@ $2 OR
                similarity(lower(d.full_name), lower($1)) > 0.3 OR
                d.full_name ILIKE ''%%'' || $1 || ''%%''
            )
            AND (
                $3 IS NULL OR
                d.last_seen_location ILIKE ''%%'' || $3 || ''%%'' OR
                d.detention_facility ILIKE ''%%'' || $3 || ''%%''
            )
            AND (
                $4 IS NULL OR
                d.status = $4
            )
            AND (
                $5 IS NULL OR
                d.gender = $5
            )
            AND (
                $6 IS NULL OR d.age_at_detention >= $6
            )
            AND (
                $7 IS NULL OR d.age_at_detention <= $7
            )
            AND (
                $8 IS NULL OR d.date_of_detention >= $8
            )
            AND (
                $9 IS NULL OR d.date_of_detention <= $9
            )
        )
        SELECT 
            r.id,
            r.full_name,
            r.date_of_detention,
            r.last_seen_location,
            r.detention_facility,
            r.physical_description,
            r.age_at_detention,
            r.gender,
            r.status,
            r.last_update_date,
            r.contact_info,
            r.additional_notes,
            r.created_at,
            (r.text_rank + r.name_sim)::float4 as search_rank,
            r.name_sim::float4 as name_similarity,
            r.total_count
        FROM base_results r
        ORDER BY %s
        LIMIT %s
        OFFSET %s',
        v_order_by,
        v_limit,
        v_offset
    ) USING 
        search_text,
        v_tsquery,
        location_text,
        status_text,
        gender_filter,
        min_age,
        max_age,
        detention_date_start,
        detention_date_end;
END;
$$ LANGUAGE plpgsql;

-- Example queries:

-- 1. Basic name-only search
SELECT * FROM search_detainees_by_name(
    name_query := 'asem'::text
);

-- 2. Basic search with default sorting (by relevance)
SELECT * FROM search_detainees_advanced(
    search_text := 'asem'::text,
    location_text := NULL,
    status_text := NULL,
    gender_filter := NULL,
    min_age := NULL,
    max_age := NULL,
    detention_date_start := NULL,
    detention_date_end := NULL,
    page_number := 1,
    page_size := 10,
    sort_by := 'relevance'::text,
    sort_order := 'desc'::text
);

-- 3. Search with name sorting
SELECT * FROM search_detainees_advanced(
    search_text := 'asem'::text,
    location_text := NULL,
    status_text := NULL,
    gender_filter := NULL,
    min_age := NULL,
    max_age := NULL,
    detention_date_start := NULL,
    detention_date_end := NULL,
    page_number := 1,
    page_size := 10,
    sort_by := 'name'::text,
    sort_order := 'asc'::text
);

-- 4. Search with date sorting
SELECT * FROM search_detainees_advanced(
    search_text := NULL,
    location_text := 'latakia'::text,
    status_text := NULL,
    gender_filter := NULL,
    min_age := NULL,
    max_age := NULL,
    detention_date_start := NULL,
    detention_date_end := NULL,
    page_number := 1,
    page_size := 10,
    sort_by := 'date'::text,
    sort_order := 'desc'::text
);

-- 5. Complex search
SELECT * FROM search_detainees_advanced(
    search_text := 'asem'::text,
    location_text := 'latakia'::text,
    status_text := 'missing'::text,
    gender_filter := 'male'::text,
    min_age := 18,
    max_age := 30,
    detention_date_start := '2011-01-01'::date,
    detention_date_end := '2012-12-31'::date,
    page_number := 1,
    page_size := 10,
    sort_by := 'relevance'::text,
    sort_order := 'desc'::text
);
