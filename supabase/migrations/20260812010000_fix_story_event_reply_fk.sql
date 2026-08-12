-- story_replies and event_replies were created (20260721000000, 20260723000000)
-- with user_id referencing auth.users(id) instead of profiles(id) — the same
-- mistake already fixed once for other tables in
-- 20260707010000_fix_user_id_fk_to_profiles.sql. PostgREST can only resolve
-- an embedded `profiles:user_id(...)` select when the FK points straight at
-- public.profiles, so every reply fetch on these two tables silently failed
-- with PGRST200 and the UI just showed an empty replies list — the reply
-- itself was inserted fine, it just could never be read back.
-- profiles.id references auth.users(id) 1:1 with identical values, so
-- repointing the FK is safe and lossless.

alter table story_replies drop constraint story_replies_user_id_fkey;
alter table story_replies add constraint story_replies_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

alter table event_replies drop constraint event_replies_user_id_fkey;
alter table event_replies add constraint event_replies_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

notify pgrst, 'reload schema';
