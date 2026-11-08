-- =====================================================================
-- StayZone — 0001 Foundation
-- Extensions, enums, helper functions, profiles, reference data tables.
-- Money is ALWAYS stored as bigint minor units (paisa for PKR).
-- Dates of stay are calendar dates in Asia/Karachi (see README).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;

-- ---------- Enums ----------------------------------------------------
create type public.property_status as enum ('DRAFT','PENDING','APPROVED','REJECTED','CHANGES_REQUESTED','SUSPENDED','ARCHIVED');
create type public.property_category as enum (
  'ENTIRE_HOME','PRIVATE_ROOM','SHARED_ROOM','APARTMENT','SERVICED_APARTMENT','VILLA',
  'FARMHOUSE','GUEST_HOUSE','HOTEL','RESORT','COTTAGE','MOUNTAIN_CABIN','HOSTEL');
create type public.space_type as enum ('ENTIRE_PLACE','PRIVATE_ROOM','SHARED_ROOM');
create type public.booking_mode as enum ('INSTANT','REQUEST');
create type public.booking_status as enum (
  'PENDING','AWAITING_PAYMENT','CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED',
  'REJECTED','EXPIRED','REFUND_PENDING','REFUNDED','DISPUTED');
create type public.payment_status as enum (
  'INITIATED','PENDING','PAID','FAILED','CANCELLED','REFUND_PENDING','REFUNDED','PARTIALLY_REFUNDED');
create type public.verification_status as enum ('PENDING','APPROVED','REJECTED','EXPIRED');
create type public.verification_kind as enum ('IDENTITY','OWNERSHIP','AUTHORIZATION','PROPERTY_LICENCE','BUSINESS_REGISTRATION','OTHER');
create type public.subscription_status as enum ('TRIAL','ACTIVE','PAST_DUE','CANCELLED','EXPIRED');
create type public.payout_status as enum ('PENDING','PROCESSING','PAID','FAILED','CANCELLED');
create type public.refund_status as enum ('REQUESTED','PROCESSING','COMPLETED','FAILED','REJECTED');
create type public.dispute_status as enum ('OPEN','UNDER_REVIEW','RESOLVED','REJECTED');
create type public.cancellation_policy as enum ('FLEXIBLE','MODERATE','STRICT','NON_REFUNDABLE');
create type public.review_status as enum ('PUBLISHED','HIDDEN','REPORTED');
create type public.ledger_account as enum (
  'GUEST_PAYMENT','PLATFORM_COMMISSION','PLATFORM_GUEST_FEE','HOST_PAYABLE','TAX_PAYABLE',
  'REFUND','PAYOUT','ADJUSTMENT','SUBSCRIPTION_REVENUE');

-- ---------- Helpers --------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- Profiles -------------------------------------------------
-- One row per auth user. Role flags are protected by a trigger: users
-- can never grant themselves admin or lift a suspension.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  email extensions.citext,
  phone text check (phone is null or phone ~ '^\+?[0-9 ]{7,20}$'),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 1000),
  preferred_language text not null default 'en' check (preferred_language in ('en','ur')),
  preferred_currency char(3) not null default 'PKR',
  country char(2),
  is_host boolean not null default false,
  is_admin boolean not null default false,
  is_suspended boolean not null default false,
  suspended_reason text,
  phone_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Security-definer role checks (used by RLS; avoid recursive policy lookups)
create or replace function public.is_admin(uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin and not is_suspended from public.profiles where id = uid), false);
$$;

create or replace function public.is_active_user(uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select not is_suspended and deleted_at is null from public.profiles where id = uid), false);
$$;

create or replace function public.protect_profile_privileges() returns trigger
language plpgsql set search_path = public as $$  -- invoker on purpose: current_user must be the caller
begin
  -- service_role (server code) and admins may change privileged fields.
  if coalesce(auth.role(), '') = 'service_role' or public.is_admin() or current_user in ('postgres','supabase_admin') then
    return new;
  end if;
  if new.is_admin is distinct from old.is_admin
     or new.is_suspended is distinct from old.is_suspended
     or new.suspended_reason is distinct from old.suspended_reason
     or new.phone_verified_at is distinct from old.phone_verified_at
     or new.email is distinct from old.email
     or new.id is distinct from old.id then
    raise exception 'Not allowed to change protected profile fields' using errcode = '42501';
  end if;
  -- Becoming a host is allowed; ceasing to be one is an admin action.
  if old.is_host and not new.is_host then
    raise exception 'Host mode can only be removed by support' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- Auto-create a profile when someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, preferred_language)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data->>'full_name', ''), 120),
    new.email,
    case when new.raw_user_meta_data->>'preferred_language' = 'ur' then 'ur' else 'en' end
  )
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Host profiles -------------------------------------------
create table public.host_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  about text check (about is null or char_length(about) <= 2000),
  business_name text,
  host_type text not null default 'INDIVIDUAL' check (host_type in ('INDIVIDUAL','PROPERTY_MANAGER','HOTEL','COMPANY')),
  languages text[] not null default array['en']::text[],
  response_time_hours int check (response_time_hours is null or response_time_hours > 0),
  verification_status public.verification_status not null default 'PENDING',
  verified_at timestamptz,
  payout_method text check (payout_method is null or payout_method in ('BANK','JAZZCASH','EASYPAISA','RAAST')),
  payout_account_title text,
  payout_account_last4 text check (payout_account_last4 is null or payout_account_last4 ~ '^[0-9]{4}$'),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger host_profiles_updated before update on public.host_profiles
  for each row execute function public.set_updated_at();

create or replace function public.protect_host_profile() returns trigger
language plpgsql set search_path = public as $$  -- invoker on purpose: current_user must be the caller
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_admin() or current_user in ('postgres','supabase_admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.verification_status := 'PENDING';
    new.verified_at := null;
  elsif new.verification_status is distinct from old.verification_status
        or new.verified_at is distinct from old.verified_at then
    raise exception 'Verification status is set by the review team' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger host_profiles_protect before insert or update on public.host_profiles
  for each row execute function public.protect_host_profile();

-- ---------- Locations (destinations) --------------------------------
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  name_ur text,
  province text not null,
  country char(2) not null default 'PK',
  latitude numeric(9,6) not null check (latitude between -90 and 90),
  longitude numeric(9,6) not null check (longitude between -180 and 180),
  intro text,
  intro_ur text,
  hero_image_url text,
  popular_areas text[] not null default '{}',
  is_featured boolean not null default false,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger locations_updated before update on public.locations
  for each row execute function public.set_updated_at();

-- ---------- Amenities -----------------------------------------------
create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]+$'),
  name text not null,
  name_ur text,
  icon text not null default 'check',
  grp text not null default 'general',
  is_filterable boolean not null default false,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

-- ---------- Platform settings (admin-editable) ----------------------
create table public.platform_settings (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
create trigger platform_settings_updated before update on public.platform_settings
  for each row execute function public.set_updated_at();

create or replace function public.setting_int(k text, fallback int) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::int from public.platform_settings where key = k), fallback);
$$;

-- ---------- Subscription plans --------------------------------------
create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_]+$'),
  name text not null,
  description text,
  currency char(3) not null default 'PKR',
  monthly_price_minor bigint not null default 0 check (monthly_price_minor >= 0),
  annual_price_minor bigint not null default 0 check (annual_price_minor >= 0),
  listing_allowance int not null check (listing_allowance > 0),
  trial_days int not null default 0 check (trial_days >= 0),
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscription_plans_updated before update on public.subscription_plans
  for each row execute function public.set_updated_at();
