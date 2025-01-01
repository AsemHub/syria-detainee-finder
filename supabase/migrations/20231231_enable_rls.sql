-- Enable RLS on all tables
ALTER TABLE detainees ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_upload_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for detainees table
CREATE POLICY "Allow anonymous to read detainees"
ON detainees
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous to insert detainees"
ON detainees
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anonymous to update detainees"
ON detainees
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Policies for csv_upload_records table
CREATE POLICY "Allow anonymous to read csv_upload_records"
ON csv_upload_records
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous to insert csv_upload_records"
ON csv_upload_records
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anonymous to update csv_upload_records"
ON csv_upload_records
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Policies for upload_sessions table
CREATE POLICY "Allow anonymous to read upload_sessions"
ON upload_sessions
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous to insert upload_sessions"
ON upload_sessions
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anonymous to update upload_sessions"
ON upload_sessions
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Optional: Add delete policies if needed
CREATE POLICY "Allow anonymous to delete upload_sessions"
ON upload_sessions
FOR DELETE
TO anon
USING (true);

CREATE POLICY "Allow anonymous to delete csv_upload_records"
ON csv_upload_records
FOR DELETE
TO anon
USING (true);

-- Note: We don't allow deleting detainees to preserve data integrity
