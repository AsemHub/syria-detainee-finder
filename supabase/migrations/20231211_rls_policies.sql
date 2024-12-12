-- Enable RLS on tables
alter table detainees enable row level security;
alter table submissions enable row level security;

-- Create roles for different user types
do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'moderator') then
    create role moderator;
  end if;
end
$$;

-- Create custom claims function
create or replace function auth.user_has_role(role text)
returns boolean as $$
begin
  if auth.jwt() ->> 'role' = role then
    return true;
  end if;
  return false;
end;
$$ language plpgsql security definer;

-- Detainees table policies
-- Anyone can view verified detainee records
create policy "Public can view verified detainees"
  on detainees for select
  using (verified = true);

-- Moderators can view all detainee records
create policy "Moderators can view all detainees"
  on detainees for select
  using (auth.user_has_role('moderator'));

-- Only moderators can insert new detainee records
create policy "Moderators can insert detainees"
  on detainees for insert
  with check (auth.user_has_role('moderator'));

-- Only moderators can update detainee records
create policy "Moderators can update detainees"
  on detainees for update
  using (auth.user_has_role('moderator'))
  with check (auth.user_has_role('moderator'));

-- Only moderators can delete detainee records
create policy "Moderators can delete detainees"
  on detainees for delete
  using (auth.user_has_role('moderator'));

-- Submissions table policies
-- Anyone can create submissions
create policy "Public can create submissions"
  on submissions for insert
  with check (true);

-- Submitters can view their own submissions
create policy "Users can view their own submissions"
  on submissions for select
  using (
    submitter_email = auth.jwt() ->> 'email'
    or
    auth.user_has_role('moderator')
  );

-- Only moderators can update submissions
create policy "Moderators can update submissions"
  on submissions for update
  using (auth.user_has_role('moderator'))
  with check (auth.user_has_role('moderator'));

-- Only moderators can delete submissions
create policy "Moderators can delete submissions"
  on submissions for delete
  using (auth.user_has_role('moderator'));

-- Create function to verify detainee records
create or replace function verify_detainee(
  detainee_id uuid,
  verification_status boolean
)
returns void as $$
begin
  if not auth.user_has_role('moderator') then
    raise exception 'Only moderators can verify detainee records';
  end if;

  update detainees
  set 
    verified = verification_status,
    verified_at = case when verification_status then now() else null end,
    verified_by = case when verification_status then auth.uid() else null end
  where id = detainee_id;
end;
$$ language plpgsql security definer;
