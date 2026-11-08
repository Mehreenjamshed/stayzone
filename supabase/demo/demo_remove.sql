-- Removes ALL demo data (properties flagged is_demo and @demo.stayzone.invalid users).
begin;
delete from public.reviews where is_demo or property_id in (select id from public.properties where is_demo);
delete from public.notifications where user_id in (select id from auth.users where email like '%@demo.stayzone.invalid');
delete from public.bookings where property_id in (select id from public.properties where is_demo);
delete from public.properties where is_demo;   -- cascades to listings, photos, amenities
delete from auth.users where email like '%@demo.stayzone.invalid';  -- cascades to profiles/host_profiles
update public.platform_settings set value = 'false' where key = 'demo.enabled';
commit;
