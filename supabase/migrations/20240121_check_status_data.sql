-- Check the current enum values
SELECT enum_range(NULL::status_enum);

-- Count total number of records
SELECT COUNT(*) as total_records FROM detainees;

-- Count records by status
SELECT status, COUNT(*) as count
FROM detainees
GROUP BY status
ORDER BY count DESC;

-- Show all records with status 'محرر'
SELECT 
    id,
    full_name,
    status,
    last_seen_location,
    date_of_detention,
    created_at,
    last_update_date
FROM detainees
WHERE status = 'محرر'
ORDER BY created_at DESC;

-- Check if status is used in any other tables or views
SELECT 
    schemaname,
    tablename,
    columnname,
    data_type
FROM pg_catalog.pg_tables t
JOIN information_schema.columns c 
    ON c.table_schema = t.schemaname 
    AND c.table_name = t.tablename
WHERE data_type LIKE '%status_enum%'
ORDER BY schemaname, tablename;

-- Check materialized view definition
SELECT definition 
FROM pg_matviews 
WHERE matviewname = 'mv_detainees_search';

-- Check if there are any triggers or functions that reference the status
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE pg_get_functiondef(p.oid) LIKE '%status_enum%'
    OR pg_get_functiondef(p.oid) LIKE '%محرر%';
