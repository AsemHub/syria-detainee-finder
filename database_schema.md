1. SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

[
  {
    "table_name": "detainee_stats"
  },
  {
    "table_name": "upload_sessions"
  },
  {
    "table_name": "csv_upload_records"
  },
  {
    "table_name": "validation_feedback"
  },
  {
    "table_name": "detainees"
  }
]

2. SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'detainees';

[
  {
    "table_name": "detainees",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "detainees",
    "column_name": "full_name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "original_name",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "date_of_detention",
    "data_type": "date",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "last_seen_location",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "detention_facility",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "physical_description",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "age_at_detention",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "gender",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "contact_info",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "additional_notes",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "detainees",
    "column_name": "last_update_date",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "source_organization",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "search_vector",
    "data_type": "tsvector",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "name_fts",
    "data_type": "tsvector",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "location_fts",
    "data_type": "tsvector",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "description_fts",
    "data_type": "tsvector",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "contact_fts",
    "data_type": "tsvector",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "gender_terms",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "normalized_name",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "detainees",
    "column_name": "effective_date",
    "data_type": "date",
    "is_nullable": "YES",
    "column_default": null
  }
]

3. SELECT tc.table_name, tc.constraint_name, pgc.contype, pg_get_constraintdef(pgc.oid) as constraint_definition
FROM information_schema.table_constraints tc
JOIN pg_constraint pgc ON tc.constraint_name = pgc.conname
WHERE tc.table_schema = 'public' 
AND tc.constraint_type = 'CHECK'
AND tc.table_name = 'detainees';

[
  {
    "table_name": "detainees",
    "constraint_name": "detainees_age_at_detention_check",
    "contype": "c",
    "constraint_definition": "CHECK (((age_at_detention >= 0) AND (age_at_detention <= 120)))"
  },
  {
    "table_name": "detainees",
    "constraint_name": "detainees_check",
    "contype": "c",
    "constraint_definition": "CHECK (((status = ANY (ARRAY['معتقل'::text, 'مفقود'::text, 'مغيب قسراً'::text, 'مطلق سراح'::text, 'متوفى'::text, 'غير معروف'::text])) AND (gender = ANY (ARRAY['ذكر'::text, 'أنثى'::text, 'غير معروف'::text])) AND ((age_at_detention IS NULL) OR ((age_at_detention >= 0) AND (age_at_detention <= 120)))))"
  },
  {
    "table_name": "detainees",
    "constraint_name": "detainees_date_of_detention_check",
    "contype": "c",
    "constraint_definition": "CHECK ((date_of_detention <= CURRENT_DATE))"
  },
  {
    "table_name": "detainees",
    "constraint_name": "detainees_full_name_check",
    "contype": "c",
    "constraint_definition": "CHECK ((length(full_name) > 0))"
  },
  {
    "table_name": "detainees",
    "constraint_name": "detainees_gender_check",
    "contype": "c",
    "constraint_definition": "CHECK ((gender = ANY (ARRAY['ذكر'::text, 'أنثى'::text, 'غير معروف'::text])))"
  },
  {
    "table_name": "detainees",
    "constraint_name": "detainees_source_organization_check",
    "contype": "c",
    "constraint_definition": "CHECK ((length(source_organization) > 0))"
  },
  {
    "table_name": "detainees",
    "constraint_name": "detainees_status_check",
    "contype": "c",
    "constraint_definition": "CHECK ((status = ANY (ARRAY['معتقل'::text, 'مفقود'::text, 'مغيب قسراً'::text, 'مطلق سراح'::text, 'متوفى'::text, 'غير معروف'::text])))"
  }
]

4. SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'detainees';

[
  {
    "tablename": "detainees",
    "indexname": "unique_detainee_record_normalized",
    "indexdef": "CREATE UNIQUE INDEX unique_detainee_record_normalized ON public.detainees USING btree (normalized_name, effective_date) WHERE (normalized_name IS NOT NULL)"
  },
  {
    "tablename": "detainees",
    "indexname": "idx_detainees_name_fts",
    "indexdef": "CREATE INDEX idx_detainees_name_fts ON public.detainees USING gin (name_fts)"
  },
  {
    "tablename": "detainees",
    "indexname": "idx_detainees_location_fts",
    "indexdef": "CREATE INDEX idx_detainees_location_fts ON public.detainees USING gin (location_fts)"
  },
  {
    "tablename": "detainees",
    "indexname": "idx_detainees_description_fts",
    "indexdef": "CREATE INDEX idx_detainees_description_fts ON public.detainees USING gin (description_fts)"
  },
  {
    "tablename": "detainees",
    "indexname": "idx_detainees_search_vector",
    "indexdef": "CREATE INDEX idx_detainees_search_vector ON public.detainees USING gin (search_vector)"
  },
  {
    "tablename": "detainees",
    "indexname": "detainees_pkey",
    "indexdef": "CREATE UNIQUE INDEX detainees_pkey ON public.detainees USING btree (id)"
  },
  {
    "tablename": "detainees",
    "indexname": "idx_detainees_search_arabic",
    "indexdef": "CREATE INDEX idx_detainees_search_arabic ON public.detainees USING gin (search_vector)"
  }
]

5. SELECT event_object_table, trigger_name, action_timing, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'detainees';

[
  {
    "event_object_table": "detainees",
    "trigger_name": "detainee_search_vector_arabic_update",
    "action_timing": "BEFORE",
    "event_manipulation": "INSERT",
    "action_statement": "EXECUTE FUNCTION update_detainee_search_vector_arabic()"
  },
  {
    "event_object_table": "detainees",
    "trigger_name": "detainee_search_vector_arabic_update",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_detainee_search_vector_arabic()"
  },
  {
    "event_object_table": "detainees",
    "trigger_name": "detainee_validation_arabic_trigger",
    "action_timing": "AFTER",
    "event_manipulation": "INSERT",
    "action_statement": "EXECUTE FUNCTION validate_detainee_record_arabic()"
  },
  {
    "event_object_table": "detainees",
    "trigger_name": "detainee_validation_arabic_trigger",
    "action_timing": "AFTER",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION validate_detainee_record_arabic()"
  }
]