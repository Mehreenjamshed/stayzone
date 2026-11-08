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
