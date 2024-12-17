-- Fix search path for functions
ALTER FUNCTION public.check_extensions() SET search_path = public;
ALTER FUNCTION public.check_materialized_view() SET search_path = public;
ALTER FUNCTION public.get_detainee_documents(detainee_uuid uuid) SET search_path = public;

-- Set security definer for maintenance functions
ALTER FUNCTION public.check_extensions() SECURITY DEFINER;
ALTER FUNCTION public.check_materialized_view() SECURITY DEFINER;

-- Set security invoker for public functions
ALTER FUNCTION public.get_detainee_documents(detainee_uuid uuid) SECURITY INVOKER;

-- Grant execute permissions to public for search functions
GRANT EXECUTE ON FUNCTION public.get_detainee_documents(detainee_uuid uuid) TO PUBLIC;
