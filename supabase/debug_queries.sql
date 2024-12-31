-- 1. Check detailed upload session status
SELECT 
    id,
    file_name,
    file_size,
    mime_type,
    status,
    total_records,
    processed_records,
    valid_records,
    invalid_records,
    error_message,
    errors,
    processing_details,
    current_record,
    created_at,
    updated_at,
    last_update,
    completed_at
FROM upload_sessions 
WHERE id = 'bdda281e-0c9c-4ec5-90f1-c1c4a094b145';

-- 2. Check processing timeline
SELECT 
    created_at,
    updated_at,
    last_update,
    completed_at,
    EXTRACT(EPOCH FROM (updated_at - created_at)) as processing_duration_seconds,
    status
FROM upload_sessions 
WHERE id = 'bdda281e-0c9c-4ec5-90f1-c1c4a094b145';

-- 3. Check if any CSV records were created and their status
SELECT 
    COUNT(*) as total_records,
    COUNT(detainee_id) as linked_to_detainees
FROM csv_upload_records 
WHERE session_id = 'bdda281e-0c9c-4ec5-90f1-c1c4a094b145';

-- 4. Check for any validation issues
SELECT 
    cr.row_number,
    cr.original_data,
    vf.field_name,
    vf.message,
    vf.severity,
    vf.created_at
FROM csv_upload_records cr
LEFT JOIN validation_feedback vf ON cr.id = vf.record_id
WHERE cr.session_id = 'bdda281e-0c9c-4ec5-90f1-c1c4a094b145'
ORDER BY cr.row_number, vf.created_at;

-- 5. Check for any created detainees from this session
SELECT d.*
FROM detainees d
JOIN csv_upload_records cr ON cr.detainee_id = d.id
WHERE cr.session_id = 'bdda281e-0c9c-4ec5-90f1-c1c4a094b145';
