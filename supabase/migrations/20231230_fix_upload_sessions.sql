-- First, drop the constraint
ALTER TABLE upload_sessions DROP CONSTRAINT IF EXISTS valid_counts;

-- Then add it back with correct conditions
ALTER TABLE upload_sessions ADD CONSTRAINT valid_counts 
  CHECK (
    COALESCE(valid_records, 0) + 
    COALESCE(invalid_records, 0) + 
    COALESCE(duplicate_records, 0) <= total_records
  );
