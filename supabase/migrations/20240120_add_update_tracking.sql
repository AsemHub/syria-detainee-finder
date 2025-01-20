-- Add columns for tracking updates to detainee records
ALTER TABLE detainees
    ADD COLUMN IF NOT EXISTS update_history JSONB[] DEFAULT ARRAY[]::JSONB[],
    ADD COLUMN IF NOT EXISTS last_update_by TEXT,
    ADD COLUMN IF NOT EXISTS last_update_reason TEXT;

-- Create an index on the update_history column for better performance
CREATE INDEX IF NOT EXISTS idx_detainees_update_history ON detainees USING GIN (update_history);

-- Update the materialized view to include the new columns
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
    d.last_update_reason
FROM detainees d;

-- Create indexes on the materialized view
CREATE UNIQUE INDEX idx_mv_search_id ON mv_detainees_search (id);
CREATE INDEX idx_mv_search_normalized_name ON mv_detainees_search (normalized_name);
CREATE INDEX idx_mv_search_vector ON mv_detainees_search USING gin(search_vector);
CREATE INDEX idx_mv_search_effective_date ON mv_detainees_search (effective_date);
CREATE INDEX idx_mv_search_update_history ON mv_detainees_search USING GIN (update_history);

-- Create a function to format contact information updates
CREATE OR REPLACE FUNCTION format_contact_info_update(old_info text, new_info text)
RETURNS text AS $$
BEGIN
    IF old_info IS NULL OR old_info = '' THEN
        RETURN new_info;
    ELSIF new_info IS NULL OR new_info = '' THEN
        RETURN old_info;
    ELSE
        RETURN old_info || E'\n---\n' || new_info;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to format notes updates
CREATE OR REPLACE FUNCTION format_notes_update(old_notes text, new_notes text)
RETURNS text AS $$
BEGIN
    IF old_notes IS NULL OR old_notes = '' THEN
        RETURN new_notes;
    ELSIF new_notes IS NULL OR new_notes = '' THEN
        RETURN old_notes;
    ELSE
        RETURN old_notes || E'\n---\n' || new_notes;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION format_contact_info_update TO anon;
GRANT EXECUTE ON FUNCTION format_notes_update TO anon;
