-- Add metadata column for storing additional information about records
ALTER TABLE detainees
    ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create an index on the metadata column for better query performance
CREATE INDEX IF NOT EXISTS idx_detainees_metadata ON detainees USING GIN (metadata);

-- Update materialized view to include metadata
DROP MATERIALIZED VIEW IF EXISTS mv_detainees_search;
CREATE MATERIALIZED VIEW mv_detainees_search AS
SELECT
    d.id,
    d.full_name,
    d.original_name,
    d.date_of_detention,
    d.last_seen_location,
    d.detention_facility,
    d.physical_description,
    d.age_at_detention,
    d.gender,
    d.status,
    d.contact_info,
    d.additional_notes,
    d.created_at,
    d.last_update_date,
    d.source_organization,
    d.normalized_name,
    d.effective_date,
    d.gender_terms,
    d.name_fts,
    d.location_fts,
    d.description_fts,
    d.contact_fts,
    d.search_vector,
    d.update_history,
    d.last_update_by,
    d.last_update_reason,
    d.metadata
FROM detainees d;

-- Recreate indexes
CREATE UNIQUE INDEX idx_mv_search_id ON mv_detainees_search (id);
CREATE INDEX idx_mv_search_normalized_name ON mv_detainees_search (normalized_name);
CREATE INDEX idx_mv_search_vector ON mv_detainees_search USING gin(search_vector);
CREATE INDEX idx_mv_search_effective_date ON mv_detainees_search (effective_date);
CREATE INDEX idx_mv_search_update_history ON mv_detainees_search USING GIN (update_history);
CREATE INDEX idx_mv_search_metadata ON mv_detainees_search USING GIN (metadata);
