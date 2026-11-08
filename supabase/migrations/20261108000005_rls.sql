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
