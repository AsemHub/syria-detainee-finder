-- Drop existing functions
DROP FUNCTION IF EXISTS exec(text, jsonb);
DROP FUNCTION IF EXISTS exec(text, text[]);
DROP FUNCTION IF EXISTS update_session_errors;

-- Create a function to update session with errors and counts
CREATE OR REPLACE FUNCTION update_session_errors(
  p_session_id uuid,
  p_record_name text,
  p_errors jsonb,
  p_valid_records integer DEFAULT NULL,
  p_invalid_records integer DEFAULT NULL,
  p_duplicate_records integer DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE upload_sessions 
  SET 
    errors = COALESCE(errors, '[]'::jsonb) || jsonb_build_object('record', p_record_name, 'errors', p_errors),
    valid_records = COALESCE(p_valid_records, valid_records),
    invalid_records = COALESCE(p_invalid_records, COALESCE(invalid_records, 0) + 1),
    duplicate_records = COALESCE(p_duplicate_records, duplicate_records)
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
