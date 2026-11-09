-- ===== 20261108000001_foundation.sql =====
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


-- ===== 20261108000002_marketplace.sql =====
-- =====================================================================
-- StayZone — 0002 Marketplace: properties, bookable listings (units),
-- photos, amenities, availability, pricing rules, favourites, verifications.
-- =====================================================================

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete restrict,
  location_id uuid references public.locations(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,120}$'),
  title text not null check (char_length(title) between 5 and 120),
  description text not null default '' check (char_length(description) <= 8000),
  category public.property_category not null,
  space_type public.space_type not null default 'ENTIRE_PLACE',
  status public.property_status not null default 'DRAFT',
  status_reason text,
  is_demo boolean not null default false,
  is_featured boolean not null default false,
  -- Address (street address is shown only after booking; area is public)
  address_line text,
  area text,
  city text not null,
  province text not null,
  country char(2) not null default 'PK',
  postal_code text,
  latitude numeric(9,6) check (latitude is null or latitude between -90 and 90),
  longitude numeric(9,6) check (longitude is null or longitude between -180 and 180),
  -- Rules
  check_in_time time not null default '14:00',
  check_out_time time not null default '12:00',
  smoking_allowed boolean not null default false,
  pets_allowed boolean not null default false,
  parties_allowed boolean not null default false,
  children_allowed boolean not null default true,
  infants_allowed boolean not null default true,
  id_required boolean not null default true,
  house_rules text check (house_rules is null or char_length(house_rules) <= 4000),
  -- Commercial defaults (listings may override nightly price)
  currency char(3) not null default 'PKR',
  cancellation_policy public.cancellation_policy not null default 'MODERATE',
  booking_mode public.booking_mode not null default 'REQUEST',
  -- Compliance (configurable per province/category; reviewed by admins)
  licence_status text not null default 'NOT_PROVIDED'
     check (licence_status in ('NOT_PROVIDED','SUBMITTED','VERIFIED','NOT_REQUIRED','EXPIRED')),
  licence_number text,
  licence_expires_on date,
  -- Denormalised stats maintained by triggers
  rating_avg numeric(3,2) not null default 0,
  rating_count int not null default 0,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index properties_public_idx on public.properties (status, city) where deleted_at is null;
create index properties_host_idx on public.properties (host_id);
create index properties_location_idx on public.properties (location_id);
create index properties_title_trgm on public.properties using gin (title extensions.gin_trgm_ops);
create index properties_city_trgm on public.properties using gin (city extensions.gin_trgm_ops);
create trigger properties_updated before update on public.properties
  for each row execute function public.set_updated_at();

-- Hosts can edit content but never self-approve, feature or un-demo.
create or replace function public.protect_property() returns trigger
language plpgsql set search_path = public as $$  -- invoker on purpose: current_user must be the caller
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_admin() or current_user in ('postgres','supabase_admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status not in ('DRAFT','PENDING') then new.status := 'DRAFT'; end if;
    new.is_featured := false; new.is_demo := false;
    new.approved_at := null; new.approved_by := null;
    new.rating_avg := 0; new.rating_count := 0; new.status_reason := null;
    if new.licence_status not in ('NOT_PROVIDED','SUBMITTED') then new.licence_status := 'NOT_PROVIDED'; end if;
    if new.status = 'PENDING' then new.submitted_at := now(); end if;
    return new;
  end if;
  if new.host_id is distinct from old.host_id
     or new.is_featured is distinct from old.is_featured
     or new.is_demo is distinct from old.is_demo
     or new.approved_at is distinct from old.approved_at
     or new.approved_by is distinct from old.approved_by
     or new.rating_avg is distinct from old.rating_avg
     or new.rating_count is distinct from old.rating_count
     or new.status_reason is distinct from old.status_reason then
    raise exception 'Not allowed to change protected property fields' using errcode = '42501';
  end if;
  if new.licence_status is distinct from old.licence_status
     and new.licence_status not in ('NOT_PROVIDED','SUBMITTED') then
    raise exception 'Licence verification is set by the review team' using errcode = '42501';
  end if;
  if new.status is distinct from old.status then
    -- Host-allowed transitions only
    if not (
      (old.status in ('DRAFT','REJECTED','CHANGES_REQUESTED') and new.status = 'PENDING') or
      (old.status = 'PENDING' and new.status = 'DRAFT') or
      (old.status = 'APPROVED' and new.status = 'ARCHIVED') or
      (old.status in ('DRAFT','REJECTED','CHANGES_REQUESTED') and new.status = 'ARCHIVED')
    ) then
      raise exception 'Status change % -> % is not allowed', old.status, new.status using errcode = '42501';
    end if;
    if new.status = 'PENDING' then new.submitted_at := now(); end if;
  elsif old.status = 'APPROVED' and (
      new.title is distinct from old.title or new.description is distinct from old.description
      or new.category is distinct from old.category or new.city is distinct from old.city
      or new.address_line is distinct from old.address_line) then
    -- Material edits to a live listing go back to review.
    new.status := 'PENDING';
    new.submitted_at := now();
  end if;
  return new;
end $$;
create trigger properties_protect before insert or update on public.properties
  for each row execute function public.protect_property();

-- A listing is ONE bookable unit (a whole home, a room, a bed).
-- A hotel with five identical deluxe rooms has five listings sharing a unit_group.
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  unit_group text not null default 'default',
  space_type public.space_type not null default 'ENTIRE_PLACE',
  base_guests int not null default 2 check (base_guests >= 1),
  max_guests int not null check (max_guests between 1 and 50),
  bedrooms int not null default 1 check (bedrooms >= 0),
  beds int not null default 1 check (beds >= 0),
  bathrooms numeric(3,1) not null default 1 check (bathrooms >= 0),
  nightly_price_minor bigint not null check (nightly_price_minor > 0),
  weekend_price_minor bigint check (weekend_price_minor is null or weekend_price_minor > 0),
  cleaning_fee_minor bigint not null default 0 check (cleaning_fee_minor >= 0),
  extra_guest_fee_minor bigint not null default 0 check (extra_guest_fee_minor >= 0),
  security_deposit_minor bigint not null default 0 check (security_deposit_minor >= 0),
  weekly_discount_bps int not null default 0 check (weekly_discount_bps between 0 and 9000),
  monthly_discount_bps int not null default 0 check (monthly_discount_bps between 0 and 9000),
  min_nights int not null default 1 check (min_nights >= 1),
  max_nights int not null default 90 check (max_nights >= 1),
  is_active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (base_guests <= max_guests),
  check (min_nights <= max_nights)
);
create index listings_property_idx on public.listings (property_id) where deleted_at is null;
create trigger listings_updated before update on public.listings
  for each row execute function public.set_updated_at();

create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  storage_path text,          -- path in the property-photos bucket
  url text not null,          -- public/CDN URL used for display
  alt text not null default '',
  width int, height int,
  sort_order int not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);
create index property_photos_property_idx on public.property_photos (property_id, sort_order);
create unique index property_photos_one_cover on public.property_photos (property_id) where is_cover;

-- Amenities: listing_id NULL = applies to the whole property.
create table public.listing_amenities (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index listing_amenities_unique
  on public.listing_amenities (property_id, coalesce(listing_id, '00000000-0000-0000-0000-000000000000'::uuid), amenity_id);
create index listing_amenities_amenity_idx on public.listing_amenities (amenity_id, property_id);

-- Host-blocked dates. Half-open [start, end) date ranges.
create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  span daterange generated always as (daterange(starts_on, ends_on, '[)')) stored,
  reason text not null default 'HOST_BLOCK' check (reason in ('HOST_BLOCK','MAINTENANCE','EXTERNAL_CALENDAR')),
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (ends_on > starts_on),
  constraint availability_blocks_no_overlap exclude using gist (listing_id with =, span with &&)
);

-- Seasonal / date pricing. Highest priority wins for a given night.
create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  span daterange generated always as (daterange(starts_on, ends_on, '[)')) stored,
  nightly_price_minor bigint check (nightly_price_minor is null or nightly_price_minor > 0),
  adjustment_bps int check (adjustment_bps is null or adjustment_bps between -9000 and 50000),
  min_nights int check (min_nights is null or min_nights >= 1),
  priority int not null default 100,
  created_at timestamptz not null default now(),
  check (ends_on > starts_on),
  check ((nightly_price_minor is not null) <> (adjustment_bps is not null))
);
create index pricing_rules_span_idx on public.pricing_rules using gist (listing_id, span);

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

-- Identity / ownership / licence documents. Files live in a PRIVATE bucket.
create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  kind public.verification_kind not null,
  status public.verification_status not null default 'PENDING',
  document_path text not null,          -- storage path in verification-docs bucket
  document_number_last4 text check (document_number_last4 is null or document_number_last4 ~ '^[0-9A-Za-z]{1,4}$'),
  province text,
  expires_on date,
  notes text,
  reviewer_id uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index verifications_status_idx on public.verifications (status, created_at);
create trigger verifications_updated before update on public.verifications
  for each row execute function public.set_updated_at();

-- Compliance requirements configurable by province + category.
create table public.compliance_requirements (
  id uuid primary key default gen_random_uuid(),
  province text not null,            -- '*' = all provinces
  category public.property_category, -- null = all categories
  kind public.verification_kind not null,
  is_required boolean not null default true,
  description text not null,
  created_at timestamptz not null default now()
);


-- ===== 20261108000003_bookings_finance.sql =====
-- =====================================================================
-- StayZone — 0003 Bookings, payments, ledger, reviews, messaging,
-- subscriptions, disputes, notifications, webhooks, audit.
-- =====================================================================

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  property_id uuid not null references public.properties(id) on delete restrict,
  listing_id uuid not null references public.listings(id) on delete restrict,
  guest_id uuid not null references public.profiles(id) on delete restrict,
  host_id uuid not null references public.profiles(id) on delete restrict,
  check_in date not null,
  check_out date not null,
  stay daterange generated always as (daterange(check_in, check_out, '[)')) stored,
  nights int generated always as (check_out - check_in) stored,
  adults int not null check (adults >= 1),
  children int not null default 0 check (children >= 0),
  infants int not null default 0 check (infants >= 0),
  booking_mode public.booking_mode not null,
  status public.booking_status not null,
  hold_expires_at timestamptz,
  guest_message text check (guest_message is null or char_length(guest_message) <= 2000),
  -- Price snapshot (minor units). Computed by quote_booking() on the server.
  currency char(3) not null,
  accommodation_minor bigint not null check (accommodation_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  cleaning_fee_minor bigint not null default 0 check (cleaning_fee_minor >= 0),
  extra_guest_fee_minor bigint not null default 0 check (extra_guest_fee_minor >= 0),
  guest_fee_minor bigint not null default 0 check (guest_fee_minor >= 0),
  tax_minor bigint not null default 0 check (tax_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  host_commission_minor bigint not null default 0 check (host_commission_minor >= 0),
  host_payout_minor bigint not null check (host_payout_minor >= 0),
  guest_fee_bps int not null,
  host_commission_bps int not null,
  tax_bps int not null default 0,
  price_breakdown jsonb not null default '{}'::jsonb,
  cancellation_policy public.cancellation_policy not null,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id),
  cancellation_reason text,
  confirmed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in),
  check (guest_id <> host_id),
  check (total_minor = accommodation_minor - discount_minor + cleaning_fee_minor + extra_guest_fee_minor + guest_fee_minor + tax_minor),
  -- THE double-booking guarantee: no two live bookings may overlap on one unit.
  constraint bookings_no_overlap exclude using gist (listing_id with =, stay with &&)
    where (status in ('PENDING','AWAITING_PAYMENT','CONFIRMED','CHECKED_IN','DISPUTED'))
);
create index bookings_guest_idx on public.bookings (guest_id, check_in desc);
create index bookings_host_idx on public.bookings (host_id, check_in desc);
create index bookings_hold_idx on public.bookings (hold_expires_at) where status in ('PENDING','AWAITING_PAYMENT');
create trigger bookings_updated before update on public.bookings
  for each row execute function public.set_updated_at();

create table public.booking_guests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  full_name text not null,
  is_primary boolean not null default false,
  age_group text not null default 'ADULT' check (age_group in ('ADULT','CHILD','INFANT')),
  nationality char(2),
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete restrict,
  subscription_id uuid,
  payer_id uuid not null references public.profiles(id),
  provider text not null,                 -- 'sandbox','safepay','payfast',...
  provider_reference text,                -- provider's transaction / tracker id
  idempotency_key text not null unique,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  status public.payment_status not null default 'INITIATED',
  is_test boolean not null default false,
  failure_reason text,
  paid_at timestamptz,
  raw_status jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((booking_id is not null) <> (subscription_id is not null))
);
create unique index payments_provider_ref_unique on public.payments (provider, provider_reference) where provider_reference is not null;
create index payments_booking_idx on public.payments (booking_id);
create trigger payments_updated before update on public.payments
  for each row execute function public.set_updated_at();

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  status public.refund_status not null default 'REQUESTED',
  reason text,
  provider_reference text,
  requested_by uuid references public.profiles(id),
  processed_by uuid references public.profiles(id),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger refunds_updated before update on public.refunds
  for each row execute function public.set_updated_at();

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  status public.payout_status not null default 'PENDING',
  method text,
  reference text,
  period_start date, period_end date,
  processed_by uuid references public.profiles(id),
  processed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger payouts_updated before update on public.payouts
  for each row execute function public.set_updated_at();

-- Double-entry style ledger. Rows are append-only (no update/delete policy).
create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  entry_group uuid not null,               -- all legs of one event share this
  account public.ledger_account not null,
  amount_minor bigint not null,            -- +credit to account / -debit
  currency char(3) not null,
  booking_id uuid references public.bookings(id),
  payment_id uuid references public.payments(id),
  refund_id uuid references public.refunds(id),
  payout_id uuid references public.payouts(id),
  host_id uuid references public.profiles(id),
  memo text,
  created_at timestamptz not null default now()
);
create index ledger_host_idx on public.ledger_entries (host_id, account);
create index ledger_booking_idx on public.ledger_entries (booking_id);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text,
  payload jsonb not null,
  signature_valid boolean not null,
  processed_at timestamptz,
  error text,
  received_at timestamptz not null default now(),
  unique (provider, event_id)                -- idempotency
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  guest_id uuid not null references public.profiles(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  overall smallint not null check (overall between 1 and 5),
  cleanliness smallint check (cleanliness between 1 and 5),
  accuracy smallint check (accuracy between 1 and 5),
  location smallint check (location between 1 and 5),
  communication smallint check (communication between 1 and 5),
  value smallint check (value between 1 and 5),
  body text check (body is null or char_length(body) <= 3000),
  host_response text check (host_response is null or char_length(host_response) <= 2000),
  host_responded_at timestamptz,
  status public.review_status not null default 'PUBLISHED',
  is_demo boolean not null default false,
  demo_author_name text,
  report_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_property_idx on public.reviews (property_id, created_at desc) where status = 'PUBLISHED';
create trigger reviews_updated before update on public.reviews
  for each row execute function public.set_updated_at();

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  guest_id uuid not null references public.profiles(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  check (guest_id <> host_id)
);
create unique index conversations_unique on public.conversations (guest_id, host_id, coalesce(property_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  attachment_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create table public.host_subscriptions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status public.subscription_status not null,
  billing_interval text not null default 'MONTHLY' check (billing_interval in ('MONTHLY','ANNUAL')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index host_subscriptions_one_live on public.host_subscriptions (host_id)
  where status in ('TRIAL','ACTIVE','PAST_DUE');
create trigger host_subscriptions_updated before update on public.host_subscriptions
  for each row execute function public.set_updated_at();
alter table public.payments add constraint payments_subscription_fk
  foreign key (subscription_id) references public.host_subscriptions(id);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  opened_by uuid not null references public.profiles(id),
  reason text not null check (char_length(reason) between 10 and 4000),
  status public.dispute_status not null default 'OPEN',
  resolution text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger disputes_updated before update on public.disputes
  for each row execute function public.set_updated_at();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- Rating aggregate maintenance
create or replace function public.refresh_property_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.property_id, old.property_id);
begin
  update public.properties p set
    rating_avg = coalesce((select round(avg(overall)::numeric, 2) from public.reviews r where r.property_id = pid and r.status = 'PUBLISHED'), 0),
    rating_count = (select count(*) from public.reviews r where r.property_id = pid and r.status = 'PUBLISHED')
  where p.id = pid;
  return null;
end $$;
create trigger reviews_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_property_rating();


-- ===== 20261108000004_booking_engine.sql =====
-- =====================================================================
-- StayZone — 0004 Booking engine & search (server-side, transactional)
-- All prices are computed HERE, never trusted from the browser.
-- Stay dates are calendar dates; "today" = Asia/Karachi local date.
-- =====================================================================

create or replace function public.pk_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Karachi')::date $$;

-- Live statuses that hold inventory (must match bookings_no_overlap).
create or replace function public.booking_holds_inventory(s public.booking_status) returns boolean
language sql immutable as $$
  select s in ('PENDING','AWAITING_PAYMENT','CONFIRMED','CHECKED_IN','DISPUTED')
$$;

-- Release inventory held by expired holds. Safe to call often (cron / before booking).
create or replace function public.expire_stale_bookings(p_listing uuid default null) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with x as (
    update public.bookings set status = 'EXPIRED', hold_expires_at = null
    where status in ('PENDING','AWAITING_PAYMENT')
      and hold_expires_at is not null and hold_expires_at < now()
      and (p_listing is null or listing_id = p_listing)
    returning id, guest_id
  ), n1 as (
    insert into public.notifications (user_id, type, title, body, link)
    select guest_id, 'BOOKING_EXPIRED', 'Reservation hold expired',
           'Your reservation was not completed in time and the dates have been released.',
           '/account/bookings/' || id
    from x returning 1
  )
  select count(*) into n from x;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- quote_booking: full server-side price calculation. Raises on any
-- invalid input. Returns a jsonb snapshot stored on the booking.
-- ---------------------------------------------------------------------
create or replace function public.quote_booking(
  p_listing uuid, p_check_in date, p_check_out date,
  p_adults int, p_children int default 0, p_infants int default 0
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  l public.listings%rowtype;
  p public.properties%rowtype;
  d date;
  night_price bigint;
  rule record;
  nightly jsonb := '[]'::jsonb;
  accommodation bigint := 0;
  discount_bps int := 0;
  discount bigint := 0;
  extra_guests int;
  extra_fee bigint := 0;
  subtotal bigint;
  guest_fee_bps int := public.setting_int('fees.guest_service_bps', 400);
  commission_bps int := public.setting_int('fees.host_commission_bps', 800);
  tax_bps int := public.setting_int('fees.tax_bps', 0);
  guest_fee bigint; commission bigint; tax bigint; total bigint;
  nights int;
  min_n int; max_n int;
  rule_min int;
begin
  if p_check_in is null or p_check_out is null then
    raise exception 'DATES_REQUIRED' using errcode = '22023';
  end if;
  if p_check_out <= p_check_in then
    raise exception 'CHECKOUT_BEFORE_CHECKIN' using errcode = '22023';
  end if;
  if p_check_in < public.pk_today() then
    raise exception 'CHECKIN_IN_PAST' using errcode = '22023';
  end if;
  if p_check_in > public.pk_today() + public.setting_int('booking.max_advance_days', 540) then
    raise exception 'CHECKIN_TOO_FAR' using errcode = '22023';
  end if;
  if coalesce(p_adults,0) < 1 or coalesce(p_children,0) < 0 or coalesce(p_infants,0) < 0 then
    raise exception 'INVALID_GUESTS' using errcode = '22023';
  end if;

  select * into l from public.listings where id = p_listing and deleted_at is null and is_active;
  if not found then raise exception 'LISTING_NOT_FOUND' using errcode = 'P0002'; end if;
  select * into p from public.properties where id = l.property_id and deleted_at is null and status = 'APPROVED';
  if not found then raise exception 'PROPERTY_NOT_BOOKABLE' using errcode = 'P0002'; end if;

  if p_adults + p_children > l.max_guests then
    raise exception 'TOO_MANY_GUESTS' using errcode = '22023';
  end if;
  if p_children > 0 and not p.children_allowed then raise exception 'CHILDREN_NOT_ALLOWED' using errcode = '22023'; end if;
  if p_infants > 0 and not p.infants_allowed then raise exception 'INFANTS_NOT_ALLOWED' using errcode = '22023'; end if;

  nights := p_check_out - p_check_in;
  select max(r.min_nights) into rule_min from public.pricing_rules r
   where r.listing_id = l.id and r.span && daterange(p_check_in, p_check_out, '[)') and r.min_nights is not null;
  min_n := greatest(l.min_nights, coalesce(rule_min, 1));
  max_n := l.max_nights;
  if nights < min_n then raise exception 'MIN_NIGHTS:%', min_n using errcode = '22023'; end if;
  if nights > max_n then raise exception 'MAX_NIGHTS:%', max_n using errcode = '22023'; end if;

  d := p_check_in;
  while d < p_check_out loop
    -- Friday & Saturday nights use weekend price when set.
    night_price := case when extract(isodow from d) in (5,6) and l.weekend_price_minor is not null
                        then l.weekend_price_minor else l.nightly_price_minor end;
    select r.nightly_price_minor, r.adjustment_bps into rule
      from public.pricing_rules r
     where r.listing_id = l.id and r.span @> d
     order by r.priority desc, r.created_at desc limit 1;
    if found then
      if rule.nightly_price_minor is not null then
        night_price := rule.nightly_price_minor;
      else
        night_price := round(night_price * (10000 + rule.adjustment_bps) / 10000.0)::bigint;
      end if;
    end if;
    nightly := nightly || jsonb_build_object('date', d, 'price_minor', night_price);
    accommodation := accommodation + night_price;
    d := d + 1;
  end loop;

  discount_bps := case when nights >= 28 then l.monthly_discount_bps
                       when nights >= 7 then l.weekly_discount_bps else 0 end;
  discount := round(accommodation * discount_bps / 10000.0)::bigint;
  extra_guests := greatest(0, p_adults + p_children - l.base_guests);
  extra_fee := extra_guests * l.extra_guest_fee_minor * nights;
  subtotal := accommodation - discount + l.cleaning_fee_minor + extra_fee;
  guest_fee := round(subtotal * guest_fee_bps / 10000.0)::bigint;
  commission := round(subtotal * commission_bps / 10000.0)::bigint;
  tax := round((subtotal + guest_fee) * tax_bps / 10000.0)::bigint;
  total := subtotal + guest_fee + tax;

  return jsonb_build_object(
    'listing_id', l.id, 'property_id', p.id, 'host_id', p.host_id,
    'currency', p.currency, 'check_in', p_check_in, 'check_out', p_check_out, 'nights', nights,
    'adults', p_adults, 'children', p_children, 'infants', p_infants,
    'nightly', nightly,
    'accommodation_minor', accommodation,
    'discount_bps', discount_bps, 'discount_minor', discount,
    'cleaning_fee_minor', l.cleaning_fee_minor,
    'extra_guests', extra_guests, 'extra_guest_fee_minor', extra_fee,
    'subtotal_minor', subtotal,
    'guest_fee_bps', guest_fee_bps, 'guest_fee_minor', guest_fee,
    'tax_bps', tax_bps, 'tax_minor', tax,
    'total_minor', total,
    'host_commission_bps', commission_bps, 'host_commission_minor', commission,
    'host_payout_minor', subtotal - commission,
    'security_deposit_minor', l.security_deposit_minor,
    'booking_mode', p.booking_mode, 'cancellation_policy', p.cancellation_policy
  );
end $$;

-- Is a specific unit free for [check_in, check_out)?
create or replace function public.listing_is_available(p_listing uuid, p_check_in date, p_check_out date)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.bookings b
     where b.listing_id = p_listing and public.booking_holds_inventory(b.status)
       and b.stay && daterange(p_check_in, p_check_out, '[)')
       and not (b.status in ('PENDING','AWAITING_PAYMENT') and b.hold_expires_at is not null and b.hold_expires_at < now())
  ) and not exists (
    select 1 from public.availability_blocks a
     where a.listing_id = p_listing and a.span && daterange(p_check_in, p_check_out, '[)')
  );
$$;

-- ---------------------------------------------------------------------
-- create_booking: atomically reserve ONE free unit in a unit group.
-- Concurrency: listing rows are locked FOR UPDATE, and the
-- bookings_no_overlap exclusion constraint is the final guarantee.
-- ---------------------------------------------------------------------
create or replace function public.create_booking(
  p_property uuid, p_unit_group text, p_check_in date, p_check_out date,
  p_adults int, p_children int default 0, p_infants int default 0,
  p_message text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  prop public.properties%rowtype;
  cand record;
  q jsonb;
  new_id uuid; new_code text;
  st public.booking_status;
  hold_until timestamptz;
  last_err text := 'DATES_UNAVAILABLE';
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.is_active_user(uid) then raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501'; end if;
  if not exists (select 1 from auth.users u where u.id = uid and u.email_confirmed_at is not null) then
    raise exception 'EMAIL_NOT_VERIFIED' using errcode = '42501';
  end if;

  select * into prop from public.properties where id = p_property and status = 'APPROVED' and deleted_at is null;
  if not found then raise exception 'PROPERTY_NOT_BOOKABLE' using errcode = 'P0002'; end if;
  if prop.is_demo and not coalesce((select (value #>> '{}')::boolean from public.platform_settings where key = 'demo.allow_bookings'), false) then
    raise exception 'DEMO_LISTING' using errcode = '42501';
  end if;
  if prop.host_id = uid then raise exception 'CANNOT_BOOK_OWN_PROPERTY' using errcode = '42501'; end if;

  -- Limit unpaid holds per guest (abuse protection)
  if (select count(*) from public.bookings where guest_id = uid and status in ('PENDING','AWAITING_PAYMENT')
        and (hold_expires_at is null or hold_expires_at > now())) >= public.setting_int('booking.max_open_holds', 3) then
    raise exception 'TOO_MANY_OPEN_HOLDS' using errcode = '42501';
  end if;

  for cand in
    select l.id from public.listings l
     where l.property_id = prop.id and l.unit_group = coalesce(p_unit_group, 'default')
       and l.is_active and l.deleted_at is null
     order by l.sort_order, l.id
     for update
  loop
    perform public.expire_stale_bookings(cand.id);
    if not public.listing_is_available(cand.id, p_check_in, p_check_out) then
      continue;
    end if;
    q := public.quote_booking(cand.id, p_check_in, p_check_out, p_adults, coalesce(p_children,0), coalesce(p_infants,0));

    if prop.booking_mode = 'INSTANT' then
      st := 'AWAITING_PAYMENT';
      hold_until := now() + make_interval(mins => public.setting_int('booking.payment_hold_minutes', 20));
    else
      st := 'PENDING';
      hold_until := now() + make_interval(hours => public.setting_int('booking.request_response_hours', 24));
    end if;

    begin
      insert into public.bookings (
        property_id, listing_id, guest_id, host_id, check_in, check_out,
        adults, children, infants, booking_mode, status, hold_expires_at, guest_message,
        currency, accommodation_minor, discount_minor, cleaning_fee_minor, extra_guest_fee_minor,
        guest_fee_minor, tax_minor, total_minor, host_commission_minor, host_payout_minor,
        guest_fee_bps, host_commission_bps, tax_bps, price_breakdown, cancellation_policy)
      values (
        prop.id, cand.id, uid, prop.host_id, p_check_in, p_check_out,
        p_adults, coalesce(p_children,0), coalesce(p_infants,0), prop.booking_mode, st, hold_until,
        nullif(left(trim(p_message), 2000), ''),
        q->>'currency', (q->>'accommodation_minor')::bigint, (q->>'discount_minor')::bigint,
        (q->>'cleaning_fee_minor')::bigint, (q->>'extra_guest_fee_minor')::bigint,
        (q->>'guest_fee_minor')::bigint, (q->>'tax_minor')::bigint, (q->>'total_minor')::bigint,
        (q->>'host_commission_minor')::bigint, (q->>'host_payout_minor')::bigint,
        (q->>'guest_fee_bps')::int, (q->>'host_commission_bps')::int, (q->>'tax_bps')::int,
        q, prop.cancellation_policy)
      returning id, code into new_id, new_code;
    exception when exclusion_violation then
      last_err := 'DATES_UNAVAILABLE';
      continue;  -- another request won this unit; try the next one
    end;

    insert into public.notifications (user_id, type, title, body, link) values
      (prop.host_id,
       case when st = 'PENDING' then 'BOOKING_REQUEST' else 'BOOKING_STARTED' end,
       case when st = 'PENDING' then 'New booking request' else 'New reservation in progress' end,
       prop.title || ' · ' || to_char(p_check_in, 'DD Mon') || ' – ' || to_char(p_check_out, 'DD Mon YYYY'),
       '/host/bookings');
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, after)
      values (uid, 'booking.create', 'booking', new_id::text, jsonb_build_object('status', st, 'total_minor', q->'total_minor'));

    return jsonb_build_object('id', new_id, 'code', new_code, 'status', st, 'hold_expires_at', hold_until, 'quote', q);
  end loop;

  raise exception '%', last_err using errcode = 'P0001';
end $$;

-- Host accepts or rejects a request-to-book.
create or replace function public.host_respond_booking(p_booking uuid, p_accept boolean, p_reason text default null)
returns public.booking_status
language plpgsql security definer set search_path = public as $$
declare b public.bookings%rowtype; uid uuid := auth.uid(); new_st public.booking_status;
begin
  select * into b from public.bookings where id = p_booking for update;
  if not found or (b.host_id <> uid and not public.is_admin()) then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if b.status <> 'PENDING' or (b.hold_expires_at is not null and b.hold_expires_at < now()) then
    raise exception 'NOT_PENDING' using errcode = '22023';
  end if;
  if p_accept then
    new_st := 'AWAITING_PAYMENT';
    update public.bookings set status = new_st,
      hold_expires_at = now() + make_interval(hours => public.setting_int('booking.accepted_payment_hours', 12))
     where id = b.id;
  else
    new_st := 'REJECTED';
    update public.bookings set status = new_st, hold_expires_at = null,
      cancellation_reason = nullif(left(trim(p_reason), 500), ''), cancelled_by = uid, cancelled_at = now()
     where id = b.id;
  end if;
  insert into public.notifications (user_id, type, title, body, link) values (
    b.guest_id,
    case when p_accept then 'BOOKING_ACCEPTED' else 'BOOKING_REJECTED' end,
    case when p_accept then 'Your request was accepted — complete payment' else 'Your booking request was declined' end,
    null, '/account/bookings/' || b.id);
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (uid, 'booking.host_respond', 'booking', b.id::text,
            jsonb_build_object('status', b.status), jsonb_build_object('status', new_st));
  return new_st;
end $$;

-- Cancellation before payment (unpaid holds/requests). Paid cancellations
-- with refunds are handled by the payments module (Phase 5).
create or replace function public.cancel_unpaid_booking(p_booking uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings%rowtype; uid uuid := auth.uid();
begin
  select * into b from public.bookings where id = p_booking for update;
  if not found or (b.guest_id <> uid and b.host_id <> uid and not public.is_admin()) then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if b.status not in ('PENDING','AWAITING_PAYMENT') then
    raise exception 'NOT_CANCELLABLE_HERE' using errcode = '22023';
  end if;
  if exists (select 1 from public.payments where booking_id = b.id and status = 'PAID') then
    raise exception 'PAID_USE_REFUND_FLOW' using errcode = '22023';
  end if;
  update public.bookings set status = 'CANCELLED', hold_expires_at = null, cancelled_at = now(),
    cancelled_by = uid, cancellation_reason = nullif(left(trim(p_reason), 500), '')
   where id = b.id;
  insert into public.notifications (user_id, type, title, link)
  values (case when uid = b.guest_id then b.host_id else b.guest_id end, 'BOOKING_CANCELLED',
          'A booking was cancelled', case when uid = b.guest_id then '/host/bookings' else '/account/bookings/' || b.id end);
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (uid, 'booking.cancel_unpaid', 'booking', b.id::text,
            jsonb_build_object('status', b.status), jsonb_build_object('status', 'CANCELLED'));
end $$;

-- ---------------------------------------------------------------------
-- search_properties: public search over APPROVED properties only.
-- Availability is respected when dates are given.
-- ---------------------------------------------------------------------
create or replace function public.search_properties(
  p_query text default null,
  p_location_slug text default null,
  p_check_in date default null,
  p_check_out date default null,
  p_guests int default 1,
  p_categories public.property_category[] default null,
  p_space_types public.space_type[] default null,
  p_min_price bigint default null,
  p_max_price bigint default null,
  p_bedrooms int default null,
  p_bathrooms numeric default null,
  p_amenities text[] default null,
  p_instant_only boolean default false,
  p_verified_only boolean default false,
  p_min_rating numeric default null,
  p_include_demo boolean default false,
  p_sort text default 'recommended',
  p_limit int default 24,
  p_offset int default 0
) returns table (
  id uuid, slug text, title text, category public.property_category, space_type public.space_type,
  city text, province text, area text, location_slug text, latitude numeric, longitude numeric,
  cover_url text, price_from_minor bigint, currency char(3), max_guests int, bedrooms int, bathrooms numeric,
  rating_avg numeric, rating_count int, booking_mode public.booking_mode, host_verified boolean,
  is_demo boolean, is_featured boolean, total_count bigint
)
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  has_dates boolean := p_check_in is not null and p_check_out is not null and p_check_out > p_check_in;
  q text := nullif(trim(p_query), '');
begin
  if p_limit > 60 then p_limit := 60; end if;
  if p_limit < 1 then p_limit := 1; end if;
  if p_offset < 0 then p_offset := 0; end if;

  return query
  with eligible as (
    select l.property_id, min(l.nightly_price_minor) as price_from, max(l.max_guests) as max_g,
           max(l.bedrooms) as beds, max(l.bathrooms) as baths
      from public.listings l
     where l.is_active and l.deleted_at is null
       and l.max_guests >= greatest(coalesce(p_guests,1),1)
       and (not has_dates or (
              (p_check_out - p_check_in) between l.min_nights and l.max_nights
              and public.listing_is_available(l.id, p_check_in, p_check_out)))
     group by l.property_id
  ), base as (
    select p.*, e.price_from, e.max_g, e.beds, e.baths, loc.slug as loc_slug,
           coalesce(hp.verification_status = 'APPROVED', false) as h_verified
      from public.properties p
      join eligible e on e.property_id = p.id
      left join public.locations loc on loc.id = p.location_id
      left join public.host_profiles hp on hp.id = p.host_id
      join public.profiles hostp on hostp.id = p.host_id and not hostp.is_suspended
     where p.status = 'APPROVED' and p.deleted_at is null
       and (p_include_demo or not p.is_demo)
       and (p_location_slug is null or loc.slug = p_location_slug)
       and (q is null or p.city ilike '%' || q || '%' or p.title ilike '%' || q || '%'
            or p.area ilike '%' || q || '%' or p.province ilike '%' || q || '%'
            or loc.name ilike '%' || q || '%')
       and (p_categories is null or p.category = any(p_categories))
       and (p_space_types is null or p.space_type = any(p_space_types))
       and (p_min_price is null or e.price_from >= p_min_price)
       and (p_max_price is null or e.price_from <= p_max_price)
       and (p_bedrooms is null or e.beds >= p_bedrooms)
       and (p_bathrooms is null or e.baths >= p_bathrooms)
       and (not p_instant_only or p.booking_mode = 'INSTANT')
       and (not p_verified_only or coalesce(hp.verification_status = 'APPROVED', false))
       and (p_min_rating is null or p.rating_avg >= p_min_rating)
       and (p_amenities is null or cardinality(p_amenities) = 0 or (
             select count(distinct a.code) from public.listing_amenities la
               join public.amenities a on a.id = la.amenity_id
              where la.property_id = p.id and a.code = any(p_amenities)) = cardinality(p_amenities))
  )
  select b.id, b.slug, b.title, b.category, b.space_type, b.city, b.province, b.area, b.loc_slug,
         b.latitude, b.longitude,
         (select ph.url from public.property_photos ph where ph.property_id = b.id
           order by ph.is_cover desc, ph.sort_order limit 1),
         b.price_from, b.currency, b.max_g, b.beds, b.baths, b.rating_avg, b.rating_count,
         b.booking_mode, b.h_verified, b.is_demo, b.is_featured,
         count(*) over ()
    from base b
   order by
     case when p_sort = 'price_asc' then b.price_from end asc nulls last,
     case when p_sort = 'price_desc' then b.price_from end desc nulls last,
     case when p_sort = 'rating' then b.rating_avg end desc nulls last,
     case when p_sort = 'reviews' then b.rating_count end desc nulls last,
     -- recommended: featured, verified, rating weighted by volume
     case when p_sort not in ('price_asc','price_desc','rating','reviews') then
       (b.is_featured::int * 2 + b.h_verified::int + b.rating_avg * least(b.rating_count, 20) / 20.0) end desc nulls last,
     b.approved_at desc nulls last, b.id
   limit p_limit offset p_offset;
end $$;

-- Grants: only these RPCs are callable by clients.
revoke all on function public.expire_stale_bookings(uuid) from public, anon, authenticated;
revoke all on function public.create_booking(uuid, text, date, date, int, int, int, text) from public, anon;
revoke all on function public.host_respond_booking(uuid, boolean, text) from public, anon;
revoke all on function public.cancel_unpaid_booking(uuid, text) from public, anon;
grant execute on function public.create_booking(uuid, text, date, date, int, int, int, text) to authenticated;
grant execute on function public.host_respond_booking(uuid, boolean, text) to authenticated;
grant execute on function public.cancel_unpaid_booking(uuid, text) to authenticated;
grant execute on function public.quote_booking(uuid, date, date, int, int, int) to anon, authenticated;
grant execute on function public.search_properties(text, text, date, date, int, public.property_category[], public.space_type[], bigint, bigint, int, numeric, text[], boolean, boolean, numeric, boolean, text, int, int) to anon, authenticated;
grant execute on function public.expire_stale_bookings(uuid) to service_role;
grant execute on function public.listing_is_available(uuid, date, date) to anon, authenticated;


-- ===== 20261108000005_rls.sql =====
-- =====================================================================
-- StayZone — 0005 Row Level Security
-- Default deny: RLS is enabled on EVERY table. Writes that need business
-- rules go through SECURITY DEFINER functions or the server (service role).
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','host_profiles','locations','amenities','platform_settings','subscription_plans',
    'properties','listings','property_photos','listing_amenities','availability_blocks','pricing_rules',
    'favorites','verifications','compliance_requirements','bookings','booking_guests','payments','refunds',
    'payouts','ledger_entries','webhook_events','reviews','conversations','messages','host_subscriptions',
    'disputes','notifications','audit_logs']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Helper: does the current user own this property?
create or replace function public.owns_property(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.properties where id = pid and host_id = auth.uid());
$$;
create or replace function public.owns_listing(lid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.listings l join public.properties p on p.id = l.property_id
                  where l.id = lid and p.host_id = auth.uid());
$$;
create or replace function public.property_is_public(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.properties p join public.profiles h on h.id = p.host_id
                  where p.id = pid and p.status = 'APPROVED' and p.deleted_at is null and not h.is_suspended);
$$;
create or replace function public.in_conversation(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversations c where c.id = cid and auth.uid() in (c.guest_id, c.host_id));
$$;

-- ---------- profiles ----------
create policy profiles_self_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
-- Public host card info is exposed via the public_host_cards view (below), not this table.

-- ---------- host_profiles ----------
create policy host_profiles_read on public.host_profiles for select
  using (id = auth.uid() or public.is_admin() or exists (
    select 1 from public.properties p where p.host_id = host_profiles.id and public.property_is_public(p.id)));
create policy host_profiles_insert on public.host_profiles for insert to authenticated
  with check (id = auth.uid() and public.is_active_user());
create policy host_profiles_update on public.host_profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- ---------- reference data (public read, admin write) ----------
create policy locations_read on public.locations for select using (true);
create policy locations_admin on public.locations for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy amenities_read on public.amenities for select using (true);
create policy amenities_admin on public.amenities for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy plans_read on public.subscription_plans for select using (is_active or public.is_admin());
create policy plans_admin on public.subscription_plans for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy compliance_read on public.compliance_requirements for select using (true);
create policy compliance_admin on public.compliance_requirements for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Settings: only keys prefixed 'public.' or 'fees.' are readable by everyone.
create policy settings_read on public.platform_settings for select
  using (key like 'public.%' or key like 'fees.%' or key like 'demo.%' or public.is_admin());
create policy settings_admin on public.platform_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- properties ----------
create policy properties_public_read on public.properties for select
  using (public.property_is_public(id) or host_id = auth.uid() or public.is_admin());
create policy properties_host_insert on public.properties for insert to authenticated
  with check (host_id = auth.uid() and public.is_active_user()
              and exists (select 1 from public.profiles where id = auth.uid() and is_host));
create policy properties_host_update on public.properties for update to authenticated
  using (host_id = auth.uid() or public.is_admin()) with check (host_id = auth.uid() or public.is_admin());
-- No hard deletes by hosts: archive instead (status = ARCHIVED / deleted_at).

-- ---------- listings / photos / amenities / pricing / blocks ----------
create policy listings_read on public.listings for select
  using (public.property_is_public(property_id) or public.owns_property(property_id) or public.is_admin());
create policy listings_host_write on public.listings for all to authenticated
  using (public.owns_property(property_id) or public.is_admin())
  with check (public.owns_property(property_id) or public.is_admin());

create policy photos_read on public.property_photos for select
  using (public.property_is_public(property_id) or public.owns_property(property_id) or public.is_admin());
create policy photos_host_write on public.property_photos for all to authenticated
  using (public.owns_property(property_id) or public.is_admin())
  with check (public.owns_property(property_id) or public.is_admin());

create policy la_read on public.listing_amenities for select
  using (public.property_is_public(property_id) or public.owns_property(property_id) or public.is_admin());
create policy la_host_write on public.listing_amenities for all to authenticated
  using (public.owns_property(property_id) or public.is_admin())
  with check (public.owns_property(property_id) or public.is_admin());

create policy pricing_read on public.pricing_rules for select to authenticated
  using (public.owns_listing(listing_id) or public.is_admin());
create policy pricing_host_write on public.pricing_rules for all to authenticated
  using (public.owns_listing(listing_id) or public.is_admin())
  with check (public.owns_listing(listing_id) or public.is_admin());

create policy blocks_read on public.availability_blocks for select to authenticated
  using (public.owns_listing(listing_id) or public.is_admin());
create policy blocks_host_write on public.availability_blocks for all to authenticated
  using (public.owns_listing(listing_id) or public.is_admin())
  with check (public.owns_listing(listing_id) or public.is_admin());

-- ---------- favorites ----------
create policy favorites_own on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- verifications (documents are private) ----------
create policy verifications_read on public.verifications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy verifications_insert on public.verifications for insert to authenticated
  with check (user_id = auth.uid() and status = 'PENDING' and reviewer_id is null and reviewed_at is null
              and (property_id is null or public.owns_property(property_id)));
create policy verifications_admin on public.verifications for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- bookings: read only; writes via RPC functions ----------
create policy bookings_read on public.bookings for select to authenticated
  using (guest_id = auth.uid() or host_id = auth.uid() or public.is_admin());
create policy booking_guests_read on public.booking_guests for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id
                 and (b.guest_id = auth.uid() or b.host_id = auth.uid())) or public.is_admin());
create policy booking_guests_insert on public.booking_guests for insert to authenticated
  with check (exists (select 1 from public.bookings b where b.id = booking_id and b.guest_id = auth.uid()
                      and b.status in ('PENDING','AWAITING_PAYMENT')));

-- ---------- money: read-only to the parties; writes are server-only ----------
create policy payments_read on public.payments for select to authenticated
  using (payer_id = auth.uid() or public.is_admin()
         or exists (select 1 from public.bookings b where b.id = booking_id and b.host_id = auth.uid()));
create policy refunds_read on public.refunds for select to authenticated
  using (public.is_admin() or exists (select 1 from public.bookings b where b.id = booking_id
                                      and auth.uid() in (b.guest_id, b.host_id)));
create policy payouts_read on public.payouts for select to authenticated
  using (host_id = auth.uid() or public.is_admin());
create policy ledger_read on public.ledger_entries for select to authenticated
  using ((host_id = auth.uid() and account in ('HOST_PAYABLE','PAYOUT')) or public.is_admin());
create policy webhooks_admin on public.webhook_events for select to authenticated using (public.is_admin());

-- ---------- reviews ----------
create policy reviews_public_read on public.reviews for select
  using (status = 'PUBLISHED' or guest_id = auth.uid() or host_id = auth.uid() or public.is_admin());
create policy reviews_guest_insert on public.reviews for insert to authenticated
  with check (guest_id = auth.uid() and status = 'PUBLISHED' and not is_demo and host_response is null
    and exists (select 1 from public.bookings b where b.id = booking_id and b.guest_id = auth.uid()
                and b.status = 'COMPLETED' and b.property_id = reviews.property_id and b.host_id = reviews.host_id
                and b.check_out >= public.pk_today() - public.setting_int('reviews.window_days', 30)));
create policy reviews_admin on public.reviews for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- Host responses go through respond_to_review() to restrict which columns change.

-- ---------- messaging ----------
create policy conversations_read on public.conversations for select to authenticated
  using (auth.uid() in (guest_id, host_id) or public.is_admin());
create policy conversations_guest_insert on public.conversations for insert to authenticated
  with check (guest_id = auth.uid() and public.is_active_user()
              and property_id is not null and public.property_is_public(property_id)
              and host_id = (select host_id from public.properties where id = property_id));
create policy messages_read on public.messages for select to authenticated
  using (public.in_conversation(conversation_id) or public.is_admin());
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.in_conversation(conversation_id) and public.is_active_user()
              and read_at is null);

-- ---------- subscriptions / disputes / notifications / audit ----------
create policy subs_read on public.host_subscriptions for select to authenticated
  using (host_id = auth.uid() or public.is_admin());
create policy disputes_read on public.disputes for select to authenticated
  using (opened_by = auth.uid() or public.is_admin() or exists (
    select 1 from public.bookings b where b.id = booking_id and auth.uid() in (b.guest_id, b.host_id)));
create policy disputes_insert on public.disputes for insert to authenticated
  with check (opened_by = auth.uid() and status = 'OPEN' and exists (
    select 1 from public.bookings b where b.id = booking_id and auth.uid() in (b.guest_id, b.host_id)));
create policy disputes_admin on public.disputes for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy notifications_own_read on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy audit_admin_read on public.audit_logs for select to authenticated using (public.is_admin());

-- Notifications: users may only flip read_at.
create or replace function public.protect_notification() returns trigger
language plpgsql as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and current_user not in ('postgres','supabase_admin') and
     (new.user_id, new.type, new.title, new.body, new.link, new.data, new.created_at)
     is distinct from (old.user_id, old.type, old.title, old.body, old.link, old.data, old.created_at) then
    raise exception 'Only read status can be changed' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger notifications_protect before update on public.notifications
  for each row execute function public.protect_notification();

-- ---------- Public, privacy-safe host card ----------
create or replace view public.public_host_cards with (security_invoker = false) as
  select hp.id, hp.display_name, hp.about, hp.languages, hp.response_time_hours,
         hp.verification_status = 'APPROVED' as is_verified, hp.created_at as hosting_since,
         pr.avatar_url
    from public.host_profiles hp join public.profiles pr on pr.id = hp.id
   where not pr.is_suspended
     and exists (select 1 from public.properties p where p.host_id = hp.id and p.status = 'APPROVED' and p.deleted_at is null);
grant select on public.public_host_cards to anon, authenticated;

-- ---------- Table privileges (RLS still applies) ----------
grant usage on schema public to anon, authenticated;
grant select on public.locations, public.amenities, public.subscription_plans, public.platform_settings,
  public.properties, public.listings, public.property_photos, public.listing_amenities, public.reviews,
  public.host_profiles, public.compliance_requirements to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
-- Never let clients write money, ledger, audit or webhook tables directly.
revoke insert, update, delete on public.payments, public.refunds, public.payouts, public.ledger_entries,
  public.webhook_events, public.audit_logs, public.bookings, public.host_subscriptions from authenticated;
revoke delete on public.profiles, public.properties, public.reviews, public.messages, public.verifications,
  public.notifications from authenticated;


-- ===== 20261108000006_storage.sql =====
-- =====================================================================
-- StayZone — 0006 Storage buckets & policies
-- Object paths MUST start with the owner's user id: "<uid>/<file>".
--   property-photos   public read (approved listing images)
--   avatars           public read
--   verification-docs PRIVATE — owner + admins only, served via signed URLs
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('property-photos', 'property-photos', true, 8388608, array['image/jpeg','image/png','image/webp']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp']),
  ('verification-docs', 'verification-docs', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "photos: hosts upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'property-photos' and (storage.foldername(name))[1] = auth.uid()::text
              and exists (select 1 from public.profiles where id = auth.uid() and is_host and not is_suspended));
create policy "photos: owners manage own files" on storage.objects for update to authenticated
  using (bucket_id = 'property-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: owners delete own files" on storage.objects for delete to authenticated
  using (bucket_id = 'property-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: users upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: users update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: users delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "docs: owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "docs: owner or admin reads" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
-- No update/delete on verification documents by users: submissions are evidence.


-- ===== 20261108000007_reference_data.sql =====
-- =====================================================================
-- StayZone — 0007 Reference data (real, not demo): settings, amenities,
-- destinations, subscription plans, compliance defaults.
-- =====================================================================

insert into public.platform_settings (key, value, description) values
  ('fees.host_commission_bps', '800', 'Host commission in basis points (800 = 8%)'),
  ('fees.guest_service_bps',  '400', 'Guest service fee in basis points (400 = 4%)'),
  ('fees.tax_bps',            '0',   'Tax applied to guest total in basis points. Configure per legal advice.'),
  ('booking.payment_hold_minutes', '20', 'Minutes an instant booking holds dates while awaiting payment'),
  ('booking.request_response_hours', '24', 'Hours a host has to answer a booking request'),
  ('booking.accepted_payment_hours', '12', 'Hours a guest has to pay after a request is accepted'),
  ('booking.max_open_holds', '3', 'Max unpaid holds per guest'),
  ('booking.max_advance_days', '540', 'How far ahead guests can book'),
  ('reviews.window_days', '30', 'Days after checkout a guest may review'),
  ('demo.allow_bookings', 'false', 'Allow reservations against demo listings (never in production)'),
  ('public.support_email', '"support@example.com"', 'Shown on Help/Contact pages'),
  ('public.support_whatsapp', '""', 'WhatsApp number shown on Help page'),
  ('public.fx_rates', '{"USD":0.00357,"GBP":0.00278,"EUR":0.00323,"AED":0.0131,"SAR":0.0134}', 'INDICATIVE display rates (units per 1 PKR). Update regularly. Guests are always charged in PKR.')
on conflict (key) do nothing;

insert into public.amenities (code, name, name_ur, icon, grp, is_filterable, sort_order) values
  ('wifi','Wi-Fi','وائی فائی','wifi','essentials',true,10),
  ('air_conditioning','Air conditioning','ایئر کنڈیشنر','snowflake','essentials',true,20),
  ('heating','Heating','ہیٹنگ','flame','essentials',true,30),
  ('kitchen','Kitchen','کچن','cooking-pot','essentials',true,40),
  ('parking','Free parking','پارکنگ','car','essentials',true,50),
  ('generator','Generator / UPS backup','جنریٹر / یو پی ایس','zap','essentials',true,60),
  ('pool','Swimming pool','سوئمنگ پول','waves','features',true,70),
  ('breakfast','Breakfast included','ناشتہ شامل','coffee','features',true,80),
  ('security','24/7 security','سیکیورٹی','shield-check','safety',true,90),
  ('family_friendly','Family-friendly','فیملی کے لیے موزوں','users','features',true,100),
  ('pet_friendly','Pet-friendly','پالتو جانور','paw-print','features',true,110),
  ('accessible','Step-free access','رسائی','accessibility','features',true,120),
  ('workspace','Dedicated workspace','کام کی جگہ','laptop','features',false,130),
  ('washer','Washing machine','واشنگ مشین','washing-machine','essentials',false,140),
  ('tv','TV','ٹی وی','tv','features',false,150),
  ('mountain_view','Mountain view','پہاڑ کا منظر','mountain','views',false,160),
  ('garden','Garden / lawn','باغ / لان','trees','features',false,170),
  ('bbq','BBQ area','باربی کیو','flame-kindling','features',false,180),
  ('hot_water','Hot water (24/7)','گرم پانی','droplets','essentials',false,190),
  ('first_aid','First-aid kit','ابتدائی طبی امداد','cross','safety',false,200)
on conflict (code) do nothing;

insert into public.locations (slug, name, name_ur, province, latitude, longitude, intro, popular_areas, is_featured, sort_order, hero_image_url) values
  ('lahore','Lahore','لاہور','Punjab',31.5204,74.3587,'The cultural heart of Pakistan — Mughal monuments, food streets and a city that never stops celebrating.',array['Gulberg','DHA','Model Town','Johar Town','Walled City'],true,10,null),
  ('islamabad','Islamabad','اسلام آباد','Islamabad Capital Territory',33.6844,73.0479,'A green, planned capital at the foot of the Margalla Hills, with easy access to the northern areas.',array['F-6','F-7','E-7','G-11','Bahria Enclave'],true,20,null),
  ('rawalpindi','Rawalpindi','راولپنڈی','Punjab',33.5651,73.0169,'Islamabad''s lively twin city — bazaars, history and convenient airport access.',array['Saddar','Bahria Town','DHA Phase 1'],false,25,null),
  ('murree','Murree','مری','Punjab',33.9070,73.3943,'Pine-covered hill station with cool summers and snowy winters, a classic family getaway.',array['Mall Road','Bhurban','Patriata'],true,30,null),
  ('nathiagali','Nathiagali','نتھیا گلی','Khyber Pakhtunkhwa',34.0722,73.3817,'A quiet Galyat hill resort with forest trails and views toward the Himalaya.',array['Mukshpuri trail','Dunga Gali'],false,35,null),
  ('hunza','Hunza','ہنزہ','Gilgit-Baltistan',36.3167,74.6500,'Apricot orchards, ancient forts and the peaks of Rakaposhi and Ultar — Pakistan''s most-loved valley.',array['Karimabad','Altit','Passu','Gulmit'],true,40,null),
  ('karimabad','Karimabad','کریم آباد','Gilgit-Baltistan',36.3240,74.6640,'Hunza''s main town, beneath Baltit Fort, with panoramic views of the valley.',array['Baltit Fort','Eagle''s Nest'],false,45,null),
  ('skardu','Skardu','سکردو','Gilgit-Baltistan',35.2971,75.6333,'Gateway to the Karakoram — cold deserts, turquoise lakes and the base for K2 expeditions.',array['Shangrila','Upper Kachura','Shigar'],true,50,null),
  ('gilgit','Gilgit','گلگت','Gilgit-Baltistan',35.9208,74.3080,'The regional hub of Gilgit-Baltistan where the Karakoram Highway meets the Gilgit river.',array['Jutial','Danyore'],false,55,null),
  ('naran','Naran','ناران','Khyber Pakhtunkhwa',34.9097,73.6508,'Summer base for Saif-ul-Malook lake and the Kaghan valley meadows.',array['Lake Saif-ul-Malook','Lalazar','Batakundi'],true,60,null),
  ('kaghan','Kaghan','کاغان','Khyber Pakhtunkhwa',34.7794,73.5214,'A river valley of alpine meadows, waterfalls and quiet villages.',array['Shogran','Siri Paye'],false,65,null),
  ('swat','Swat','سوات','Khyber Pakhtunkhwa',35.2227,72.4258,'The "Switzerland of the East" — rivers, forests and the ski slopes of Malam Jabba.',array['Kalam','Malam Jabba','Mingora','Bahrain'],true,70,null),
  ('chitral','Chitral','چترال','Khyber Pakhtunkhwa',35.8518,71.7864,'Remote valleys beneath Tirich Mir, home to the Kalash culture and the Shandur polo festival.',array['Kalash Valleys','Garam Chashma'],false,75,null),
  ('karachi','Karachi','کراچی','Sindh',24.8607,67.0011,'Pakistan''s biggest city — beaches, business districts and the best street food by the Arabian Sea.',array['Clifton','DHA','Gulshan-e-Iqbal','PECHS'],true,80,null),
  ('hyderabad','Hyderabad','حیدرآباد','Sindh',25.3960,68.3578,'Historic Sindhi city on the Indus, known for bangles and its Pakka Qila.',array['Latifabad','Qasimabad'],false,85,null),
  ('peshawar','Peshawar','پشاور','Khyber Pakhtunkhwa',34.0151,71.5249,'One of South Asia''s oldest cities — Qissa Khwani bazaar, Pashtun hospitality and legendary food.',array['University Town','Hayatabad','Old City'],true,90,null),
  ('quetta','Quetta','کوئٹہ','Balochistan',30.1798,66.9750,'The fruit garden of Pakistan, ringed by mountains and close to Hanna Lake.',array['Cantonment','Jinnah Town'],true,95,null),
  ('ziarat','Ziarat','زیارت','Balochistan',30.3816,67.7266,'A juniper-forest hill station, home to the Quaid-e-Azam Residency.',array['Quaid''s Residency','Prospect Point'],false,100,null)
on conflict (slug) do nothing;

insert into public.subscription_plans (code, name, description, monthly_price_minor, annual_price_minor, listing_allowance, trial_days, features, sort_order) values
  ('FREE_HOST','Free Host','Everything you need to start hosting.',0,0,2,0,
   '{"analytics":"basic","priority_support":false,"promo_credits_minor":0,"booking_reports":false,"multi_property":false}',10),
  ('HOST_PRO','Host Pro','For serious hosts and property managers.',299900,2999000,50,14,
   '{"analytics":"advanced","priority_support":true,"promo_credits_minor":100000,"booking_reports":true,"multi_property":true}',20)
on conflict (code) do nothing;

insert into public.compliance_requirements (province, category, kind, is_required, description) values
  ('*', null, 'IDENTITY', true, 'Host CNIC (or passport for non-residents)'),
  ('*', null, 'OWNERSHIP', true, 'Proof of ownership, tenancy permission, or written authorisation from the owner'),
  ('*', 'HOTEL', 'PROPERTY_LICENCE', true, 'Tourism department hotel registration/licence'),
  ('*', 'RESORT', 'PROPERTY_LICENCE', true, 'Tourism department registration/licence'),
  ('*', 'GUEST_HOUSE', 'PROPERTY_LICENCE', true, 'Guest house registration where required by the province'),
  ('*', 'HOSTEL', 'BUSINESS_REGISTRATION', false, 'Business registration (if operating as a company)');


-- ===== 20261109000008_waitlist.sql =====
-- =====================================================================
-- StayZone — 0008 Launch waitlist (soft launch)
-- Property owners register interest; travellers join the launch list.
-- Anyone may submit; only admins can read. No updates/deletes by users.
-- =====================================================================

create table public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('HOST', 'GUEST')),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email extensions.citext not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  phone text check (phone is null or phone ~ '^\+?[0-9 ]{7,20}$'),
  whatsapp_ok boolean not null default false,
  city text check (city is null or char_length(city) <= 80),
  property_type public.property_category,
  units int check (units is null or units between 1 and 500),
  nightly_price_pkr int check (nightly_price_pkr is null or nightly_price_pkr between 500 and 2000000),
  message text check (message is null or char_length(message) <= 1000),
  source text check (source is null or char_length(source) <= 60),
  consent boolean not null check (consent),
  status text not null default 'NEW' check (status in ('NEW', 'CONTACTED', 'ONBOARDED', 'NOT_A_FIT')),
  admin_notes text,
  created_at timestamptz not null default now(),
  check (kind = 'GUEST' or (phone is not null and city is not null and property_type is not null))
);
-- One signup per email per kind (re-submits update nothing; the app shows a friendly message).
create unique index waitlist_unique_email on public.waitlist_signups (kind, email);
create index waitlist_created_idx on public.waitlist_signups (created_at desc);

alter table public.waitlist_signups enable row level security;

create policy waitlist_public_insert on public.waitlist_signups for insert to anon, authenticated
  with check (status = 'NEW' and admin_notes is null);
create policy waitlist_admin_read on public.waitlist_signups for select to authenticated
  using (public.is_admin());
create policy waitlist_admin_update on public.waitlist_signups for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant insert on public.waitlist_signups to anon, authenticated;
grant select, update on public.waitlist_signups to authenticated;

insert into public.platform_settings (key, value, description) values
  ('public.launch_phase', '"WAITLIST"', 'WAITLIST = soft launch (sign-ups only); LIVE = bookings open')
on conflict (key) do nothing;


-- ===== 20261109000009_harden_grants.sql =====
-- =====================================================================
-- StayZone — 0009 Tighten privileges for Supabase defaults
-- Supabase grants ALL on new public tables to anon/authenticated by default.
-- RLS already protects every table; this removes the excess privileges too
-- (defence in depth), so logged-out visitors can only read public catalogue
-- data and submit the launch-list forms.
-- =====================================================================
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select on public.locations, public.amenities, public.subscription_plans, public.platform_settings,
  public.properties, public.listings, public.property_photos, public.listing_amenities, public.reviews,
  public.host_profiles, public.compliance_requirements, public.public_host_cards to anon;
grant insert on public.waitlist_signups to anon;

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
revoke insert, update, delete on public.payments, public.refunds, public.payouts, public.ledger_entries,
  public.webhook_events, public.audit_logs, public.bookings, public.host_subscriptions from authenticated;
revoke delete on public.waitlist_signups from authenticated;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;


-- ===== 20261109000010_advisor_fixes.sql =====
-- Security advisor follow-ups.
-- 1) Pin search_path on the remaining functions.
alter function public.set_updated_at() set search_path = public;
alter function public.pk_today() set search_path = public;
alter function public.booking_holds_inventory(public.booking_status) set search_path = public;
alter function public.protect_notification() set search_path = public;

-- 2) Trigger functions are never called through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.refresh_property_rating() from public, anon, authenticated;

-- 3) Helpers only used by signed-in policies: not callable anonymously.
--    (is_admin, property_is_public and owns_property stay executable by anon
--    because public read policies evaluate them for visitors.)
revoke execute on function public.is_active_user(uuid) from public, anon;
revoke execute on function public.in_conversation(uuid) from public, anon;
revoke execute on function public.owns_listing(uuid) from public, anon;
revoke execute on function public.setting_int(text, int) from public, anon;
grant execute on function public.is_active_user(uuid) to authenticated;
grant execute on function public.in_conversation(uuid) to authenticated;
grant execute on function public.owns_listing(uuid) to authenticated;
grant execute on function public.setting_int(text, int) to authenticated;

-- 4) New functions are not executable by anon unless granted explicitly.
alter default privileges in schema public revoke execute on functions from public, anon;
