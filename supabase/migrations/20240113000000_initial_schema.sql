-- Create extensions
create extension if not exists "unaccent";

-- Create enum types
do $$ begin
    create type user_role as enum ('user', 'moderator', 'admin');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type detainee_status as enum ('detained', 'released', 'deceased', 'unknown');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type gender_type as enum ('male', 'female', 'other');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type document_type as enum ('id', 'photo', 'report', 'other');
exception
    when duplicate_object then null;
end $$;

-- Create tables
create table if not exists user_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  full_name text,
  role user_role default 'user'::user_role,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create detainees table
create table if not exists detainees (
  id uuid default gen_random_uuid() primary key,
  full_name_ar text not null,
  full_name_ar_normalized text generated always as (normalize_arabic(full_name_ar)) stored,
  full_name_en text,
  date_of_birth date,
  place_of_birth_ar text,
  place_of_birth_ar_normalized text generated always as (normalize_arabic(place_of_birth_ar)) stored,
  place_of_birth_en text,
  gender gender_type,
  nationality text,
  detention_date date,
  detention_location_ar text,
  detention_location_ar_normalized text generated always as (normalize_arabic(detention_location_ar)) stored,
  detention_location_en text,
  last_seen_date date,
  last_seen_location_ar text,
  last_seen_location_ar_normalized text generated always as (normalize_arabic(last_seen_location_ar)) stored,
  last_seen_location_en text,
  status detainee_status default 'unknown'::detainee_status,
  additional_info_ar text,
  additional_info_en text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  verified boolean default false not null,
  verified_at timestamp with time zone,
  verified_by uuid references auth.users(id)
);

-- Create documents table
create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  detainee_id uuid references detainees(id) on delete cascade not null,
  document_type document_type not null,
  file_path text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create audit_logs table
create table if not exists audit_logs (
  id uuid default gen_random_uuid() primary key,
  table_name text not null,
  record_id uuid not null,
  operation text not null,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid references auth.users(id),
  changed_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
drop trigger if exists update_user_profiles_updated_at on user_profiles;
create trigger update_user_profiles_updated_at
  before update on user_profiles
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_detainees_updated_at on detainees;
create trigger update_detainees_updated_at
  before update on detainees
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_documents_updated_at on documents;
create trigger update_documents_updated_at
  before update on documents
  for each row
  execute function update_updated_at_column();

-- Create function to handle new user creation
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to automatically create user profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Create audit trigger function
create or replace function audit_trigger_func()
returns trigger as $$
begin
  if (TG_OP = 'DELETE') then
    insert into audit_logs (
      table_name,
      record_id,
      operation,
      old_data,
      changed_by
    )
    values (
      TG_TABLE_NAME::text,
      old.id,
      TG_OP,
      row_to_json(old)::jsonb,
      auth.uid()
    );
    return old;
  elsif (TG_OP = 'UPDATE') then
    insert into audit_logs (
      table_name,
      record_id,
      operation,
      old_data,
      new_data,
      changed_by
    )
    values (
      TG_TABLE_NAME::text,
      new.id,
      TG_OP,
      row_to_json(old)::jsonb,
      row_to_json(new)::jsonb,
      auth.uid()
    );
    return new;
  elsif (TG_OP = 'INSERT') then
    insert into audit_logs (
      table_name,
      record_id,
      operation,
      new_data,
      changed_by
    )
    values (
      TG_TABLE_NAME::text,
      new.id,
      TG_OP,
      row_to_json(new)::jsonb,
      auth.uid()
    );
    return new;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Add audit triggers
drop trigger if exists audit_detainees_trigger on detainees;
create trigger audit_detainees_trigger
  after insert or update or delete on detainees
  for each row execute function audit_trigger_func();

drop trigger if exists audit_documents_trigger on documents;
create trigger audit_documents_trigger
  after insert or update or delete on documents
  for each row execute function audit_trigger_func();

drop trigger if exists audit_user_profiles_trigger on user_profiles;
create trigger audit_user_profiles_trigger
  after insert or update or delete on user_profiles
  for each row execute function audit_trigger_func();

-- Enable RLS on tables
alter table detainees enable row level security;
alter table documents enable row level security;
alter table user_profiles enable row level security;

-- Detainees table policies
create policy "Public detainees are viewable by everyone"
  on detainees for select
  using (verified = true);

create policy "Only verified users can insert detainees"
  on detainees for insert
  to authenticated
  with check (true);

create policy "Only admins can update detainees"
  on detainees for update
  using (
    auth.uid() in (
      select user_id from user_profiles
      where role = 'admin'
    )
  );

create policy "Only admins can delete detainees"
  on detainees for delete
  using (
    auth.uid() in (
      select user_id from user_profiles
      where role = 'admin'
    )
  );

-- Documents table policies
create policy "Public documents are viewable by everyone"
  on documents for select
  using (
    detainee_id in (
      select id from detainees
      where verified = true
    )
  );

create policy "Only verified users can insert documents"
  on documents for insert
  to authenticated
  with check (true);

create policy "Only admins can update documents"
  on documents for update
  using (
    auth.uid() in (
      select user_id from user_profiles
      where role = 'admin'
    )
  );

create policy "Only admins can delete documents"
  on documents for delete
  using (
    auth.uid() in (
      select user_id from user_profiles
      where role = 'admin'
    )
  );

-- User profiles policies
create policy "Users can view their own profile"
  on user_profiles for select
  using (auth.uid() = user_id);

create policy "Users can update their own profile"
  on user_profiles for update
  using (auth.uid() = user_id);

-- Create text search configuration
create text search configuration arabic (copy = simple);

-- Create function for Arabic text normalization
create or replace function normalize_arabic(input text)
returns text as $$
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
