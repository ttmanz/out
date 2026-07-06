-- Ensure the buckets used for user-uploaded media exist and serve public URLs
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('post-photos', 'post-photos', true), ('story-media', 'story-media', true)
on conflict (id) do update set public = true;

-- Uploads are stored under `${auth.uid()}/...` — only the owning user may write to their own folder
create policy "users upload to own folder (avatars)"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users update own folder (avatars)"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Upsert (re-uploading the same avatar filename) requires delete permission on the
-- conflicting row, not just update — without this, re-uploads fail with an RLS error.
create policy "users delete own folder (avatars)"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Upsert also needs to SELECT the existing row to detect the conflict in the first place.
create policy "users select own folder (avatars)"
  on storage.objects for select
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users upload to own folder (post-photos)"
  on storage.objects for insert
  with check (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users upload to own folder (story-media)"
  on storage.objects for insert
  with check (bucket_id = 'story-media' and (storage.foldername(name))[1] = auth.uid()::text);
