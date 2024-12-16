-- Drop duplicate indexes
DROP INDEX IF EXISTS public.detainees_facility_idx;
DROP INDEX IF EXISTS public.detainees_full_name_idx;
DROP INDEX IF EXISTS public.detainees_full_name_prefix_idx;
DROP INDEX IF EXISTS public.detainees_location_idx;
DROP INDEX IF EXISTS public.detainees_gender_hash_idx;
DROP INDEX IF EXISTS public.detainees_status_hash_idx;
DROP INDEX IF EXISTS public.idx_detainees_status;

-- Keep the more efficient indexes:
-- 1. detainees_facility_gin_idx (GIN index for full-text search)
-- 2. detainees_full_name_gin_idx (GIN index for full-text search)
-- 3. detainees_full_name_trigram_idx (GIN trigram for partial matches)
-- 4. detainees_location_gin_idx (GIN index for full-text search)
-- 5. detainees_gender_idx (B-tree for exact matches and sorting)
-- 6. detainees_status_idx (B-tree for exact matches and sorting)

-- Create a combined index for common search patterns
CREATE INDEX IF NOT EXISTS idx_detainees_combined_search
ON public.detainees
USING gin(
    to_tsvector('english', COALESCE(full_name, '') || ' ' || 
                          COALESCE(last_seen_location, '') || ' ' || 
                          COALESCE(detention_facility, ''))
);

-- Create a combined B-tree index for common filters
CREATE INDEX IF NOT EXISTS idx_detainees_common_filters
ON public.detainees (status, gender, date_of_detention, last_update_date);

-- Update statistics
ANALYZE public.detainees;
