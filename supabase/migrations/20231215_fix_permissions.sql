-- Grant schema permissions first
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant necessary permissions to the service role
GRANT ALL ON TABLE public.detainees_search_mv TO service_role;
GRANT ALL ON TABLE public.detainees TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_search_mv() TO service_role;

-- Grant permissions to refresh materialized view concurrently
ALTER MATERIALIZED VIEW public.detainees_search_mv OWNER TO authenticated;
