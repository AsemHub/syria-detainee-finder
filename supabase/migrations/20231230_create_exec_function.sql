-- Create a function to execute dynamic SQL with parameters
CREATE OR REPLACE FUNCTION exec(sql text, params jsonb DEFAULT '[]'::jsonb)
RETURNS void AS $$
BEGIN
  EXECUTE sql USING params->0, params->1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
