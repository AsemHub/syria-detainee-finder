-- Enable RLS on detainees table
ALTER TABLE detainees ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users and anon
CREATE POLICY "Allow read access to authenticated users and anon"
ON detainees
FOR SELECT
TO authenticated, anon
USING (true);

-- Allow insert access to service role and anon
CREATE POLICY "Allow insert to service role and anon"
ON detainees
FOR INSERT
TO service_role, anon
WITH CHECK (true);

-- Allow update access to service role only
CREATE POLICY "Allow update to service role"
ON detainees
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Allow delete access to service role only
CREATE POLICY "Allow delete to service role"
ON detainees
FOR DELETE
TO service_role
USING (true);

-- Add comments for documentation
COMMENT ON TABLE detainees IS 'Records of detainees with their personal information and status';
