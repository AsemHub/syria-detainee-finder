-- Drop dependent objects first
DROP MATERIALIZED VIEW IF EXISTS detainees_search_mv;
DROP TRIGGER IF EXISTS refresh_search_mv_trigger ON detainees;
DROP FUNCTION IF EXISTS refresh_search_mv;

-- Drop existing search vector if it exists
DROP INDEX IF EXISTS detainees_search_idx;

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS detainees_search_vector_idx;
DROP INDEX IF EXISTS detainees_full_name_idx;
DROP INDEX IF EXISTS detainees_date_of_detention_idx;
DROP INDEX IF EXISTS detainees_status_idx;
DROP INDEX IF EXISTS detainees_gender_idx;
DROP INDEX IF EXISTS detainees_detention_date_idx;
DROP INDEX IF EXISTS detainees_birth_year_idx;

-- Make sure we have required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Drop the existing generated column if it exists
ALTER TABLE detainees DROP COLUMN IF EXISTS search_vector;

-- Add the generated column optimized for search
ALTER TABLE detainees ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', COALESCE(full_name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(last_seen_location, '')), 'B')
) STORED;

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS detainees_search_vector_idx ON detainees USING gin(search_vector);
CREATE INDEX IF NOT EXISTS detainees_full_name_prefix_idx ON detainees USING gin(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS detainees_composite_idx ON detainees USING btree(status, gender, date_of_detention);

-- Create a materialized view for common searches
CREATE MATERIALIZED VIEW detainees_search_mv AS
SELECT 
    id,
    full_name,
    date_of_detention,
    last_seen_location,
    detention_facility,
    physical_description,
    age_at_detention,
    gender,
    status,
    last_update_date,
    search_vector,
    similarity(full_name, '') as name_similarity
FROM detainees;

-- Create a unique index on the materialized view (required for concurrent refresh)
CREATE UNIQUE INDEX detainees_search_mv_id_idx ON detainees_search_mv (id);

-- Create search indexes on the materialized view
CREATE INDEX IF NOT EXISTS detainees_mv_search_idx ON detainees_search_mv USING gin(search_vector);
CREATE INDEX IF NOT EXISTS detainees_mv_name_idx ON detainees_search_mv USING gin(full_name gin_trgm_ops);
