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
