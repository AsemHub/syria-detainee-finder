-- Create extensions if not exists
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Create enum types
DO $$ BEGIN
    CREATE TYPE detainee_status AS ENUM ('detained', 'released', 'deceased', 'unknown');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_type AS ENUM ('id', 'photo', 'report', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create detainees table
CREATE TABLE IF NOT EXISTS detainees (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name_ar text NOT NULL,
    full_name_ar_normalized text GENERATED ALWAYS AS (normalize_arabic(full_name_ar)) STORED,
    full_name_en text,
    date_of_birth date,
    place_of_birth_ar text,
    place_of_birth_ar_normalized text GENERATED ALWAYS AS (normalize_arabic(place_of_birth_ar)) STORED,
    place_of_birth_en text,
    gender gender_type,
    nationality text,
    detention_date date,
    detention_location_ar text,
    detention_location_ar_normalized text GENERATED ALWAYS AS (normalize_arabic(detention_location_ar)) STORED,
    detention_location_en text,
    last_seen_date date,
    last_seen_location_ar text,
    last_seen_location_ar_normalized text GENERATED ALWAYS AS (normalize_arabic(last_seen_location_ar)) STORED,
    last_seen_location_en text,
    status detainee_status DEFAULT 'unknown'::detainee_status,
    additional_info_ar text,
    additional_info_en text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    verified_at timestamp with time zone,
    submitter_email text,
    submitter_name text,
    submitter_phone text
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    detainee_id uuid REFERENCES detainees(id) ON DELETE CASCADE NOT NULL,
    document_type document_type NOT NULL,
    file_path text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    submitter_email text,
    description_ar text,
    description_en text
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    operation text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    ip_address text,
    user_agent text
);

-- Create updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_detainees_updated_at
    BEFORE UPDATE ON detainees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (
            table_name,
            record_id,
            operation,
            old_data,
            ip_address,
            user_agent
        )
        VALUES (
            TG_TABLE_NAME::text,
            OLD.id,
            TG_OP,
            row_to_json(OLD)::jsonb,
            current_setting('request.headers')::json->>'x-forwarded-for',
            current_setting('request.headers')::json->>'user-agent'
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (
            table_name,
            record_id,
            operation,
            old_data,
            new_data,
            ip_address,
            user_agent
        )
        VALUES (
            TG_TABLE_NAME::text,
            NEW.id,
            TG_OP,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb,
            current_setting('request.headers')::json->>'x-forwarded-for',
            current_setting('request.headers')::json->>'user-agent'
        );
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (
            table_name,
            record_id,
            operation,
            new_data,
            ip_address,
            user_agent
        )
        VALUES (
            TG_TABLE_NAME::text,
            NEW.id,
            TG_OP,
            row_to_json(NEW)::jsonb,
            current_setting('request.headers')::json->>'x-forwarded-for',
            current_setting('request.headers')::json->>'user-agent'
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers
CREATE TRIGGER audit_detainees_trigger
    AFTER INSERT OR UPDATE OR DELETE ON detainees
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_documents_trigger
    AFTER INSERT OR UPDATE OR DELETE ON documents
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Create text search configuration
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_ts_config 
        WHERE cfgname = 'arabic'
    ) THEN
        EXECUTE 'CREATE TEXT SEARCH CONFIGURATION arabic (COPY = simple)';
    END IF;
END $$;

-- Create function for Arabic text normalization
CREATE OR REPLACE FUNCTION normalize_arabic(input text)
RETURNS text AS $$
DECLARE
    normalized text;
BEGIN
    IF input IS NULL THEN
        RETURN NULL;
    END IF;

    -- Remove diacritics (tashkeel)
    normalized := regexp_replace(input, '[\\u064B-\\u065F\\u0670]', '', 'g');
    
    -- Normalize alef variations to simple alef
    normalized := regexp_replace(normalized, '[\\u0622\\u0623\\u0625]', '\\u0627', 'g');
    
    -- Normalize teh marbuta to heh
    normalized := regexp_replace(normalized, '\\u0629', '\\u0647', 'g');
    
    -- Normalize yeh variations
    normalized := regexp_replace(normalized, '\\u0649', '\\u064A', 'g');
    
    RETURN normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;
