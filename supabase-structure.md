1. Show all tables and their details:

| table_schema | table_name | column_count |
| ------------ | ---------- | ------------ |
| public       | detainees  | 14           |
| public       | documents  | 11           |

2. Show detailed information about the detainees table:

| column_name          | data_type                | character_maximum_length | column_default    | is_nullable |
| -------------------- | ------------------------ | ------------------------ | ----------------- | ----------- |
| id                   | uuid                     |                          | gen_random_uuid() | NO          |
| full_name            | text                     |                          |                   | NO          |
| date_of_detention    | date                     |                          |                   | YES         |
| last_seen_location   | text                     |                          |                   | NO          |
| detention_facility   | text                     |                          |                   | YES         |
| physical_description | text                     |                          |                   | YES         |
| age_at_detention     | integer                  |                          |                   | YES         |
| gender               | text                     |                          |                   | YES         |
| status               | text                     |                          | 'missing'::text   | YES         |
| last_update_date     | timestamp with time zone |                          | CURRENT_TIMESTAMP | YES         |
| contact_info         | text                     |                          |                   | NO          |
| additional_notes     | text                     |                          |                   | YES         |
| created_at           | timestamp with time zone |                          | CURRENT_TIMESTAMP | YES         |
| search_vector        | tsvector                 |                          |                   | YES         |
3. Check indexes including the full-text search index:
| schemaname | tablename           | indexname                                | indexdef                                                                                                                                          |
| ---------- | ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| public     | detainees           | detainees_age_idx                        | CREATE INDEX detainees_age_idx ON public.detainees USING btree (age_at_detention)                                                                 |
| public     | detainees           | detainees_composite_idx                  | CREATE INDEX detainees_composite_idx ON public.detainees USING btree (status, gender, date_of_detention)                                          |
| public     | detainees           | detainees_facility_gin_idx               | CREATE INDEX detainees_facility_gin_idx ON public.detainees USING gin (to_tsvector('english'::regconfig, COALESCE(detention_facility, ''::text))) |
| public     | detainees           | detainees_facility_idx                   | CREATE INDEX detainees_facility_idx ON public.detainees USING gin (to_tsvector('english'::regconfig, COALESCE(detention_facility, ''::text)))     |
| public     | detainees           | detainees_full_name_gin_idx              | CREATE INDEX detainees_full_name_gin_idx ON public.detainees USING gin (to_tsvector('english'::regconfig, COALESCE(full_name, ''::text)))         |
| public     | detainees           | detainees_full_name_idx                  | CREATE INDEX detainees_full_name_idx ON public.detainees USING gin (to_tsvector('english'::regconfig, COALESCE(full_name, ''::text)))             |
| public     | detainees           | detainees_full_name_prefix_idx           | CREATE INDEX detainees_full_name_prefix_idx ON public.detainees USING gin (full_name gin_trgm_ops)                                                |
| public     | detainees           | detainees_full_name_trigram_idx          | CREATE INDEX detainees_full_name_trigram_idx ON public.detainees USING gin (full_name gin_trgm_ops)                                               |
| public     | detainees           | detainees_gender_hash_idx                | CREATE INDEX detainees_gender_hash_idx ON public.detainees USING hash (gender)                                                                    |
| public     | detainees           | detainees_gender_idx                     | CREATE INDEX detainees_gender_idx ON public.detainees USING btree (gender)                                                                        |
| public     | detainees           | detainees_location_gin_idx               | CREATE INDEX detainees_location_gin_idx ON public.detainees USING gin (to_tsvector('english'::regconfig, COALESCE(last_seen_location, ''::text))) |
| public     | detainees           | detainees_location_idx                   | CREATE INDEX detainees_location_idx ON public.detainees USING gin (to_tsvector('english'::regconfig, COALESCE(last_seen_location, ''::text)))     |
| public     | detainees           | detainees_pkey                           | CREATE UNIQUE INDEX detainees_pkey ON public.detainees USING btree (id)                                                                           |
| public     | detainees           | detainees_search_vector_idx              | CREATE INDEX detainees_search_vector_idx ON public.detainees USING gin (search_vector)                                                            |
| public     | detainees           | detainees_status_hash_idx                | CREATE INDEX detainees_status_hash_idx ON public.detainees USING hash (status)                                                                    |
| public     | detainees           | detainees_status_idx                     | CREATE INDEX detainees_status_idx ON public.detainees USING btree (status)                                                                        |
| public     | detainees           | detainees_update_date_idx                | CREATE INDEX detainees_update_date_idx ON public.detainees USING btree (last_update_date DESC)                                                    |
| public     | detainees           | idx_detainees_date_of_detention          | CREATE INDEX idx_detainees_date_of_detention ON public.detainees USING btree (date_of_detention)                                                  |
| public     | detainees           | idx_detainees_facility_btree             | CREATE INDEX idx_detainees_facility_btree ON public.detainees USING btree (lower(COALESCE(detention_facility, ''::text)))                         |
| public     | detainees           | idx_detainees_full_name                  | CREATE INDEX idx_detainees_full_name ON public.detainees USING btree (full_name)                                                                  |
| public     | detainees           | idx_detainees_location_btree             | CREATE INDEX idx_detainees_location_btree ON public.detainees USING btree (lower(last_seen_location))                                             |
| public     | detainees           | idx_detainees_location_gin               | CREATE INDEX idx_detainees_location_gin ON public.detainees USING gin (to_tsvector('simple'::regconfig, COALESCE(last_seen_location, ''::text)))  |
| public     | detainees           | idx_detainees_name_btree                 | CREATE INDEX idx_detainees_name_btree ON public.detainees USING btree (lower(full_name))                                                          |
| public     | detainees           | idx_detainees_name_gin                   | CREATE INDEX idx_detainees_name_gin ON public.detainees USING gin (to_tsvector('simple'::regconfig, full_name))                                   |
| public     | detainees           | idx_detainees_status                     | CREATE INDEX idx_detainees_status ON public.detainees USING btree (status)                                                                        |
| public     | detainees_search_mv | idx_detainees_search_mv_age              | CREATE INDEX idx_detainees_search_mv_age ON public.detainees_search_mv USING btree (age_at_detention)                                             |
| public     | detainees_search_mv | idx_detainees_search_mv_date             | CREATE INDEX idx_detainees_search_mv_date ON public.detainees_search_mv USING btree (date_of_detention)                                           |
| public     | detainees_search_mv | idx_detainees_search_mv_facility_trigram | CREATE INDEX idx_detainees_search_mv_facility_trigram ON public.detainees_search_mv USING gist (facility_trigrams gist_trgm_ops)                  |
| public     | detainees_search_mv | idx_detainees_search_mv_fts              | CREATE INDEX idx_detainees_search_mv_fts ON public.detainees_search_mv USING gin (fts_document)                                                   |
| public     | detainees_search_mv | idx_detainees_search_mv_gender           | CREATE INDEX idx_detainees_search_mv_gender ON public.detainees_search_mv USING btree (gender)                                                    |
| public     | detainees_search_mv | idx_detainees_search_mv_id               | CREATE UNIQUE INDEX idx_detainees_search_mv_id ON public.detainees_search_mv USING btree (id)                                                     |
| public     | detainees_search_mv | idx_detainees_search_mv_location_trigram | CREATE INDEX idx_detainees_search_mv_location_trigram ON public.detainees_search_mv USING gist (location_trigrams gist_trgm_ops)                  |
| public     | detainees_search_mv | idx_detainees_search_mv_name_lower       | CREATE INDEX idx_detainees_search_mv_name_lower ON public.detainees_search_mv USING hash (name_lower)                                             |
| public     | detainees_search_mv | idx_detainees_search_mv_name_trigram     | CREATE INDEX idx_detainees_search_mv_name_trigram ON public.detainees_search_mv USING gist (name_trigrams gist_trgm_ops)                          |
| public     | detainees_search_mv | idx_detainees_search_mv_status           | CREATE INDEX idx_detainees_search_mv_status ON public.detainees_search_mv USING btree (status)                                                    |
| public     | documents           | documents_pkey                           | CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id)                                                                           |
| public     | documents           | idx_documents_detainee_id                | CREATE INDEX idx_documents_detainee_id ON public.documents USING btree (detainee_id)                                                              |
| public     | documents           | idx_documents_document_type              | CREATE INDEX idx_documents_document_type ON public.documents USING btree (document_type)                                                          |
| public     | documents           | idx_documents_submission_date            | CREATE INDEX idx_documents_submission_date ON public.documents USING btree (submission_date)                                                      |

4. Sample some data from the detainees table:

| id                                   | full_name             | date_of_detention | last_seen_location                      | detention_facility      | physical_description                                                   | age_at_detention | gender | status   | last_update_date              | contact_info                                            | additional_notes                                                 | created_at                    | search_vector                                                                                                      |
| ------------------------------------ | --------------------- | ----------------- | --------------------------------------- | ----------------------- | ---------------------------------------------------------------------- | ---------------- | ------ | -------- | ----------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 9e7546b5-d3cf-4f68-be71-85bb6e960649 | Ahmad Mohammed Ali    | 2012-03-15        | Damascus, Syria - Mezzeh District       | Sednaya Prison          | Height: 175cm, Build: Medium, Distinguishing marks: Scar on left cheek | 28               | male   | missing  | 2024-12-14 23:30:57.624986+00 | Contact: Sister - Sarah Ali (+961 XX XXX XXX)           | Last seen being taken from his home by security forces           | 2024-12-14 23:30:57.624986+00 | 'ahmad':1A 'ali':3A 'damascus':4B 'district':7B 'mezzeh':6B 'mohammed':2A 'syria':5B                               |
| 1c19dfdb-b2d1-475a-9d66-66d556f31e7a | Fatima Khalil Ibrahim | 2013-07-22        | Aleppo, Syria - Al-Sukkari neighborhood | Branch 215              | Height: 162cm, Build: Slim, Long black hair                            | 35               | female | missing  | 2024-12-14 23:30:57.624986+00 | Contact: Brother - Mohammed Ibrahim (email@example.com) | Was arrested at a checkpoint while trying to reach her workplace | 2024-12-14 23:30:57.624986+00 | 'al':7B 'al-sukkari':6B 'aleppo':4B 'fatima':1A 'ibrahim':3A 'khalil':2A 'neighborhood':9B 'sukkari':8B 'syria':5B |
| 2cf6b0a1-8433-43c0-9671-929877697809 | Omar Hassan Nouri     | 2011-09-10        | Homs, Syria - Old City                  | Unknown                 | Height: 180cm, Build: Athletic, Short brown hair                       | 42               | male   | released | 2024-12-14 23:30:57.624986+00 | Contact: Wife - Aisha Nouri (+963 XX XXX XXX)           | Released in 2015 through a prisoner exchange program             | 2024-12-14 23:30:57.624986+00 | 'city':7B 'hassan':2A 'homs':4B 'nouri':3A 'old':6B 'omar':1A 'syria':5B                                           |
| 05cc7754-a552-44ed-b8c5-7360534b1501 | Asem Alakabani        | 2011-12-16        | Latakia                                 | air forces intelligence | tall                                                                   | 20               | male   | missing  | 2024-12-15 12:46:54.768+00    | example@email.com                                       | test                                                             | 2024-12-15 12:46:54.768+00    | 'alakabani':2A 'asem':1A 'latakia':3B                                                                              |
| 04d72216-e12d-49d0-aaa7-c77869137ab1 | Sara                  | 2014-11-19        | Damascus                                | unknown                 | test                                                                   | 17               | female | missing  | 2024-12-15 14:27:35.163+00    | test                                                    | test                                                             | 2024-12-15 14:27:35.164+00    | 'damascus':2B 'sara':1A                                                                                            |
5. Check if full-text search is working:
-- Drop existing trigger if any
DROP TRIGGER IF EXISTS detainees_search_vector_update ON detainees;

-- First, drop the existing generated column if it exists
ALTER TABLE IF EXISTS detainees 
DROP COLUMN IF EXISTS search_vector;

-- Add the search_vector column as a generated column
ALTER TABLE detainees
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
    to_tsvector('english',
        coalesce(full_name, '') || ' ' ||
        coalesce(last_seen_location, '') || ' ' ||
        coalesce(detention_facility, '') || ' ' ||
        coalesce(physical_description, '') || ' ' ||
        coalesce(gender, '') || ' ' ||
        coalesce(status, '') || ' ' ||
        coalesce(additional_notes, '')
    )
) STORED;

-- Create index on the search vector
CREATE INDEX IF NOT EXISTS idx_detainees_search_vector 
ON detainees USING gin(search_vector);

-- Create a view for basic search functionality
CREATE OR REPLACE VIEW detainees_search AS
SELECT
    id,
    full_name,
    date_of_detention,
    last_seen_location,
    detention_facility,
    physical_description,
    age_at_detention,
    gender,
    status,
    last_update_date,
    contact_info,
    additional_notes,
    created_at,
    search_vector
FROM detainees;

-- Test queries using direct text search
-- Basic search for a name
SELECT * FROM detainees_search
WHERE search_vector @@ to_tsquery('english', 'asem');

-- Search for multiple terms (OR)
SELECT * FROM detainees_search
WHERE search_vector @@ to_tsquery('english', 'asem | sara');

-- Search with location and status
SELECT * FROM detainees_search
WHERE search_vector @@ to_tsquery('english', 'damascus & missing');

-- Complex search with ranking
SELECT 
    *,
    ts_rank(search_vector, to_tsquery('english', 'asem | sara')) as rank
FROM detainees_search
WHERE search_vector @@ to_tsquery('english', 'asem | sara')
ORDER BY rank DESC;

6. Show table row counts:
| schemaname | relname             | n_live_tup |
| ---------- | ------------------- | ---------- |
| public     | detainees           | 10         |
| public     | detainees_search_mv | 10         |
| public     | documents           | 6          |