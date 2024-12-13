-- Supabase AI is experimental and may produce incorrect answers
-- Always verify the output before executing

-- Enable Row Level Security on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload documents
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  auth.role() != 'anon'
);

-- Policy: Allow verifiers to read all documents
CREATE POLICY "Verifiers can read all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.role = 'verifier'  -- Use the role column directly
  )
);

-- Policy: Users can read their own uploaded documents
CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (
    -- Check if user is the submitter of the document
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.submissions s ON d.detainee_id = s.detainee_id
      WHERE 
        storage.objects.name = d.file_path AND
        s.submitter_email = (
          SELECT email FROM auth.users WHERE id = auth.uid()
        )
    )
  )
);

-- Policy: Only verifiers can delete documents
CREATE POLICY "Only verifiers can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.role = 'verifier'  -- Use the role column directly
  )
);

-- Policy: Allow verifiers to update document metadata
CREATE POLICY "Verifiers can update document metadata"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.role = 'verifier'  -- Use the role column directly
  )
);

-- Create function to check if user is a verifier
CREATE OR REPLACE FUNCTION auth.is_verifier()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT role = 'verifier'  -- Use the role column directly
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;