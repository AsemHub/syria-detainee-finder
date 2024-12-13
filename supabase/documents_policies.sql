-- Enable Row Level Security on the documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Policy: Allow verifiers to read all documents
CREATE POLICY "Verifiers can read all documents"
ON public.documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.role = 'verifier'
  )
);

-- Policy: Allow users to read their own submitted documents
CREATE POLICY "Users can read own documents"
ON public.documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.submissions s
    WHERE s.detainee_id = documents.detainee_id
    AND s.submitter_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
);

-- Policy: Allow authenticated users to create documents
CREATE POLICY "Allow authenticated document creation"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be either a verifier or the submitter of the related detainee
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.role = 'verifier'
  ) OR
  EXISTS (
    SELECT 1 FROM public.submissions s
    WHERE s.detainee_id = documents.detainee_id
    AND s.submitter_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
);

-- Policy: Only verifiers can update documents
CREATE POLICY "Verifiers can update documents"
ON public.documents FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.role = 'verifier'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.role = 'verifier'
  )
);

-- Policy: Only verifiers can delete documents
CREATE POLICY "Verifiers can delete documents"
ON public.documents FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.role = 'verifier'
  )
);

-- Create trigger to update detainee's updated_at when documents are modified
CREATE OR REPLACE FUNCTION update_detainee_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.detainees
  SET updated_at = NOW()
  WHERE id = (
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.detainee_id
      ELSE NEW.detainee_id
    END
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_detainee_timestamp_on_document_change
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION update_detainee_timestamp();
