# Syria Detainee Finder Database Documentation

## Overview
The database is designed to store and manage information about detainees in Syria, supporting document management, CSV uploads, and efficient search capabilities.

## Schemas
- **public**: Main application schema
- **storage**: Handles file storage and management

## Custom Types (Enums)

### Status Enums
- **detainee_status_enum**: `in_custody`, `missing`, `released`, `deceased`, `unknown`
- **upload_status_enum**: `processing`, `completed`, `failed`
- **verification_status_enum**: `pending`, `verified`, `rejected`, `requires_review`

### Document Related Enums
- **document_category_enum**: `identification`, `detention_record`, `witness_statement`, `medical_record`, `legal_document`, `photo`, `correspondence`, `other`
- **document_type_enum**: `csv_upload`, `supporting_document`, `media`
- **relation_type_enum**: `supersedes`, `supplements`, `contradicts`, `confirms`, `related_to`, `CSV_UPLOAD`

### Other Enums
- **gender_enum**: `male`, `female`, `unknown`
- **access_level_enum**: `public`, `restricted`, `confidential`, `private`

## Tables

### Detainees Table
Primary table storing detainee information.
```sql
CREATE TABLE public.detainees (
    id uuid PRIMARY KEY,
    full_name text NOT NULL,
    gender gender_enum,
    status detainee_status_enum,
    age_at_detention integer,
    date_of_detention date,
    last_seen_location text NOT NULL,
    detention_facility text,
    physical_description text,
    contact_info text NOT NULL,
    additional_notes text,
    source_document_id uuid,
    source_organization text NOT NULL,
    created_at timestamptz,
    last_update_date timestamptz,
    search_vector tsvector
);
```

### Upload Sessions Table
Manages CSV upload sessions and their status.
```sql
CREATE TABLE public.upload_sessions (
    id uuid PRIMARY KEY,
    file_name text NOT NULL,
    file_url text NOT NULL,
    mime_type text NOT NULL,
    file_size integer NOT NULL,
    uploaded_by text NOT NULL,
    status upload_status_enum,
    total_records integer,
    processed_records integer,
    skipped_duplicates integer,
    error_message text,
    processing_details jsonb,
    created_at timestamptz,
    updated_at timestamptz
);
```

### Facilities Table
Stores information about detention facilities.
```sql
CREATE TABLE public.facilities (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    type text,
    location text,
    created_at timestamptz,
    updated_at timestamptz
);
```

## Materialized Views

### detainees_search_mv
Optimized view for detainee search functionality with the following features:
- Full-text search on names and locations
- Trigram search support for fuzzy matching
- Arabic text support
- Gender and status filtering
- Location-based statistics

## Indexes

### Detainee Search Indexes
1. Full Text Search:
   - `detainees_full_name_gin_idx`: GIN index for English full name search
   - `detainees_location_gin_idx`: GIN index for location search
   
2. Trigram Search:
   - `detainees_full_name_trigram_idx`: Trigram index for fuzzy name matching
   - `idx_detainees_name_trigram`: Additional trigram index for names

3. B-tree Indexes:
   - `idx_detainees_name_btree`: B-tree index for exact name matches
   - `idx_detainees_source_document`: B-tree index for document relationships

### Upload Session Indexes
- `idx_upload_sessions_status`: B-tree index for status filtering
- `upload_sessions_pkey`: Primary key index

## Storage Configuration

### Buckets
- **csv-uploads**: Dedicated bucket for CSV file uploads
  - Configured with appropriate file size limits
  - MIME type restrictions
  - RLS policies for secure access

### Security Policies
1. Upload Sessions:
   - Authenticated users can view their uploads
   - Service role has full access
   
2. Storage Objects:
   - Authenticated uploads allowed
   - Owner/service role can delete
   - Public read access where appropriate

## Functions

### Utility Functions
1. `refresh_materialized_views()`: Refreshes search views
2. `get_csv_upload_status(uuid)`: Retrieves upload session status
3. `create_csv_document_relation(uuid, uuid)`: Links CSV uploads to documents

### Search Functions
1. Various GIN index support functions for:
   - Text search
   - Trigram matching
   - Enum comparisons

## Security Considerations
1. Row Level Security (RLS) implemented on sensitive tables
2. Service role privileges for system operations
3. Authenticated user access controls
4. Secure file storage policies
