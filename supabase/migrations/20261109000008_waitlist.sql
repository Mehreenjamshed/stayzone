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
