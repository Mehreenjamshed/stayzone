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
