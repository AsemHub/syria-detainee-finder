-- Drop dependent function first
DROP FUNCTION IF EXISTS search_detainees_by_prefix(text);

-- Drop existing materialized view and its indexes
DROP MATERIALIZED VIEW IF EXISTS detainees_search_mv;

-- Recreate the materialized view with both Arabic and English support
CREATE MATERIALIZED VIEW detainees_search_mv AS
WITH processed_detainees AS (
    SELECT 
        detainees.id,
        detainees.full_name,
        lower(detainees.full_name) AS name_lower,
        detainees.date_of_detention,
        detainees.last_seen_location,
        lower(detainees.last_seen_location) AS location_lower,
        detainees.detention_facility,
        lower(detainees.detention_facility) AS facility_lower,
        detainees.physical_description,
        detainees.age_at_detention,
        detainees.gender,
        detainees.status,
        detainees.last_update_date,
        detainees.contact_info,
        detainees.additional_notes,
        detainees.created_at,
        -- Arabic full-text search vector
        ((setweight(to_tsvector('arabic'::regconfig, COALESCE(unaccent(detainees.full_name), ''::text)), 'A'::"char") ||
          setweight(to_tsvector('arabic'::regconfig, COALESCE(unaccent(detainees.last_seen_location), ''::text)), 'B'::"char")) ||
         setweight(to_tsvector('arabic'::regconfig, COALESCE(unaccent(detainees.detention_facility), ''::text)), 'B'::"char") ||
         setweight(to_tsvector('arabic'::regconfig, COALESCE(unaccent(detainees.physical_description), ''::text)), 'C'::"char") ||
         setweight(to_tsvector('arabic'::regconfig, COALESCE(unaccent(detainees.additional_notes), ''::text)), 'D'::"char")) AS arabic_fts_document,
        -- English full-text search vector
        ((setweight(to_tsvector('english'::regconfig, COALESCE(unaccent(detainees.full_name), ''::text)), 'A'::"char") ||
          setweight(to_tsvector('english'::regconfig, COALESCE(unaccent(detainees.last_seen_location), ''::text)), 'B'::"char")) ||
         setweight(to_tsvector('english'::regconfig, COALESCE(unaccent(detainees.detention_facility), ''::text)), 'B'::"char") ||
         setweight(to_tsvector('english'::regconfig, COALESCE(unaccent(detainees.physical_description), ''::text)), 'C'::"char") ||
         setweight(to_tsvector('english'::regconfig, COALESCE(unaccent(detainees.additional_notes), ''::text)), 'D'::"char")) AS english_fts_document,
        lower(unaccent(detainees.full_name)) AS name_trigrams,
        lower(unaccent(detainees.last_seen_location)) AS location_trigrams,
        lower(unaccent(detainees.detention_facility)) AS facility_trigrams
    FROM detainees
)
SELECT * FROM processed_detainees;

-- Create indexes for full-text search
CREATE INDEX idx_detainees_search_mv_arabic_fts ON detainees_search_mv USING gin(arabic_fts_document);
CREATE INDEX idx_detainees_search_mv_english_fts ON detainees_search_mv USING gin(english_fts_document);

-- Create trigram indexes for fuzzy matching
CREATE INDEX idx_detainees_search_mv_name_trigram ON detainees_search_mv USING gin(name_trigrams gin_trgm_ops);
CREATE INDEX idx_detainees_search_mv_location_trigram ON detainees_search_mv USING gin(location_trigrams gin_trgm_ops);
CREATE INDEX idx_detainees_search_mv_facility_trigram ON detainees_search_mv USING gin(facility_trigrams gin_trgm_ops);

-- Create B-tree indexes for efficient filtering and sorting
CREATE INDEX idx_detainees_search_mv_age ON detainees_search_mv USING btree(age_at_detention);
CREATE INDEX idx_detainees_search_mv_status ON detainees_search_mv USING btree(status);
CREATE INDEX idx_detainees_search_mv_gender ON detainees_search_mv USING btree(gender);
CREATE INDEX idx_detainees_search_mv_date ON detainees_search_mv USING btree(date_of_detention);
CREATE INDEX idx_detainees_search_mv_last_update ON detainees_search_mv USING btree(last_update_date DESC);

-- Create composite indexes for common query patterns
CREATE INDEX idx_detainees_search_mv_composite ON detainees_search_mv USING btree(status, gender, date_of_detention);

-- Recreate the prefix search function
CREATE OR REPLACE FUNCTION search_detainees_by_prefix(search_prefix text)
RETURNS TABLE (
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
    created_at timestamptz
) AS $$
BEGIN
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
        d.created_at
    FROM detainees_search_mv d
    WHERE 
        d.name_trigrams LIKE lower(unaccent(search_prefix)) || '%'
    ORDER BY 
        d.last_update_date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create concurrent refresh function
CREATE OR REPLACE FUNCTION refresh_detainees_search_mv_concurrently()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY detainees_search_mv;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT ON detainees_search_mv TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION refresh_detainees_search_mv_concurrently() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_detainees_by_prefix(text) TO anon, authenticated, service_role;

-- Initial refresh of the materialized view
REFRESH MATERIALIZED VIEW detainees_search_mv;
