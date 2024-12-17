1. list all materialized views:
| schemaname | matviewname         | matviewowner | tablespace | hasindexes |
| ---------- | ------------------- | ------------ | ---------- | ---------- |
| public     | detainees_search_mv | postgres     |            | true       |
2. To check if there are any indexes on the materialized views:
| schema_name | matview_name        | index_name                               | column_name       |
| ----------- | ------------------- | ---------------------------------------- | ----------------- |
| public      | detainees_search_mv | idx_detainees_search_mv_age              | age_at_detention  |
| public      | detainees_search_mv | idx_detainees_search_mv_date             | date_of_detention |
| public      | detainees_search_mv | idx_detainees_search_mv_facility_trigram | facility_trigrams |
| public      | detainees_search_mv | idx_detainees_search_mv_fts              | fts_document      |
| public      | detainees_search_mv | idx_detainees_search_mv_gender           | gender            |
| public      | detainees_search_mv | idx_detainees_search_mv_id               | id                |
| public      | detainees_search_mv | idx_detainees_search_mv_location_trigram | location_trigrams |
| public      | detainees_search_mv | idx_detainees_search_mv_name_lower       | name_lower        |
| public      | detainees_search_mv | idx_detainees_search_mv_name_trigram     | name_trigrams     |
| public      | detainees_search_mv | idx_detainees_search_mv_status           | status            |
3. Check the materialized view definition:
| definition 
|  WITH processed_detainees AS (
         SELECT detainees.id,
            detainees.full_name,
            lower(detainees.full_name) AS name_lower,
            detainees.date_of_detention,
            detainees.last_seen_location,
            lower(detainees.last_seen_location) AS location_lower,
            detainees.detention_facility,
            lower(detainees.detention_facility) AS facility_lower,
            detainees.physical_description,
            detainees.age_at_detention,
            detainees.gender,
            detainees.status,
            detainees.last_update_date,
            detainees.contact_info,
            detainees.additional_notes,
            detainees.created_at,
            ((((setweight(to_tsvector('arabic'::regconfig, COALESCE(unaccent(detainees.full_name), ''::text)), 'A'::"char") || setweight(to_tsvector('arabic'::regconfig, COALESCE(unaccent(detainees.last_seen_location), ''::text)), 'B'::"char")) || setweight(to_tsvector('arabic'::regconfig, COALESCE(unaccent(detainees.detention_facility), ''::text)), 'B'::"char")) || setweight(to_tsvector('arabic'::regconfig, COALESCE(unaccent(detainees.physical_description), ''::text)), 'C'::"char")) || setweight(to_tsvector('arabic'::regconfig, COALESCE(unaccent(detainees.additional_notes), ''::text)), 'D'::"char")) AS fts_document,
            lower(unaccent(detainees.full_name)) AS name_trigrams,
            lower(unaccent(detainees.last_seen_location)) AS location_trigrams,
            lower(unaccent(detainees.detention_facility)) AS facility_trigrams
           FROM detainees
        )
 SELECT processed_detainees.id,
    processed_detainees.full_name,
    processed_detainees.name_lower,
    processed_detainees.date_of_detention,
    processed_detainees.last_seen_location,
    processed_detainees.location_lower,
    processed_detainees.detention_facility,
    processed_detainees.facility_lower,
    processed_detainees.physical_description,
    processed_detainees.age_at_detention,
    processed_detainees.gender,
    processed_detainees.status,
    processed_detainees.last_update_date,
    processed_detainees.contact_info,
    processed_detainees.additional_notes,
    processed_detainees.created_at,
    processed_detainees.fts_document,
    processed_detainees.name_trigrams,
    processed_detainees.location_trigrams,
    processed_detainees.facility_trigrams
   FROM processed_detainees; |
   4. Check the refresh strategy:
| relname             | reloptions |
| ------------------- | ---------- |
| detainees_search_mv |            |