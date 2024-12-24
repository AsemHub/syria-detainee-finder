-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS refresh_search_view_single ON detainees;
DROP FUNCTION IF EXISTS trigger_refresh_mv_detainees_search();

-- Create unique index for concurrent refresh if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_detainees_search_id ON mv_detainees_search(id);

-- Create the trigger function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION trigger_refresh_mv_detainees_search()
RETURNS trigger AS $$
BEGIN
    -- Try concurrent refresh first, if it fails do normal refresh
    BEGIN
        PERFORM refresh_mv_detainees_search();
    EXCEPTION WHEN OTHERS THEN
        REFRESH MATERIALIZED VIEW mv_detainees_search;
    END;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER refresh_search_view_single
AFTER INSERT ON detainees
FOR EACH STATEMENT
WHEN (pg_trigger_depth() < 1)
EXECUTE FUNCTION trigger_refresh_mv_detainees_search();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION trigger_refresh_mv_detainees_search() TO anon;
GRANT EXECUTE ON FUNCTION trigger_refresh_mv_detainees_search() TO service_role;
