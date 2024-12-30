-- Create a function to execute dynamic SQL with parameters
CREATE OR REPLACE FUNCTION exec(sql text, params text[] DEFAULT '{}'::text[])
RETURNS void AS $$
BEGIN
  EXECUTE sql USING params[1], params[2];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
