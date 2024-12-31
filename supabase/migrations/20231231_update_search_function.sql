-- Update the search function to directly use Arabic values
CREATE OR REPLACE FUNCTION public.search_detainees_enhanced(search_params JSONB)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    last_seen_location TEXT,
    status TEXT,
    gender TEXT,
    age_at_detention INT,
    date_of_detention DATE,
    detention_facility TEXT,
    additional_notes TEXT,
    physical_description TEXT,
    contact_info TEXT,
    last_update_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    search_rank FLOAT
) AS $$
DECLARE
    query TEXT := search_params->>'query';
    page_size INT := COALESCE((search_params->>'pageSize')::INT, 20);
    page_number INT := COALESCE((search_params->>'pageNumber')::INT, 1);
    detention_status TEXT := search_params->>'detentionStatus';
    gender_filter TEXT := search_params->>'gender';
    age_min INT := (search_params->>'ageMin')::INT;
    age_max INT := (search_params->>'ageMax')::INT;
    location_filter TEXT := search_params->>'location';
    facility_filter TEXT := search_params->>'facility';
    date_from DATE := (search_params->>'dateFrom')::DATE;
    date_to DATE := (search_params->>'dateTo')::DATE;
    search_query tsquery;
BEGIN
    -- Convert search query to tsquery
    search_query := to_tsquery('arabic', normalize_arabic_text(query));

    RETURN QUERY
    SELECT
        d.id,
        d.full_name,
        d.last_seen_location,
        d.status,
        d.gender,
        d.age_at_detention,
        d.date_of_detention,
        d.detention_facility,
        d.additional_notes,
        d.physical_description,
        d.contact_info,
        d.last_update_date,
        d.created_at,
        ts_rank(d.search_vector, search_query) AS search_rank
    FROM detainees d
    WHERE
        -- Full text search on search_vector
        d.search_vector @@ search_query
        -- Apply filters if provided
        AND (detention_status IS NULL OR d.status = detention_status)
        AND (gender_filter IS NULL OR d.gender = gender_filter)
        AND (age_min IS NULL OR d.age_at_detention >= age_min)
        AND (age_max IS NULL OR d.age_at_detention <= age_max)
        AND (location_filter IS NULL OR 
             d.last_seen_location ILIKE '%' || location_filter || '%')
        AND (facility_filter IS NULL OR 
             d.detention_facility ILIKE '%' || facility_filter || '%')
        AND (date_from IS NULL OR d.date_of_detention >= date_from)
        AND (date_to IS NULL OR d.date_of_detention <= date_to)
    ORDER BY
        search_rank DESC,
        d.created_at DESC
    OFFSET (page_number - 1) * page_size
    LIMIT page_size;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.search_detainees_enhanced TO anon;
