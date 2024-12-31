-- Drop existing tables in reverse order of dependencies
DO $$ 
BEGIN
    -- Drop triggers first
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'detainee_validation_arabic_trigger') THEN
        DROP TRIGGER detainee_validation_arabic_trigger ON detainees;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'detainee_search_vector_arabic_update') THEN
        DROP TRIGGER detainee_search_vector_arabic_update ON detainees;
    END IF;

    -- Drop functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_detainee_record_arabic') THEN
        DROP FUNCTION validate_detainee_record_arabic();
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_detainee_search_vector_arabic') THEN
        DROP FUNCTION update_detainee_search_vector_arabic();
    END IF;

    -- Drop tables
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'validation_feedback') THEN
        DROP TABLE validation_feedback;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'csv_upload_records') THEN
        DROP TABLE csv_upload_records;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'invalid_records') THEN
        DROP TABLE invalid_records;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'detainees') THEN
        DROP TABLE detainees;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'upload_sessions') THEN
        DROP TABLE upload_sessions;
    END IF;
END $$;

-- Enable full-text search extension with Arabic support
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Configure Arabic text search
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_ts_config WHERE cfgname = 'arabic'
    ) THEN
        CREATE TEXT SEARCH CONFIGURATION arabic (COPY = simple);
        ALTER TEXT SEARCH CONFIGURATION arabic
            ALTER MAPPING FOR hword, hword_part, word
            WITH unaccent, arabic_stem;
    END IF;
END $$;

-- Upload Sessions Table (with Arabic validation messages)
CREATE TABLE upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL CHECK (LENGTH(file_name) > 0),
    file_url TEXT CHECK (file_url IS NULL OR file_url ~ '^https?://'),
    file_size BIGINT CHECK (file_size > 0),
    mime_type TEXT CHECK (mime_type IN ('text/csv', 'application/vnd.ms-excel', 'application/csv')),
    uploaded_by TEXT CHECK (LENGTH(uploaded_by) > 0),
    organization TEXT NOT NULL CHECK (LENGTH(organization) > 0),
    total_records INT CHECK (total_records >= 0),
    processed_records INT CHECK (processed_records >= 0),
    valid_records INT CHECK (valid_records >= 0),
    invalid_records INT CHECK (invalid_records >= 0),
    duplicate_records INT CHECK (duplicate_records >= 0),
    skipped_duplicates INT CHECK (skipped_duplicates >= 0),
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    errors JSONB,
    processing_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_update TIMESTAMPTZ,
    current_record TEXT,
    failed_records JSONB,
    completed_at TIMESTAMPTZ
);

-- Detainees Table (with Arabic full-text search and validation)
CREATE TABLE detainees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL CHECK (LENGTH(full_name) > 0),
    original_name TEXT,
    date_of_detention DATE CHECK (date_of_detention <= CURRENT_DATE),
    last_seen_location TEXT,
    detention_facility TEXT,
    physical_description TEXT,
    age_at_detention INT CHECK (age_at_detention BETWEEN 0 AND 120),
    gender TEXT CHECK (gender IN ('ذكر', 'أنثى', 'غير معروف')),
    status TEXT CHECK (status IN ('معتقل', 'مفقود', 'مطلق سراح', 'متوفى', 'غير معروف')),
    contact_info TEXT,
    additional_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_update_date TIMESTAMPTZ CHECK (last_update_date >= created_at),
    source_organization TEXT NOT NULL CHECK (LENGTH(source_organization) > 0),
    search_vector TSVECTOR
);

-- Create GIN index for Arabic full-text search
CREATE INDEX idx_detainees_search_arabic ON detainees USING GIN (search_vector);

-- Function to update Arabic search vector
CREATE OR REPLACE FUNCTION update_detainee_search_vector_arabic() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('arabic', COALESCE(NEW.full_name, '')), 'A') ||
        setweight(to_tsvector('arabic', COALESCE(NEW.original_name, '')), 'B') ||
        setweight(to_tsvector('arabic', COALESCE(NEW.last_seen_location, '')), 'C') ||
        setweight(to_tsvector('arabic', COALESCE(NEW.detention_facility, '')), 'C') ||
        setweight(to_tsvector('arabic', COALESCE(NEW.physical_description, '')), 'D') ||
        setweight(to_tsvector('arabic', COALESCE(NEW.additional_notes, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for real-time Arabic search vector updates
CREATE TRIGGER detainee_search_vector_arabic_update
BEFORE INSERT OR UPDATE ON detainees
FOR EACH ROW EXECUTE FUNCTION update_detainee_search_vector_arabic();

-- CSV Upload Records Table (with Arabic validation)
CREATE TABLE csv_upload_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES upload_sessions(id) ON DELETE CASCADE,
    detainee_id UUID REFERENCES detainees(id) ON DELETE SET NULL,
    row_number INT NOT NULL CHECK (row_number > 0),
    original_data JSONB NOT NULL CHECK (jsonb_typeof(original_data) = 'object'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create invalid_records table
CREATE TABLE invalid_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES upload_sessions(id) ON DELETE CASCADE,
    record_data JSONB NOT NULL,
    errors JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable real-time for upload_sessions table
ALTER TABLE upload_sessions REPLICA IDENTITY FULL;

-- Enable real-time for specific columns
BEGIN;
  -- Drop existing publication if it exists
  DROP PUBLICATION IF EXISTS supabase_realtime;
  
  -- Create publication for real-time
  CREATE PUBLICATION supabase_realtime;
  
  -- Add upload_sessions table to publication
  ALTER PUBLICATION supabase_realtime ADD TABLE upload_sessions;
COMMIT;

-- Create policy to allow real-time updates
CREATE POLICY "Enable read access for upload_sessions" ON upload_sessions
    FOR SELECT USING (true);

-- Validation Feedback Table (with Arabic messages)
CREATE TABLE validation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL,
    field_name TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('خطأ', 'تحذير', 'معلومة')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CHECK (resolved_at IS NULL OR resolved_at >= created_at)
);

-- Function for real-time Arabic validation
CREATE OR REPLACE FUNCTION validate_detainee_record_arabic() RETURNS TRIGGER AS $$
BEGIN
    -- Example validation rules with Arabic messages
    IF NEW.age_at_detention IS NOT NULL AND NEW.age_at_detention < 0 THEN
        INSERT INTO validation_feedback (record_id, field_name, message, severity)
        VALUES (NEW.id, 'age_at_detention', 'العمر لا يمكن أن يكون سالبًا', 'خطأ');
    END IF;

    IF NEW.date_of_detention IS NOT NULL AND NEW.date_of_detention > CURRENT_DATE THEN
        INSERT INTO validation_feedback (record_id, field_name, message, severity)
        VALUES (NEW.id, 'date_of_detention', 'التاريخ لا يمكن أن يكون في المستقبل', 'خطأ');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for real-time Arabic validation
CREATE TRIGGER detainee_validation_arabic_trigger
AFTER INSERT OR UPDATE ON detainees
FOR EACH ROW EXECUTE FUNCTION validate_detainee_record_arabic();
