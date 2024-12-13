# Supabase Implementation

## Project Setup 

### 1. Initial Configuration
```bash
# Install Supabase dependencies
npm install @supabase/supabase-js @supabase/ssr
```

### 2. Environment Setup
Add to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database Schema 

### Utility Functions

```sql
-- Arabic text normalization function
create or replace function normalize_arabic(input text) returns text as $$
declare
  normalized text;
begin
  if input is null then
    return null;
  end if;

  -- Remove diacritics (tashkeel)
  normalized := regexp_replace(input, '[\\u064B-\\u065F\\u0670]', '', 'g');
  
  -- Normalize alef variations to simple alef
  normalized := regexp_replace(normalized, '[\\u0622\\u0623\\u0625]', '\\u0627', 'g');
  
  -- Normalize teh marbuta to heh
  normalized := regexp_replace(normalized, '\\u0629', '\\u0647', 'g');
  
  -- Normalize yeh variations
  normalized := regexp_replace(normalized, '\\u0649', '\\u064A', 'g');
  
  return normalized;
end;
$$ language plpgsql immutable strict;

-- Test cases for normalize_arabic function
do $$
begin
  assert normalize_arabic('مُحَمَّد') = 'محمد';
  assert normalize_arabic('عبدالرحمٰن') = 'عبدالرحمن';
  assert normalize_arabic('فاطمة') = 'فاطمه';
end;
$$;
```

### Tables

#### 1. detainees
```sql
create table detainees (
  id uuid default gen_random_uuid() primary key,
  full_name_ar text not null,
  full_name_ar_normalized text generated always as (
    normalize_arabic(full_name_ar)
  ) stored,
  full_name_en text,
  date_of_birth date,
  place_of_birth_ar text,
  place_of_birth_ar_normalized text generated always as (
    normalize_arabic(place_of_birth_ar)
  ) stored,
  place_of_birth_en text,
  gender text check (gender in ('male', 'female', 'other')),
  nationality text,
  detention_date date,
  detention_location_ar text,
  detention_location_ar_normalized text generated always as (
    normalize_arabic(detention_location_ar)
  ) stored,
  detention_location_en text,
  last_seen_date date,
  last_seen_location_ar text,
  last_seen_location_ar_normalized text generated always as (
    normalize_arabic(last_seen_location_ar)
  ) stored,
  last_seen_location_en text,
  status text check (status in ('detained', 'released', 'deceased', 'unknown')),
  additional_info_ar text,
  additional_info_en text,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  verified boolean not null default false,
  verified_at timestamp with time zone,
  search_vector tsvector generated always as (
    setweight(to_tsvector('arabic', coalesce(full_name_ar, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(full_name_en, '')), 'A') ||
    setweight(to_tsvector('arabic', coalesce(place_of_birth_ar, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(place_of_birth_en, '')), 'B') ||
    setweight(to_tsvector('arabic', coalesce(detention_location_ar, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(detention_location_en, '')), 'B') ||
    setweight(to_tsvector('arabic', coalesce(last_seen_location_ar, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(last_seen_location_en, '')), 'B')
  ) stored
);

-- Indices for improved query performance
create index detainees_search_idx on detainees using gin(search_vector);
create index detainees_name_ar_idx on detainees using gin(full_name_ar_normalized gin_trgm_ops);
create index detainees_name_en_idx on detainees using gin(full_name_en gin_trgm_ops);
create index detainees_location_ar_idx on detainees using gin(detention_location_ar_normalized gin_trgm_ops);
create index detainees_verified_idx on detainees(verified, created_at desc) where verified = true;

-- Monitor index usage
comment on index detainees_search_idx is 'Full-text search index - Monitor usage with pg_stat_user_indexes';
comment on index detainees_name_ar_idx is 'Arabic name trigram index - Monitor usage';
comment on index detainees_name_en_idx is 'English name trigram index - Monitor usage';
```

#### 2. submissions 
```sql
create table submissions (
  id uuid default gen_random_uuid() primary key,
  detainee_id uuid references detainees(id),
  submitter_name text,
  submitter_email text,
  submitter_phone text,
  relationship_to_detainee text,
  submission_type text check (submission_type in ('individual', 'bulk')),
  status text check (status in ('pending', 'verified', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  verification_date timestamp with time zone,
  verification_notes text,
  ip_address text,
  recaptcha_score float
);
```

#### 3. documents 
```sql
create table documents (
  id uuid default gen_random_uuid() primary key,
  detainee_id uuid references detainees(id),
  document_type text check (document_type in ('id', 'photo', 'report', 'other')),
  file_path text not null,
  file_name text not null,
  file_size integer,
  mime_type text,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()),
  verified boolean default false
);
```

#### 4. detainee_history 
```sql
create table detainee_history (
  id uuid default gen_random_uuid() primary key,
  detainee_id uuid references detainees(id),
  changed_at timestamp with time zone default timezone('utc'::text, now()),
  previous_data jsonb,
  new_data jsonb,
  change_type text check (change_type in ('create', 'update', 'delete', 'verify'))
);

-- Index for efficient history queries
create index detainee_history_detainee_id_idx on detainee_history(detainee_id);
```

## Directory Structure Updates 

### 1. New Directories
```
src/
├── lib/
│   └── supabase/
│       ├── client.ts      # Supabase client configuration
│       └── types.ts       # Supabase database types
├── utils/
│   └── supabase/
│       ├── queries.ts     # Common database queries
│       └── mutations.ts   # Database mutation operations
```

### 2. API Routes
```
src/app/api/
├── detainees/
│   ├── route.ts          # GET/POST detainee records
│   └── [id]/
│       └── route.ts      # GET/PUT/DELETE specific detainee
├── submissions/
│   └── route.ts          # Handle new submissions
└── documents/
    └── route.ts          # Handle document uploads
```

## Security Implementation 

### 1. Role-Based Access Control
```sql
-- Create RLS policies
create policy "Public read access"
  on detainees for select
  using (verified = true);

create policy "Protected write access"
  on detainees for insert
  with check (true);

create policy "Protected update access"
  on detainees for update
  using (
    case when ip_address = current_setting('request.headers')::json->>'x-real-ip'
      then not verified
      else false
    end
  );
```

### 2. Rate Limiting with Edge Functions
```typescript
// src/functions/rate-limit.ts
import { createClient } from '@supabase/supabase-js'

export async function rateLimit(req: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )

  const ip = req.headers.get('x-real-ip')
  const key = `rate-limit:${ip}`
  
  // Use Redis or Supabase's key-value store for rate limiting
  const { data: attempts } = await supabase
    .from('rate_limits')
    .select('attempts, reset_at')
    .eq('ip', ip)
    .single()

  // Implement rate limiting logic
  if (attempts && attempts.attempts >= 10) {
    return new Response('Too Many Requests', { status: 429 })
  }

  // Update rate limit counter
  await supabase.from('rate_limits').upsert({
    ip,
    attempts: (attempts?.attempts || 0) + 1,
    reset_at: new Date(Date.now() + 3600000).toISOString()
  })

  return null // Continue with request
}
```

## Monitoring and Performance 

### 1. Query Performance Monitoring
```sql
-- Enable pg_stat_statements
create extension if not exists pg_stat_statements;

-- Create monitoring views
create or replace view monitoring.slow_queries as
select 
  calls,
  total_exec_time / calls as avg_exec_time,
  rows / calls as avg_rows,
  query
from pg_stat_statements
where total_exec_time / calls > 100 -- ms
order by avg_exec_time desc;

-- Create monitoring function for index usage
create or replace function monitoring.index_usage_stats()
returns table (
  schemaname text,
  tablename text,
  indexname text,
  idx_scan bigint,
  idx_tup_read bigint,
  idx_tup_fetch bigint
) as $$
begin
  return query
  select
    schemaname::text,
    tablename::text,
    indexrelname::text as indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
  from pg_stat_user_indexes
  order by idx_scan desc;
end;
$$ language plpgsql security definer;

-- Schedule index usage monitoring
select cron.schedule(
  'index-usage-monitoring',
  '0 */6 * * *', -- Every 6 hours
  $$
    insert into monitoring.index_stats
    select * from monitoring.index_usage_stats();
  $$
);
```

### 2. Integration with External Monitoring
```typescript
// src/lib/monitoring/setup.ts
import * as Sentry from '@sentry/nextjs';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { metrics } from '@opentelemetry/api';

// Initialize monitoring
export function setupMonitoring() {
  // Sentry setup
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    integrations: [
      new Sentry.Integrations.Postgres(),
      new Sentry.Integrations.Redis()
    ]
  });

  // Prometheus metrics
  const exporter = new PrometheusExporter({
    port: 9464,
    startServer: true
  });

  // Create custom metrics
  const searchLatency = metrics.createHistogram('search_latency', {
    description: 'Search operation latency in ms'
  });

  return { searchLatency };
}
```

### 3. Backup Strategy
```sql
-- Create backup schema
create schema if not exists backup;

-- Create backup function
create or replace function create_daily_backup()
returns void as $$
begin
  -- Create backup tables
  execute format(
    'create table if not exists backup.detainees_%s as select * from detainees',
    to_char(current_date, 'YYYY_MM_DD')
  );
  
  -- Rotate backups (keep last 30 days)
  execute format(
    'drop table if exists backup.detainees_%s',
    to_char(current_date - interval '30 days', 'YYYY_MM_DD')
  );
end;
$$ language plpgsql;

-- Schedule daily backup
select cron.schedule(
  'daily-backup',
  '0 0 * * *',
  'select create_daily_backup()'
);
```

## Current Implementation Status

### 1. Database Schema 
- Detainees table implemented with:
  - Arabic text normalization
  - Automatic field normalization
  - Proper indexing for search
- Submissions table linked to detainees
- Row Level Security policies in place

### 2. Search Implementation (In Progress)
- Basic search functionality working
- Arabic text search with normalization
- Full-text search capabilities
- Search result pagination (In Progress)
- Advanced filtering (In Progress)

### 3. Data Management
- Bulk upload functionality implemented
- Data validation in place
- Submission workflow working
- Verification system implemented

### 4. Performance Optimizations
- Database indexes created
- Query monitoring in place
- Slow query logging implemented
- Edge function caching (Pending)

### 5. Security Measures
- Row Level Security configured
- Input sanitization implemented
- Rate limiting in place
- API key rotation system (Pending)

## Integration Steps

1. **Client Setup**
   - Initialize Supabase client
   - Configure middleware for request handling

2. **Data Layer**
   - Implement database types
   - Create query and mutation utilities
   - Set up error handling

3. **API Integration**
   - Create API routes
   - Implement rate limiting
   - Add request validation

4. **Search Implementation**
   - Configure full-text search
   - Implement Arabic text normalization
   - Set up search result ranking

5. **File Storage**
   - Configure Supabase storage buckets
   - Implement upload policies
   - Set up file type validation

6. **Security Measures**
   - Implement RLS policies
   - Configure CORS policies
   - Set up rate limiting

## Testing Strategy

1. **Unit Tests**
   - Database queries
   - API endpoints
   - Utility functions

2. **Integration Tests**
   - Full submission flow
   - Search functionality
   - File uploads

3. **Security Tests**
   - RLS policy validation
   - Rate limiting
   - Input validation

## Monitoring and Maintenance 

### 1. Performance Monitoring
```sql
-- Create monitoring schema
create schema if not exists monitoring;

-- Query performance tracking
create table monitoring.query_stats (
  id uuid default gen_random_uuid() primary key,
  query_text text,
  execution_time interval,
  rows_returned bigint,
  timestamp timestamp with time zone default now()
);

-- Create monitoring function
create function log_slow_queries() returns trigger as $$
begin
  if tg_argv[0]::interval < current_setting('statement_timeout')::interval then
    insert into monitoring.query_stats (query_text, execution_time, rows_returned)
    values (current_query(), clock_timestamp() - query_start, (select count(*) from detainees));
  end if;
  return null;
end;
$$ language plpgsql;

-- Create trigger for slow queries
create trigger log_slow_queries_trigger
  after insert or update or delete on detainees
  execute procedure log_slow_queries('1 second');
```
