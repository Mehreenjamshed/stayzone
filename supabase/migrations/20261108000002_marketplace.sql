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
