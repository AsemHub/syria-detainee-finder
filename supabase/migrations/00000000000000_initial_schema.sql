-- Enable required extensions
create extension if not exists "pg_trgm";
create extension if not exists "pg_stat_statements";

-- Create monitoring schema
create schema if not exists monitoring;

-- Create backup schema
create schema if not exists backup;

-- Create custom types
create type user_role as enum ('admin', 'verifier', 'staff', 'public');

-- Create role management function
create or replace function get_user_role()
returns user_role as $$
begin
  -- Check JWT claims in order of privilege
  if (auth.jwt()->>'is_admin')::boolean then
    return 'admin'::user_role;
  elsif (auth.jwt()->>'is_verifier')::boolean then
    return 'verifier'::user_role;
  elsif (auth.jwt()->>'is_staff')::boolean then
    return 'staff'::user_role;
  else
    return 'public'::user_role;
  end if;
end;
$$ language plpgsql security definer;

-- Create utility functions
create or replace function normalize_arabic(input text) returns text as $$
declare
  normalized text;
begin
  if input is null then
    return null;
  end if;

  -- Remove diacritics (tashkeel)
  normalized := regexp_replace(input, '[\u064B-\u065F\u0670]', '', 'g');
  
  -- Normalize alef variations to simple alef
  normalized := regexp_replace(normalized, '[\u0622\u0623\u0625]', '\u0627', 'g');
  
  -- Normalize teh marbuta to heh
  normalized := regexp_replace(normalized, '\u0629', '\u0647', 'g');
  
  -- Normalize yeh variations
  normalized := regexp_replace(normalized, '\u0649', '\u064A', 'g');
  
  return normalized;
end;
$$ language plpgsql immutable strict;

-- Create tables
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
  verified_by uuid references auth.users(id),
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

create table submissions (
  id uuid default gen_random_uuid() primary key,
  detainee_id uuid references detainees(id),
  submitter_name text,
  submitter_email text,
  submitter_phone text,
  relationship_to_detainee text,
  submission_type text check (submission_type in ('individual', 'bulk')),
  status text check (status in ('pending', 'verified', 'rejected')),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  verification_date timestamp with time zone,
  verification_notes text,
  ip_address text,
  recaptcha_score float
);

create table documents (
  id uuid default gen_random_uuid() primary key,
  detainee_id uuid references detainees(id),
  document_type text check (document_type in ('id', 'photo', 'report', 'other')),
  file_path text not null,
  file_name text not null,
  file_size integer,
  mime_type text,
  uploaded_at timestamp with time zone not null default timezone('utc'::text, now()),
  verified boolean not null default false
);

create table detainee_history (
  id uuid default gen_random_uuid() primary key,
  detainee_id uuid references detainees(id),
  changed_by uuid references auth.users(id),
  changed_at timestamp with time zone not null default timezone('utc'::text, now()),
  previous_data jsonb,
  new_data jsonb,
  change_type text check (change_type in ('create', 'update', 'delete', 'verify'))
);

-- Create indices
create index detainees_search_idx on detainees using gin(search_vector);
create index detainees_name_ar_idx on detainees using gin(full_name_ar_normalized gin_trgm_ops);
create index detainees_name_en_idx on detainees using gin(full_name_en gin_trgm_ops);
create index detainees_location_ar_idx on detainees using gin(detention_location_ar_normalized gin_trgm_ops);
create index detainees_verified_idx on detainees(verified, created_at desc) where verified = true;
create index detainee_history_detainee_id_idx on detainee_history(detainee_id);

-- Add comments for monitoring
comment on index detainees_search_idx is 'Full-text search index - Monitor usage with pg_stat_user_indexes';
comment on index detainees_name_ar_idx is 'Arabic name trigram index - Monitor usage';
comment on index detainees_name_en_idx is 'English name trigram index - Monitor usage';

-- Enable RLS
alter table detainees enable row level security;
alter table submissions enable row level security;
alter table documents enable row level security;
alter table detainee_history enable row level security;

-- Create RLS policies
create policy "Role-based read access"
  on detainees for select
  using (
    case 
      when auth.jwt() is null then verified = true
      when (auth.jwt()->>'is_admin')::boolean then true
      when (auth.jwt()->>'is_verifier')::boolean then true
      when (auth.jwt()->>'is_staff')::boolean then true
      else verified = true
    end
  );

create policy "Role-based write access"
  on detainees for update
  using (
    case 
      when auth.jwt() is null then false
      when (auth.jwt()->>'is_admin')::boolean then true
      when (auth.jwt()->>'is_verifier')::boolean then true
      when (auth.jwt()->>'is_staff')::boolean then not verified
      else false
    end
  );

create policy "Public can view verified documents"
  on documents for select
  using (verified = true);

create policy "Staff can manage documents"
  on documents for all
  using (
    case
      when auth.jwt() is null then false
      when (auth.jwt()->>'is_admin')::boolean then true
      when (auth.jwt()->>'is_staff')::boolean then true
      else false
    end
  );

-- Create monitoring tables
create table monitoring.query_stats (
  id uuid default gen_random_uuid() primary key,
  query_text text,
  execution_time interval,
  rows_returned bigint,
  timestamp timestamp with time zone default now()
);

-- Create monitoring function
create function monitoring.log_slow_queries() returns trigger as $$
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
  execute procedure monitoring.log_slow_queries('1 second');

-- Create backup function
create or replace function backup.create_daily_backup()
returns void as $$
begin
  execute format(
    'create table if not exists backup.detainees_%s as select * from detainees',
    to_char(current_date, 'YYYY_MM_DD')
  );
  
  execute format(
    'drop table if exists backup.detainees_%s',
    to_char(current_date - interval '30 days', 'YYYY_MM_DD')
  );
end;
$$ language plpgsql;
