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
