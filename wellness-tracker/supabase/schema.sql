-- =========================================================
-- Company Wellness Tracker — Supabase schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- =========================================================

-- ---------- PROFILES ----------
-- One row per staff member. Created automatically when someone signs up.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  department text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Profiles are viewable by any logged in staff member"
  on profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------- ENROLLMENTS ----------
-- One row per person, per challenge type, per month.
-- challenge_type: 'steps' | 'weight' | 'water' | 'nutrition' | 'workout'
create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  challenge_type text not null check (challenge_type in ('steps','weight','water','nutrition,'workout'')),
  month text not null, -- format: 'YYYY-MM'
  -- steps challenge
  steps_target int check (steps_target in (8000,10000,12000,20000)),
  -- weight challenge
  starting_weight numeric,
  ending_weight numeric,
  -- water challenge (oz/day), nutrition challenge (calories/day)
  daily_target numeric,
  -- workout challenge (days/week goal)
  days_target int check (days_target in (3,4,5)),
  created_at timestamptz not null default now(),
  unique (user_id, challenge_type, month)
);

alter table enrollments enable row level security;

create policy "Staff can view all enrollments (for leaderboards)"
  on enrollments for select
  using (auth.role() = 'authenticated');

create policy "Users manage their own enrollments"
  on enrollments for insert
  with check (auth.uid() = user_id);

create policy "Users update their own enrollments"
  on enrollments for update
  using (auth.uid() = user_id);

create policy "Users delete their own enrollments"
  on enrollments for delete
  using (auth.uid() = user_id);

-- ---------- DAILY LOGS ----------
-- One row per person, per challenge type, per day.
create table if not exists daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  challenge_type text not null check (challenge_type in ('steps','water','nutrition,'workout'')),
  log_date date not null,
  value numeric not null,
  goal_met boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, challenge_type, log_date)
);

alter table daily_logs enable row level security;

create policy "Staff can view all daily logs (for dashboard stats)"
  on daily_logs for select
  using (auth.role() = 'authenticated');

create policy "Users manage their own logs - insert"
  on daily_logs for insert
  with check (auth.uid() = user_id);

create policy "Users manage their own logs - update"
  on daily_logs for update
  using (auth.uid() = user_id);

create policy "Users manage their own logs - delete"
  on daily_logs for delete
  using (auth.uid() = user_id);

-- ---------- PRIZES ----------
-- Admin-managed list of prizes staff are competing for each month.
create table if not exists prizes (
  id uuid primary key default gen_random_uuid(),
  month text not null, -- 'YYYY-MM'
  title text not null,
  description text,
  image_url text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table prizes enable row level security;

create policy "Everyone can view prizes"
  on prizes for select
  using (auth.role() = 'authenticated');

create policy "Only admins can add prizes"
  on prizes for insert
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Only admins can update prizes"
  on prizes for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Only admins can delete prizes"
  on prizes for delete
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- ---------- HELPER VIEW: monthly qualification ----------
-- Recomputes, for every enrolled person this month, whether they've hit
-- their goal on >90% of days elapsed so far (steps / water / nutrition),
-- or lost weight (weight challenge).
create or replace view monthly_qualification as
select
  e.id as enrollment_id,
  e.user_id,
  e.challenge_type,
  e.month,
  p.full_name,
  case
    when e.challenge_type = 'weight' then
      (e.ending_weight is not null and e.starting_weight is not null and e.ending_weight < e.starting_weight)
    else
      coalesce(
        (select count(*) filter (where d.goal_met) ::numeric
           / nullif(count(*),0)
         from daily_logs d
         where d.user_id = e.user_id
           and d.challenge_type = e.challenge_type
           and to_char(d.log_date, 'YYYY-MM') = e.month
        ) > 0.9,
        false
      )
  end as qualifies_for_drawing
from enrollments e
join profiles p on p.id = e.user_id;

-- =========================================================
-- Make yourself an admin after you sign up once, by running:
-- update profiles set is_admin = true where full_name = 'Your Name';
-- =========================================================


-- =========================================================
-- MIGRATION: run this once if your enrollments/daily_logs
-- tables already existed before the Workout Challenge was added.
-- (Safe to skip on a brand-new database created from this file.)
-- =========================================================
alter table enrollments drop constraint if exists enrollments_challenge_type_check;
alter table enrollments add constraint enrollments_challenge_type_check
  check (challenge_type in ('steps','weight','water','nutrition','workout'));

alter table enrollments add column if not exists days_target int check (days_target in (3,4,5));

alter table daily_logs drop constraint if exists daily_logs_challenge_type_check;
alter table daily_logs add constraint daily_logs_challenge_type_check
  check (challenge_type in ('steps','water','nutrition','workout'));
