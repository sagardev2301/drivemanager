-- Customer Booking Portal — schema, RLS, and confirm_booking RPC
-- Run this once in the Supabase SQL editor (or via `supabase db push` if you adopt the CLI).
-- Safe to re-run: section 0 resets only this feature's own new objects (drivers,
-- course_packages, driver_availability, bookings, reviews, and their views/functions/
-- type) before recreating them, so a previous partial/failed run can't leave stale
-- columns behind (e.g. a `bookings` table that predates the current `learner_id`
-- column). It never touches customers/classes/payments/leads/customer_summary, and
-- never drops `profiles` (it may already hold real role assignments).

-- ============================================================================
-- 0. Safety reset — this feature's own new objects only
-- ============================================================================
drop function if exists confirm_booking(uuid);
drop function if exists decline_booking(uuid);
drop view if exists driver_rating_summary;
drop table if exists reviews cascade;
drop table if exists bookings cascade;
drop table if exists driver_availability cascade;
drop table if exists course_packages cascade;
drop table if exists drivers cascade;
drop type if exists booking_status;

-- ============================================================================
-- 1. Roles: profiles table (staff vs learner)
-- ============================================================================
-- Every driving-school app today only has staff accounts. This migration assumes
-- ALL existing auth.users rows at the time it is run are staff — confirm that's
-- true before running (i.e. no learner has signed up yet).

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Heal a profiles table left over from a partial earlier run (adds any
-- missing column without touching rows/columns that already exist).
alter table profiles add column if not exists role text not null default 'learner';
alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists phone_number text;

do $$ begin
  alter table profiles add constraint profiles_role_check check (role in ('staff', 'learner'));
exception when duplicate_object then null;
end $$;

-- Backfill: every auth.users row that exists right now is staff.
insert into profiles (id, role)
select id, 'staff' from auth.users
on conflict (id) do nothing;

-- Any NEW auth.users row (future signups) defaults to 'learner'. Staff accounts
-- continue to be created manually — after creating one in Supabase Auth, run:
--   update profiles set role = 'staff' where id = '<new-user-id>';
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'learner')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table profiles enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- Public, name-only view for attributing reviews ("Priya" not full phone/role).
-- Owned by the migration-running role (postgres), which bypasses the RLS above,
-- so this exposes id+full_name for every profile while phone_number/role stay
-- locked to "profiles_select_own" on the base table.
create or replace view public_learner_names as
select id, full_name from profiles;

grant select on public_learner_names to anon, authenticated;

-- ============================================================================
-- 2. Link existing customers to a learner auth account (for dedupe on booking)
-- ============================================================================
alter table customers add column if not exists auth_user_id uuid references auth.users(id);
create unique index if not exists customers_auth_user_id_key on customers(auth_user_id) where auth_user_id is not null;

-- ============================================================================
-- 3. drivers
-- ============================================================================
create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id),
  full_name text not null,
  photo_url text,
  bio text,
  years_experience integer,
  specialties text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table drivers enable row level security;

drop policy if exists "drivers_public_read" on drivers;
create policy "drivers_public_read" on drivers
  for select using (true);

drop policy if exists "drivers_staff_write" on drivers;
create policy "drivers_staff_write" on drivers
  for all using (exists (select 1 from profiles where id = auth.uid() and role = 'staff'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'staff'));

-- ============================================================================
-- 4. course_packages (per-driver — confirmed with instructor)
-- ============================================================================
create table if not exists course_packages (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references drivers(id) on delete cascade,
  name text not null,
  class_count integer not null,
  class_duration_minutes integer not null default 60,
  price numeric not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table course_packages enable row level security;

drop policy if exists "course_packages_public_read" on course_packages;
create policy "course_packages_public_read" on course_packages
  for select using (true);

drop policy if exists "course_packages_staff_write" on course_packages;
create policy "course_packages_staff_write" on course_packages
  for all using (exists (select 1 from profiles where id = auth.uid() and role = 'staff'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'staff'));

-- ============================================================================
-- 5. driver_availability (recurring weekly slots)
-- ============================================================================
create table if not exists driver_availability (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references drivers(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table driver_availability enable row level security;

drop policy if exists "driver_availability_public_read" on driver_availability;
create policy "driver_availability_public_read" on driver_availability
  for select using (true);

drop policy if exists "driver_availability_staff_write" on driver_availability;
create policy "driver_availability_staff_write" on driver_availability
  for all using (exists (select 1 from profiles where id = auth.uid() and role = 'staff'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'staff'));

-- ============================================================================
-- 6. bookings
-- ============================================================================
do $$ begin
  create type booking_status as enum ('pending', 'confirmed', 'declined', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id),
  driver_id uuid not null references drivers(id),
  course_package_id uuid not null references course_packages(id),
  requested_date date not null,
  start_time time not null,
  end_time time not null,
  status booking_status not null default 'pending',
  customer_id uuid references customers(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prevent double-booking the same driver/date/time while a request is
-- pending or confirmed (declined/cancelled rows don't block a slot).
create unique index if not exists bookings_no_double_book
  on bookings (driver_id, requested_date, start_time)
  where status in ('pending', 'confirmed');

alter table bookings enable row level security;

drop policy if exists "bookings_learner_insert_own" on bookings;
create policy "bookings_learner_insert_own" on bookings
  for insert with check (learner_id = auth.uid());

drop policy if exists "bookings_learner_select_own" on bookings;
create policy "bookings_learner_select_own" on bookings
  for select using (learner_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'staff'));

drop policy if exists "bookings_learner_cancel_own_pending" on bookings;
create policy "bookings_learner_cancel_own_pending" on bookings
  for update using (learner_id = auth.uid() and status = 'pending')
  with check (learner_id = auth.uid() and status = 'cancelled');

drop policy if exists "bookings_staff_update" on bookings;
create policy "bookings_staff_update" on bookings
  for update using (exists (select 1 from profiles where id = auth.uid() and role = 'staff'));

-- ============================================================================
-- 7. reviews (gated: requires a confirmed booking with that driver)
-- ============================================================================
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id),
  driver_id uuid not null references drivers(id),
  booking_id uuid not null references bookings(id),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table reviews enable row level security;

drop policy if exists "reviews_public_read" on reviews;
create policy "reviews_public_read" on reviews
  for select using (true);

drop policy if exists "reviews_learner_insert_gated" on reviews;
create policy "reviews_learner_insert_gated" on reviews
  for insert with check (
    learner_id = auth.uid()
    and exists (
      select 1 from bookings b
      where b.id = booking_id
        and b.learner_id = auth.uid()
        and b.driver_id = reviews.driver_id
        and b.status = 'confirmed'
    )
  );

-- ============================================================================
-- 8. driver_rating_summary view
-- ============================================================================
create or replace view driver_rating_summary as
select
  d.id as driver_id,
  coalesce(avg(r.rating), 0)::numeric(3,2) as average_rating,
  count(r.id) as review_count
from drivers d
left join reviews r on r.driver_id = d.id
group by d.id;

-- ============================================================================
-- 9. confirm_booking RPC — atomic confirm: customers + classes + booking status
-- ============================================================================
create or replace function confirm_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking bookings;
  v_package course_packages;
  v_profile profiles;
  v_customer_id uuid;
begin
  select * into v_booking from bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking % not found', p_booking_id;
  end if;
  if v_booking.status <> 'pending' then
    raise exception 'Booking % is not pending (status: %)', p_booking_id, v_booking.status;
  end if;

  select * into v_package from course_packages where id = v_booking.course_package_id;
  select * into v_profile from profiles where id = v_booking.learner_id;

  -- Reuse an existing customer: linked by auth_user_id, else matched by phone number.
  select id into v_customer_id from customers where auth_user_id = v_booking.learner_id;

  if v_customer_id is null and v_profile.phone_number is not null then
    select id into v_customer_id from customers where phone_number = v_profile.phone_number;
    if v_customer_id is not null then
      update customers set auth_user_id = v_booking.learner_id where id = v_customer_id;
    end if;
  end if;

  if v_customer_id is null then
    insert into customers (full_name, phone_number, enrollment_date, package_classes, total_fee, course_status, auth_user_id)
    values (
      coalesce(v_profile.full_name, 'Learner'),
      coalesce(v_profile.phone_number, ''),
      v_booking.requested_date,
      v_package.class_count,
      v_package.price,
      'active',
      v_booking.learner_id
    )
    returning id into v_customer_id;
  end if;

  insert into classes (customer_id, status, class_date, start_time, end_time)
  values (v_customer_id, 'scheduled', v_booking.requested_date, v_booking.start_time, v_booking.end_time);

  update bookings
  set status = 'confirmed', customer_id = v_customer_id, updated_at = now()
  where id = p_booking_id;
end;
$$;

-- decline_booking — simple status update, kept as an RPC for symmetry/auditability.
create or replace function decline_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update bookings set status = 'declined', updated_at = now()
  where id = p_booking_id and status = 'pending';
end;
$$;
