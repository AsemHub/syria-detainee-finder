-- Drop existing functions
DROP FUNCTION IF EXISTS exec(text, jsonb);
DROP FUNCTION IF EXISTS exec(text, text[]);

-- Create a function to execute dynamic SQL with parameters
CREATE OR REPLACE FUNCTION update_session_errors(
  p_session_id uuid,
  p_record_name text,
  p_errors jsonb
) RETURNS void AS $$
BEGIN
  UPDATE upload_sessions 
  SET 
    errors = COALESCE(errors, '[]'::jsonb) || jsonb_build_object('record', p_record_name, 'errors', p_errors),
    invalid_records = COALESCE(invalid_records, 0) + 1
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
