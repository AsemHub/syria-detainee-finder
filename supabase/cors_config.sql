-- Configure storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, owner)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  NULL
)
ON CONFLICT (id) DO UPDATE
SET 
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- Set CORS configuration through Supabase dashboard or API
-- Note: CORS configuration should be done through the Supabase dashboard:
-- 1. Go to Project Settings > API > CORS Origins
-- 2. Add the following origins:
--    - http://localhost:3000 (for development)
--    - https://your-production-domain.com (for production)
-- 3. Enable the following headers:
--    - Authorization
--    - Content-Type
--    - x-client-info
