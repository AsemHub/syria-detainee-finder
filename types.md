SELECT t.typname as enum_name,
       e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;
[
  {
    "enum_name": "access_level_enum",
    "enum_value": "public"
  },
  {
    "enum_name": "access_level_enum",
    "enum_value": "restricted"
  },
  {
    "enum_name": "access_level_enum",
    "enum_value": "confidential"
  },
  {
    "enum_name": "access_level_enum",
    "enum_value": "private"
  },
  {
    "enum_name": "detainee_gender_enum",
    "enum_value": "male"
  },
  {
    "enum_name": "detainee_gender_enum",
    "enum_value": "female"
  },
  {
    "enum_name": "detainee_status_enum",
    "enum_value": "in_custody"
  },
  {
    "enum_name": "detainee_status_enum",
    "enum_value": "missing"
  },
  {
    "enum_name": "detainee_status_enum",
    "enum_value": "released"
  },
  {
    "enum_name": "detainee_status_enum",
    "enum_value": "deceased"
  },
  {
    "enum_name": "detainee_status_enum",
    "enum_value": "unknown"
  },
  {
    "enum_name": "document_category_enum",
    "enum_value": "identification"
  },
  {
    "enum_name": "document_category_enum",
    "enum_value": "detention_record"
  },
  {
    "enum_name": "document_category_enum",
    "enum_value": "witness_statement"
  },
  {
    "enum_name": "document_category_enum",
    "enum_value": "medical_record"
  },
  {
    "enum_name": "document_category_enum",
    "enum_value": "legal_document"
  },
  {
    "enum_name": "document_category_enum",
    "enum_value": "photo"
  },
  {
    "enum_name": "document_category_enum",
    "enum_value": "correspondence"
  },
  {
    "enum_name": "document_category_enum",
    "enum_value": "other"
  },
  {
    "enum_name": "document_type_enum",
    "enum_value": "csv_upload"
  },
  {
    "enum_name": "document_type_enum",
    "enum_value": "supporting_document"
  },
  {
    "enum_name": "document_type_enum",
    "enum_value": "media"
  },
  {
    "enum_name": "gender_enum",
    "enum_value": "male"
  },
  {
    "enum_name": "gender_enum",
    "enum_value": "female"
  },
  {
    "enum_name": "gender_enum",
    "enum_value": "unknown"
  },
  {
    "enum_name": "relation_type_enum",
    "enum_value": "supersedes"
  },
  {
    "enum_name": "relation_type_enum",
    "enum_value": "supplements"
  },
  {
    "enum_name": "relation_type_enum",
    "enum_value": "contradicts"
  },
  {
    "enum_name": "relation_type_enum",
    "enum_value": "confirms"
  },
  {
    "enum_name": "relation_type_enum",
    "enum_value": "related_to"
  },
  {
    "enum_name": "relation_type_enum",
    "enum_value": "CSV_UPLOAD"
  },
  {
    "enum_name": "status_enum",
    "enum_value": "in_custody"
  },
  {
    "enum_name": "status_enum",
    "enum_value": "missing"
  },
  {
    "enum_name": "status_enum",
    "enum_value": "released"
  },
  {
    "enum_name": "status_enum",
    "enum_value": "deceased"
  },
  {
    "enum_name": "status_enum",
    "enum_value": "unknown"
  },
  {
    "enum_name": "upload_status",
    "enum_value": "pending"
  },
  {
    "enum_name": "upload_status",
    "enum_value": "processing"
  },
  {
    "enum_name": "upload_status",
    "enum_value": "completed"
  },
  {
    "enum_name": "upload_status",
    "enum_value": "failed"
  },
  {
    "enum_name": "upload_status_enum",
    "enum_value": "processing"
  },
  {
    "enum_name": "upload_status_enum",
    "enum_value": "completed"
  },
  {
    "enum_name": "upload_status_enum",
    "enum_value": "failed"
  },
  {
    "enum_name": "upload_status_enum",
    "enum_value": "pending"
  },
  {
    "enum_name": "verification_status_enum",
    "enum_value": "pending"
  },
  {
    "enum_name": "verification_status_enum",
    "enum_value": "verified"
  },
  {
    "enum_name": "verification_status_enum",
    "enum_value": "rejected"
  },
  {
    "enum_name": "verification_status_enum",
    "enum_value": "requires_review"
  }
]
SELECT 
    table_name,
    column_name, 
    data_type,
    udt_name,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
ORDER BY table_name, ordinal_position;
[
  {
    "table_name": "csv_upload_records",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_records",
    "column_name": "session_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_records",
    "column_name": "detainee_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_records",
    "column_name": "row_number",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_records",
    "column_name": "original_data",
    "data_type": "jsonb",
    "udt_name": "jsonb",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_records",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP",
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_sessions",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_sessions",
    "column_name": "file_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_sessions",
    "column_name": "file_url",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_sessions",
    "column_name": "file_size",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_sessions",
    "column_name": "mime_type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_sessions",
    "column_name": "uploaded_by",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_sessions",
    "column_name": "organization",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_sessions",
    "column_name": "total_records",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "YES",
    "column_default": "0",
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_sessions",
    "column_name": "processed_records",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "YES",
    "column_default": "0",
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_sessions",
    "column_name": "skipped_duplicates",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "YES",
    "column_default": "0",
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_sessions",
    "column_name": "status",
    "data_type": "USER-DEFINED",
    "udt_name": "upload_status_enum",
    "is_nullable": "YES",
    "column_default": "'processing'::upload_status_enum",
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_sessions",
    "column_name": "error_message",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_sessions",
    "column_name": "processing_details",
    "data_type": "jsonb",
    "udt_name": "jsonb",
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_sessions",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP",
    "character_maximum_length": null
  },
  {
    "table_name": "csv_upload_sessions",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP",
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "full_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "date_of_detention",
    "data_type": "date",
    "udt_name": "date",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "last_seen_location",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "detention_facility",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "physical_description",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "age_at_detention",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "last_update_date",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP",
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "contact_info",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "additional_notes",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP",
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "source_organization",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'Public'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "source_document_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "status",
    "data_type": "USER-DEFINED",
    "udt_name": "detainee_status_enum",
    "is_nullable": "YES",
    "column_default": "'unknown'::detainee_status_enum",
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "search_vector",
    "data_type": "tsvector",
    "udt_name": "tsvector",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "organization",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "original_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "original_organization",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "upload_session_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "gender",
    "data_type": "USER-DEFINED",
    "udt_name": "gender_enum",
    "is_nullable": "YES",
    "column_default": "'unknown'::gender_enum",
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "name_fts",
    "data_type": "tsvector",
    "udt_name": "tsvector",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "location_fts",
    "data_type": "tsvector",
    "udt_name": "tsvector",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "description_fts",
    "data_type": "tsvector",
    "udt_name": "tsvector",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "contact_fts",
    "data_type": "tsvector",
    "udt_name": "tsvector",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "gender_terms",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "normalized_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "detainees",
    "column_name": "effective_date",
    "data_type": "date",
    "udt_name": "date",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "file_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "file_url",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "file_size",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "mime_type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "uploaded_by",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": "'anonymous'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "total_records",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "YES",
    "column_default": "0",
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "processed_records",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "YES",
    "column_default": "0",
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "skipped_duplicates",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "YES",
    "column_default": "0",
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "status",
    "data_type": "USER-DEFINED",
    "udt_name": "upload_status_enum",
    "is_nullable": "YES",
    "column_default": "'processing'::upload_status_enum",
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "error_message",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "processing_details",
    "data_type": "jsonb",
    "udt_name": "jsonb",
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "now()",
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "now()",
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "current_record",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "last_update",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "timezone('utc'::text, now())",
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "valid_records",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "YES",
    "column_default": "0",
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "invalid_records",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "YES",
    "column_default": "0",
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "duplicate_records",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "YES",
    "column_default": "0",
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "errors",
    "data_type": "jsonb",
    "udt_name": "jsonb",
    "is_nullable": "YES",
    "column_default": "'[]'::jsonb",
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "organization",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "''::text",
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "failed_records",
    "data_type": "jsonb",
    "udt_name": "jsonb",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "upload_sessions",
    "column_name": "completed_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  }
]
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as argument_types,
    pg_get_function_result(p.oid) as return_type,
    d.description as function_description
FROM pg_proc p
LEFT JOIN pg_description d ON p.oid = d.objoid
WHERE p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND p.prokind = 'f'  -- 'f' for normal function
ORDER BY p.proname;
[
  {
    "function_name": "check_detainee_duplicate",
    "argument_types": "p_name text, p_organization text",
    "return_type": "TABLE(id uuid, full_name text, original_name text, normalized_match boolean)",
    "function_description": null
  },
  {
    "function_name": "check_extensions",
    "argument_types": "",
    "return_type": "jsonb",
    "function_description": null
  },
  {
    "function_name": "contains_arabic",
    "argument_types": "text_to_check text",
    "return_type": "boolean",
    "function_description": null
  },
  {
    "function_name": "count_estimate",
    "argument_types": "query text, params text[] DEFAULT '{}'::text[]",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "create_csv_document_relation",
    "argument_types": "source_id uuid, target_id uuid, notes text DEFAULT NULL::text",
    "return_type": "void",
    "function_description": null
  },
  {
    "function_name": "create_search_query",
    "argument_types": "search_terms text[]",
    "return_type": "tsquery",
    "function_description": null
  },
  {
    "function_name": "detect_gender",
    "argument_types": "word text",
    "return_type": "gender_enum",
    "function_description": null
  },
  {
    "function_name": "detect_gender_terms",
    "argument_types": "input_text text",
    "return_type": "TABLE(gender text, remaining_text text)",
    "function_description": null
  },
  {
    "function_name": "execute_sql",
    "argument_types": "query_text text",
    "return_type": "TABLE(id uuid, created_at timestamp with time zone, title text, type text, status text, source_organization text, document_type text, total_count bigint)",
    "function_description": null
  },
  {
    "function_name": "execute_sql",
    "argument_types": "query_text text, query_params jsonb DEFAULT '{}'::jsonb",
    "return_type": "TABLE(id uuid, created_at timestamp with time zone, title text, type text, status text, source_organization text, document_type text, total_count bigint)",
    "function_description": null
  },
  {
    "function_name": "get_csv_upload_status",
    "argument_types": "session_id uuid",
    "return_type": "TABLE(status upload_status_enum, total_records integer, processed_records integer, skipped_duplicates integer, error_message text, processing_details jsonb)",
    "function_description": null
  },
  {
    "function_name": "get_detainee_documents",
    "argument_types": "detainee_uuid uuid",
    "return_type": "TABLE(id uuid, document_type text, file_url text, description text, submission_date timestamp with time zone, file_name text, mime_type text)",
    "function_description": null
  },
  {
    "function_name": "get_effective_date",
    "argument_types": "detention_date date",
    "return_type": "date",
    "function_description": null
  },
  {
    "function_name": "gin_btree_consistent",
    "argument_types": "internal, smallint, anyelement, integer, internal, internal",
    "return_type": "boolean",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_anyenum",
    "argument_types": "anyenum, anyenum, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_bit",
    "argument_types": "bit, bit, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_bool",
    "argument_types": "boolean, boolean, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_bpchar",
    "argument_types": "character, character, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_bytea",
    "argument_types": "bytea, bytea, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_char",
    "argument_types": "\"char\", \"char\", smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_cidr",
    "argument_types": "cidr, cidr, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_date",
    "argument_types": "date, date, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_float4",
    "argument_types": "real, real, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_float8",
    "argument_types": "double precision, double precision, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_inet",
    "argument_types": "inet, inet, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_int2",
    "argument_types": "smallint, smallint, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_int4",
    "argument_types": "integer, integer, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_int8",
    "argument_types": "bigint, bigint, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_interval",
    "argument_types": "interval, interval, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_macaddr",
    "argument_types": "macaddr, macaddr, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_macaddr8",
    "argument_types": "macaddr8, macaddr8, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_money",
    "argument_types": "money, money, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_name",
    "argument_types": "name, name, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_numeric",
    "argument_types": "numeric, numeric, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_oid",
    "argument_types": "oid, oid, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_text",
    "argument_types": "text, text, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_time",
    "argument_types": "time without time zone, time without time zone, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_timestamp",
    "argument_types": "timestamp without time zone, timestamp without time zone, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_timestamptz",
    "argument_types": "timestamp with time zone, timestamp with time zone, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_timetz",
    "argument_types": "time with time zone, time with time zone, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_uuid",
    "argument_types": "uuid, uuid, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_compare_prefix_varbit",
    "argument_types": "bit varying, bit varying, smallint, internal",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_enum_cmp",
    "argument_types": "anyenum, anyenum",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_anyenum",
    "argument_types": "anyenum, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_bit",
    "argument_types": "bit, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_bool",
    "argument_types": "boolean, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_bpchar",
    "argument_types": "character, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_bytea",
    "argument_types": "bytea, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_char",
    "argument_types": "\"char\", internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_cidr",
    "argument_types": "cidr, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_date",
    "argument_types": "date, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_float4",
    "argument_types": "real, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_float8",
    "argument_types": "double precision, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_inet",
    "argument_types": "inet, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_int2",
    "argument_types": "smallint, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_int4",
    "argument_types": "integer, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_int8",
    "argument_types": "bigint, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_interval",
    "argument_types": "interval, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_macaddr",
    "argument_types": "macaddr, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_macaddr8",
    "argument_types": "macaddr8, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_money",
    "argument_types": "money, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_name",
    "argument_types": "name, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_numeric",
    "argument_types": "numeric, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_oid",
    "argument_types": "oid, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_text",
    "argument_types": "text, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_time",
    "argument_types": "time without time zone, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_timestamp",
    "argument_types": "timestamp without time zone, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_timestamptz",
    "argument_types": "timestamp with time zone, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_timetz",
    "argument_types": "time with time zone, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_trgm",
    "argument_types": "text, internal, smallint, internal, internal, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_uuid",
    "argument_types": "uuid, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_query_varbit",
    "argument_types": "bit varying, internal, smallint, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_anyenum",
    "argument_types": "anyenum, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_bit",
    "argument_types": "bit, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_bool",
    "argument_types": "boolean, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_bpchar",
    "argument_types": "character, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_bytea",
    "argument_types": "bytea, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_char",
    "argument_types": "\"char\", internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_cidr",
    "argument_types": "cidr, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_date",
    "argument_types": "date, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_float4",
    "argument_types": "real, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_float8",
    "argument_types": "double precision, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_inet",
    "argument_types": "inet, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_int2",
    "argument_types": "smallint, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_int4",
    "argument_types": "integer, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_int8",
    "argument_types": "bigint, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_interval",
    "argument_types": "interval, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_macaddr",
    "argument_types": "macaddr, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_macaddr8",
    "argument_types": "macaddr8, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_money",
    "argument_types": "money, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_name",
    "argument_types": "name, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_numeric",
    "argument_types": "numeric, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_oid",
    "argument_types": "oid, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_text",
    "argument_types": "text, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_time",
    "argument_types": "time without time zone, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_timestamp",
    "argument_types": "timestamp without time zone, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_timestamptz",
    "argument_types": "timestamp with time zone, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_timetz",
    "argument_types": "time with time zone, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_trgm",
    "argument_types": "text, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_uuid",
    "argument_types": "uuid, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_extract_value_varbit",
    "argument_types": "bit varying, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gin_numeric_cmp",
    "argument_types": "numeric, numeric",
    "return_type": "integer",
    "function_description": null
  },
  {
    "function_name": "gin_trgm_consistent",
    "argument_types": "internal, smallint, text, integer, internal, internal, internal, internal",
    "return_type": "boolean",
    "function_description": null
  },
  {
    "function_name": "gin_trgm_triconsistent",
    "argument_types": "internal, smallint, text, integer, internal, internal, internal",
    "return_type": "\"char\"",
    "function_description": null
  },
  {
    "function_name": "gtrgm_compress",
    "argument_types": "internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gtrgm_consistent",
    "argument_types": "internal, text, smallint, oid, internal",
    "return_type": "boolean",
    "function_description": null
  },
  {
    "function_name": "gtrgm_decompress",
    "argument_types": "internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gtrgm_distance",
    "argument_types": "internal, text, smallint, oid, internal",
    "return_type": "double precision",
    "function_description": null
  },
  {
    "function_name": "gtrgm_in",
    "argument_types": "cstring",
    "return_type": "gtrgm",
    "function_description": null
  },
  {
    "function_name": "gtrgm_options",
    "argument_types": "internal",
    "return_type": "void",
    "function_description": null
  },
  {
    "function_name": "gtrgm_out",
    "argument_types": "gtrgm",
    "return_type": "cstring",
    "function_description": null
  },
  {
    "function_name": "gtrgm_penalty",
    "argument_types": "internal, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gtrgm_picksplit",
    "argument_types": "internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gtrgm_same",
    "argument_types": "gtrgm, gtrgm, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "gtrgm_union",
    "argument_types": "internal, internal",
    "return_type": "gtrgm",
    "function_description": null
  },
  {
    "function_name": "is_duplicate_detainee",
    "argument_types": "p_full_name text, p_date_of_detention date, p_last_seen_location text, p_detention_facility text, p_physical_description text, p_age_at_detention integer, p_gender text, p_status text, p_contact_info text, p_additional_notes text",
    "return_type": "boolean",
    "function_description": null
  },
  {
    "function_name": "log_document_changes",
    "argument_types": "",
    "return_type": "trigger",
    "function_description": null
  },
  {
    "function_name": "normalize_arabic_text",
    "argument_types": "input_text text",
    "return_type": "text",
    "function_description": null
  },
  {
    "function_name": "normalize_detainee_fields",
    "argument_types": "",
    "return_type": "trigger",
    "function_description": null
  },
  {
    "function_name": "normalize_name",
    "argument_types": "name text",
    "return_type": "text",
    "function_description": null
  },
  {
    "function_name": "normalize_word",
    "argument_types": "input_text text",
    "return_type": "text",
    "function_description": null
  },
  {
    "function_name": "process_search_query",
    "argument_types": "search_query text",
    "return_type": "TABLE(tsquery tsquery, gender text, non_gender_words text[])",
    "function_description": null
  },
  {
    "function_name": "refresh_mv_detainees_search",
    "argument_types": "",
    "return_type": "void",
    "function_description": null
  },
  {
    "function_name": "search_detainees",
    "argument_types": "search_query text DEFAULT NULL::text, status_filter text DEFAULT NULL::text, gender_filter text DEFAULT NULL::text, age_min integer DEFAULT NULL::integer, age_max integer DEFAULT NULL::integer, location_filter text DEFAULT NULL::text",
    "return_type": "TABLE(id uuid, full_name text, date_of_detention timestamp with time zone, last_seen_location text, detention_facility text, physical_description text, age_at_detention integer, gender text, status text, last_update_date timestamp with time zone, contact_info text, additional_notes text, created_at timestamp with time zone, search_rank real)",
    "function_description": null
  },
  {
    "function_name": "search_detainees",
    "argument_types": "search_query text",
    "return_type": "TABLE(id uuid, full_name text, date_of_detention date, last_seen_location text, detention_facility text, physical_description text, age_at_detention integer, gender text, status text, last_update_date timestamp with time zone, contact_info text, additional_notes text, created_at timestamp with time zone, search_rank real)",
    "function_description": null
  },
  {
    "function_name": "search_detainees",
    "argument_types": "search_text text, max_results integer DEFAULT 10",
    "return_type": "TABLE(id uuid, full_name text, last_seen_location text, status text, gender text, age_at_detention integer, date_of_detention date, notes text, detention_facility text, physical_description text, search_rank real)",
    "function_description": null
  },
  {
    "function_name": "search_detainees",
    "argument_types": "search_text text DEFAULT NULL::text, detention_start_date date DEFAULT NULL::date, detention_end_date date DEFAULT NULL::date, detainee_status text DEFAULT NULL::text, location text DEFAULT NULL::text, gender_filter text DEFAULT NULL::text, age_min integer DEFAULT NULL::integer, age_max integer DEFAULT NULL::integer",
    "return_type": "TABLE(id uuid, full_name text, date_of_detention date, last_seen_location text, detention_facility text, status text, gender text, age_at_detention integer, last_update_date timestamp with time zone, search_rank double precision)",
    "function_description": null
  },
  {
    "function_name": "search_detainees_advanced",
    "argument_types": "search_text text DEFAULT NULL::text, location_text text DEFAULT NULL::text, status_text text DEFAULT NULL::text, gender_filter text DEFAULT NULL::text, min_age integer DEFAULT NULL::integer, max_age integer DEFAULT NULL::integer, detention_date_start date DEFAULT NULL::date, detention_date_end date DEFAULT NULL::date",
    "return_type": "TABLE(id uuid, full_name text, date_of_detention date, last_seen_location text, detention_facility text, physical_description text, age_at_detention integer, gender text, status text, last_update_date timestamp with time zone, contact_info text, additional_notes text, created_at timestamp with time zone, search_rank real, name_similarity real)",
    "function_description": null
  },
  {
    "function_name": "search_detainees_enhanced",
    "argument_types": "search_params jsonb",
    "return_type": "jsonb",
    "function_description": null
  },
  {
    "function_name": "search_detainees_v2",
    "argument_types": "search_query text, page_size integer DEFAULT 20, cursor_id text DEFAULT NULL::text, cursor_rank double precision DEFAULT NULL::double precision, cursor_date timestamp without time zone DEFAULT NULL::timestamp without time zone, estimate_total boolean DEFAULT true",
    "return_type": "TABLE(results jsonb, total_count bigint)",
    "function_description": null
  },
  {
    "function_name": "segment_words",
    "argument_types": "input_text text",
    "return_type": "text[]",
    "function_description": null
  },
  {
    "function_name": "set_limit",
    "argument_types": "real",
    "return_type": "real",
    "function_description": null
  },
  {
    "function_name": "show_limit",
    "argument_types": "",
    "return_type": "real",
    "function_description": null
  },
  {
    "function_name": "show_trgm",
    "argument_types": "text",
    "return_type": "text[]",
    "function_description": null
  },
  {
    "function_name": "similarity",
    "argument_types": "text, text",
    "return_type": "real",
    "function_description": null
  },
  {
    "function_name": "similarity_dist",
    "argument_types": "text, text",
    "return_type": "real",
    "function_description": null
  },
  {
    "function_name": "similarity_op",
    "argument_types": "text, text",
    "return_type": "boolean",
    "function_description": null
  },
  {
    "function_name": "strict_word_similarity",
    "argument_types": "text, text",
    "return_type": "real",
    "function_description": null
  },
  {
    "function_name": "strict_word_similarity_commutator_op",
    "argument_types": "text, text",
    "return_type": "boolean",
    "function_description": null
  },
  {
    "function_name": "strict_word_similarity_dist_commutator_op",
    "argument_types": "text, text",
    "return_type": "real",
    "function_description": null
  },
  {
    "function_name": "strict_word_similarity_dist_op",
    "argument_types": "text, text",
    "return_type": "real",
    "function_description": null
  },
  {
    "function_name": "strict_word_similarity_op",
    "argument_types": "text, text",
    "return_type": "boolean",
    "function_description": null
  },
  {
    "function_name": "trigger_refresh_mv_detainees_search",
    "argument_types": "",
    "return_type": "trigger",
    "function_description": null
  },
  {
    "function_name": "unaccent",
    "argument_types": "regdictionary, text",
    "return_type": "text",
    "function_description": null
  },
  {
    "function_name": "unaccent",
    "argument_types": "text",
    "return_type": "text",
    "function_description": null
  },
  {
    "function_name": "unaccent_init",
    "argument_types": "internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "unaccent_lexize",
    "argument_types": "internal, internal, internal, internal",
    "return_type": "internal",
    "function_description": null
  },
  {
    "function_name": "update_csv_upload_progress",
    "argument_types": "session_id uuid, processed integer, skipped integer, status_update upload_status_enum DEFAULT NULL::upload_status_enum, error_msg text DEFAULT NULL::text, details jsonb DEFAULT NULL::jsonb",
    "return_type": "void",
    "function_description": null
  },
  {
    "function_name": "update_detainee_search_vector",
    "argument_types": "",
    "return_type": "trigger",
    "function_description": null
  },
  {
    "function_name": "update_document_progress",
    "argument_types": "doc_id uuid, processed integer, skipped integer, status_update text DEFAULT NULL::text, error_msg text DEFAULT NULL::text, details jsonb DEFAULT NULL::jsonb",
    "return_type": "void",
    "function_description": null
  },
  {
    "function_name": "update_updated_at_column",
    "argument_types": "",
    "return_type": "trigger",
    "function_description": null
  },
  {
    "function_name": "update_upload_progress",
    "argument_types": "session_id uuid, processed integer, skipped integer, status_update upload_status_enum DEFAULT NULL::upload_status_enum, error_msg text DEFAULT NULL::text, details jsonb DEFAULT NULL::jsonb",
    "return_type": "void",
    "function_description": null
  },
  {
    "function_name": "update_upload_session_timestamp",
    "argument_types": "",
    "return_type": "trigger",
    "function_description": null
  },
  {
    "function_name": "word_similarity",
    "argument_types": "text, text",
    "return_type": "real",
    "function_description": null
  },
  {
    "function_name": "word_similarity_commutator_op",
    "argument_types": "text, text",
    "return_type": "boolean",
    "function_description": null
  },
  {
    "function_name": "word_similarity_dist_commutator_op",
    "argument_types": "text, text",
    "return_type": "real",
    "function_description": null
  },
  {
    "function_name": "word_similarity_dist_op",
    "argument_types": "text, text",
    "return_type": "real",
    "function_description": null
  },
  {
    "function_name": "word_similarity_op",
    "argument_types": "text, text",
    "return_type": "boolean",
    "function_description": null
  }
]
SELECT 
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'search_detainees_enhanced'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
[
  {
    "function_definition": "CREATE OR REPLACE FUNCTION public.search_detainees_enhanced(search_params jsonb)\n RETURNS jsonb\n LANGUAGE plpgsql\n STABLE\nAS $function$\r\nDECLARE\r\n    query_text text;\r\n    normalized_query text;\r\n    page_size int;\r\n    page_number int;\r\n    estimate_total boolean;\r\n    filter_status text;\r\n    filter_gender text;\r\n    filter_date_from date;\r\n    filter_date_to date;\r\n    filter_age_min int;\r\n    filter_age_max int;\r\n    filter_location text;\r\n    filter_facility text;\r\n    total_count int;\r\n    search_results JSONB;\r\nBEGIN\r\n    -- Extract parameters with defaults\r\n    query_text := search_params->>'query';\r\n    page_size := COALESCE((search_params->>'pageSize')::int, 20);\r\n    page_number := COALESCE((search_params->>'pageNumber')::int, 1);\r\n    estimate_total := COALESCE((search_params->>'estimateTotal')::boolean, true);\r\n    \r\n    -- Extract filter parameters\r\n    filter_status := search_params->>'detentionStatus';\r\n    filter_gender := search_params->>'gender';\r\n    filter_date_from := (search_params->>'dateFrom')::date;\r\n    filter_date_to := (search_params->>'dateTo')::date;\r\n    filter_age_min := (search_params->>'ageMin')::int;\r\n    filter_age_max := (search_params->>'ageMax')::int;\r\n    filter_location := search_params->>'location';\r\n    filter_facility := search_params->>'facility';\r\n    \r\n    -- Return empty result if query doesn't contain Arabic\r\n    IF query_text IS NOT NULL AND NOT contains_arabic(query_text) THEN\r\n        RETURN jsonb_build_object(\r\n            'results', '[]'::jsonb,\r\n            'totalCount', 0,\r\n            'pageSize', page_size,\r\n            'currentPage', page_number,\r\n            'totalPages', 0,\r\n            'hasNextPage', false,\r\n            'hasPreviousPage', false\r\n        );\r\n    END IF;\r\n\r\n    normalized_query := normalize_arabic_text(query_text);\r\n    \r\n    WITH base_results AS (\r\n        SELECT \r\n            d.*,\r\n            CASE \r\n                WHEN query_text IS NOT NULL THEN\r\n                    GREATEST(\r\n                        ts_rank(name_fts, to_tsquery('arabic', normalized_query)),\r\n                        ts_rank(location_fts, to_tsquery('arabic', normalized_query)),\r\n                        ts_rank(description_fts, to_tsquery('arabic', normalized_query))\r\n                    )\r\n                ELSE 1.0  -- Default rank when no query\r\n            END as rank_score\r\n        FROM detainees d\r\n        WHERE \r\n            -- Text search condition (only if query_text is provided)\r\n            (\r\n                query_text IS NULL OR \r\n                name_fts @@ to_tsquery('arabic', normalized_query) OR\r\n                location_fts @@ to_tsquery('arabic', normalized_query) OR\r\n                description_fts @@ to_tsquery('arabic', normalized_query)\r\n            )\r\n            -- Filter conditions (applied independently of text search)\r\n            AND (filter_status IS NULL OR status::text = filter_status)\r\n            AND (filter_gender IS NULL OR gender::text = filter_gender)\r\n            AND (filter_date_from IS NULL OR date_of_detention >= filter_date_from)\r\n            AND (filter_date_to IS NULL OR date_of_detention <= filter_date_to)\r\n            AND (filter_age_min IS NULL OR age_at_detention >= filter_age_min)\r\n            AND (filter_age_max IS NULL OR age_at_detention <= filter_age_max)\r\n            AND (filter_location IS NULL OR normalize_arabic_text(last_seen_location) LIKE '%' || normalize_arabic_text(filter_location) || '%')\r\n            AND (filter_facility IS NULL OR normalize_arabic_text(detention_facility) LIKE '%' || normalize_arabic_text(filter_facility) || '%')\r\n    ),\r\n    ranked_results AS (\r\n        SELECT *\r\n        FROM base_results\r\n        ORDER BY \r\n            CASE \r\n                WHEN query_text IS NOT NULL THEN rank_score\r\n                ELSE 0.0  -- When no query, don't order by rank\r\n            END DESC,\r\n            date_of_detention DESC NULLS LAST\r\n        LIMIT page_size\r\n        OFFSET (page_number - 1) * page_size\r\n    )\r\n    SELECT \r\n        jsonb_build_object(\r\n            'results', COALESCE((\r\n                SELECT jsonb_agg(\r\n                    jsonb_build_object(\r\n                        'id', r.id,\r\n                        'full_name', r.full_name,\r\n                        'original_name', r.original_name,\r\n                        'gender', r.gender,\r\n                        'status', r.status,\r\n                        'age_at_detention', r.age_at_detention,\r\n                        'date_of_detention', r.date_of_detention,\r\n                        'detention_facility', r.detention_facility,\r\n                        'last_seen_location', r.last_seen_location,\r\n                        'physical_description', r.physical_description,\r\n                        'additional_notes', r.additional_notes,\r\n                        'contact_info', r.contact_info,\r\n                        'created_at', r.created_at,\r\n                        'last_update_date', r.last_update_date,\r\n                        'source_organization', r.source_organization,\r\n                        'search_rank', r.rank_score\r\n                    )\r\n                )\r\n                FROM ranked_results r\r\n            ), '[]'::jsonb),\r\n            'totalCount', COALESCE((\r\n                SELECT COUNT(*)\r\n                FROM base_results\r\n            ), 0),\r\n            'pageSize', page_size,\r\n            'currentPage', page_number,\r\n            'totalPages', CASE \r\n                WHEN total_count IS NULL THEN 1\r\n                ELSE CEIL(total_count::float / page_size)\r\n            END,\r\n            'hasNextPage', EXISTS (\r\n                SELECT 1 FROM ranked_results OFFSET page_size LIMIT 1\r\n            ),\r\n            'hasPreviousPage', page_number > 1\r\n        ) INTO search_results;\r\n\r\n    RETURN search_results;\r\nEND;\r\n$function$\n"
  }
]
SELECT 
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public';
Success. No rows returned