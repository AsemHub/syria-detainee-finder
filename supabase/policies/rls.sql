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

-- Create audit log table and trigger
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

-- Add audit triggers to tables
create trigger audit_detainees_trigger
  after insert or update or delete on detainees
  for each row execute function audit_trigger_func();

create trigger audit_documents_trigger
  after insert or update or delete on documents
  for each row execute function audit_trigger_func();

create trigger audit_user_profiles_trigger
  after insert or update or delete on user_profiles
  for each row execute function audit_trigger_func();
