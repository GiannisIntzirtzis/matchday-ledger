-- ============================================================
-- Matchday Ledger — Database Schema
-- Τρέξε αυτό το αρχείο σε ένα καινούριο Supabase project
-- (SQL Editor → paste όλο → Run) για να στήσεις τη βάση από την αρχή.
-- ============================================================

-- ---------- Πίνακας: fixtures ----------
-- Ένας αγώνας ανά γραμμή. Το user_id συνδέει κάθε αγώνα με τον
-- διαιτητή που τον κατέγραψε.

create table fixtures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'main',
  date date,
  competition text,
  venue text,
  role text,
  home_team text,
  away_team text,
  result text,
  fee numeric default 0,
  travel_expense numeric default 0,
  self_rating numeric,
  observer_rating numeric,
  yellow_cards integer default 0,
  red_cards integer default 0,
  comments text,
  player_name text,
  player_team text,
  impression text,
  created_at timestamptz default now(),
  photo_paths text[] default '{}'
);

alter table fixtures enable row level security;

create policy "Users can view their own fixtures"
  on fixtures for select
  using (auth.uid() = user_id);

create policy "Users can insert their own fixtures"
  on fixtures for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own fixtures"
  on fixtures for update
  using (auth.uid() = user_id);

create policy "Users can delete their own fixtures"
  on fixtures for delete
  using (auth.uid() = user_id);

-- ---------- Πίνακας: profiles ----------
-- Ένα προφίλ ανά χρήστη (1-προς-1 με auth.users). Ο ρόλος
-- ('referee' ή 'admin') ελέγχει την πρόσβαση στο admin view.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  birth_year integer,
  referee_school text,
  evaluation_status text,
  phone text,
  address text,
  role text not null default 'referee',
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- ---------- Function: is_admin() ----------
-- SECURITY DEFINER ώστε το admin policy να μην προκαλεί infinite
-- recursion (το policy θα έκανε select στο ίδιο table που προστατεύει).

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Admins can view all profiles"
  on profiles for select
  using (is_admin());

create policy "Admins can view all fixtures"
  on fixtures for select
  using (is_admin());

-- ---------- Storage: bucket fixture-photos ----------
-- ΣΗΜΑΝΤΙΚΟ: το bucket δεν δημιουργείται με SQL — φτιάξ' το χειροκίνητα
-- στο Supabase dashboard: Storage → New bucket → name: "fixture-photos",
-- Public bucket: OFF. Μετά τρέξε τα policies παρακάτω.

create policy "Users can upload their own fixture photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'fixture-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can view their own fixture photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'fixture-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own fixture photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'fixture-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------- Πρώτος admin ----------
-- Μετά το πρώτο σου signup, τρέξε αυτό (με το σωστό id από auth.users)
-- για να ορίσεις τον εαυτό σου ως admin:
--
-- update profiles set role = 'admin' where id = '<το-δικό-σου-user-id>';