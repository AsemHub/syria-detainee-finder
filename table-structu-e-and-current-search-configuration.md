-- Check table structure and generated columns
outpit:
| column_name          | data_type                | is_generated | generation_expression                                                                                                                                                                                                                                                                                  |
| -------------------- | ------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| id                   | uuid                     | NEVER        |                                                                                                                                                                                                                                                                                                        |
| full_name            | text                     | NEVER        |                                                                                                                                                                                                                                                                                                        |
| date_of_detention    | date                     | NEVER        |                                                                                                                                                                                                                                                                                                        |
| last_seen_location   | text                     | NEVER        |                                                                                                                                                                                                                                                                                                        |
| detention_facility   | text                     | NEVER        |                                                                                                                                                                                                                                                                                                        |
| physical_description | text                     | NEVER        |                                                                                                                                                                                                                                                                                                        |
| age_at_detention     | integer                  | NEVER        |                                                                                                                                                                                                                                                                                                        |
| last_update_date     | timestamp with time zone | NEVER        |                                                                                                                                                                                                                                                                                                        |
| contact_info         | text                     | NEVER        |                                                                                                                                                                                                                                                                                                        |
| additional_notes     | text                     | NEVER        |                                                                                                                                                                                                                                                                                                        |
| created_at           | timestamp with time zone | NEVER        |                                                                                                                                                                                                                                                                                                        |
| source_organization  | text                     | NEVER        |                                                                                                                                                                                                                                                                                                        |
| source_document_id   | uuid                     | NEVER        |                                                                                                                                                                                                                                                                                                        |
| gender               | USER-DEFINED             | NEVER        |                                                                                                                                                                                                                                                                                                        |
| status               | USER-DEFINED             | NEVER        |                                                                                                                                                                                                                                                                                                        |
| search_vector        | tsvector                 | ALWAYS       | ((setweight(to_tsvector('english'::regconfig, COALESCE(full_name, ''::text)), 'A'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(last_seen_location, ''::text)), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, COALESCE(detention_facility, ''::text)), 'B'::"char")) |
-- Check the current search_vector definition
| generation_expression                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ((setweight(to_tsvector('english'::regconfig, COALESCE(full_name, ''::text)), 'A'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(last_seen_location, ''::text)), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, COALESCE(detention_facility, ''::text)), 'B'::"char")) |
-- Check existing text search configurations
| cfgname    | prsname |
| ---------- | ------- |
| simple     | default |
| arabic     | default |
| armenian   | default |
| basque     | default |
| catalan    | default |
| danish     | default |
| dutch      | default |
| english    | default |
| finnish    | default |
| french     | default |
| german     | default |
| greek      | default |
| hindi      | default |
| hungarian  | default |
| indonesian | default |
| irish      | default |
| italian    | default |
| lithuanian | default |
| nepali     | default |
| norwegian  | default |
| portuguese | default |
| romanian   | default |
| russian    | default |
| serbian    | default |
| spanish    | default |
| swedish    | default |
| tamil      | default |
| turkish    | default |
| yiddish    | default |
| arabic     | default |
-- Check table constraints
| conname                | pg_get_constraintdef                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| detainees_age_check    | CHECK (((age_at_detention IS NULL) OR ((age_at_detention >= 0) AND (age_at_detention <= 120)))) |
| detainees_pkey         | PRIMARY KEY (id)                                                                                |
| unique_detainee_record | UNIQUE (full_name, date_of_detention)                                                           |
-- Check foreign key relationships
| table_schema | constraint_name                     | table_name         | column_name | foreign_table_schema | foreign_table_name | foreign_column_name |
| ------------ | ----------------------------------- | ------------------ | ----------- | -------------------- | ------------------ | ------------------- |
| public       | csv_upload_records_detainee_id_fkey | csv_upload_records | detainee_id | public               | detainees          | id                  |
-- Check materialized view definition
| definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  SELECT d.id,
    d.full_name AS name,
    NULL::text AS name_ar,
    d.last_seen_location AS location,
    NULL::text AS location_ar,
    d.detention_facility AS facility,
    NULL::text AS facility_ar,
    d.status,
    d.gender,
    d.date_of_detention,
    d.age_at_detention,
    d.last_update_date,
    lower(COALESCE(d.full_name, ''::text)) AS name_lower,
    ''::text AS name_ar_lower,
    lower(COALESCE(d.last_seen_location, ''::text)) AS location_lower,
    ''::text AS location_ar_lower,
    lower(COALESCE(d.detention_facility, ''::text)) AS facility_lower,
    ''::text AS facility_ar_lower,
    lower(COALESCE(d.full_name, ''::text)) AS name_trigrams,
    ''::text AS name_ar_trigrams,
    lower(COALESCE(d.last_seen_location, ''::text)) AS location_trigrams,
    ''::text AS location_ar_trigrams,
    lower(COALESCE(d.detention_facility, ''::text)) AS facility_trigrams,
    ''::text AS facility_ar_trigrams,
    to_tsvector('simple'::regconfig, ''::text) AS arabic_fts_document,
    ((setweight(to_tsvector('english'::regconfig, COALESCE(d.full_name, ''::text)), 'A'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(d.last_seen_location, ''::text)), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, COALESCE(d.detention_facility, ''::text)), 'C'::"char")) AS english_fts_document
   FROM detainees d; |