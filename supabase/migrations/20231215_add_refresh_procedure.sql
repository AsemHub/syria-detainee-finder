-- Create a stored procedure to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_detainees_search_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try concurrent refresh first
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY detainees_search_mv;
  EXCEPTION WHEN OTHERS THEN
    -- If concurrent refresh fails, fall back to regular refresh
    REFRESH MATERIALIZED VIEW detainees_search_mv;
  END;
END;
$$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION refresh_detainees_search_mv() TO service_role;
