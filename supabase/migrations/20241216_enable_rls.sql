-- Add created_by column first
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'documents' 
    AND column_name = 'created_by') 
  THEN
    ALTER TABLE public.documents ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create a policy for public read access
CREATE POLICY "Allow public read access"
ON public.documents
FOR SELECT
USING (true);

-- Create a policy for public insert access
CREATE POLICY "Allow public insert access"
ON public.documents
FOR INSERT
WITH CHECK (true);

-- Create a policy for public update access
CREATE POLICY "Allow public update access"
ON public.documents
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create a policy for public delete access
CREATE POLICY "Allow public delete access"
ON public.documents
FOR DELETE
USING (true);
