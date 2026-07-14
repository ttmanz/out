-- Admins can delete any post across every feed. Reuses the exact is_admin
-- check already established for open_groups management
-- (20260712000000_open_groups.sql). Reply tables (open_chat_replies,
-- activity_event_replies, group_post_replies, happening_replies) already
-- have `on delete cascade` FKs to their parent post, and FK-enforced cascade
-- deletes aren't blocked by the child table's RLS, so no changes needed there.

drop policy if exists "admins delete spur posts" on spur_posts;
create policy "admins delete spur posts" on spur_posts for delete
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

drop policy if exists "admins delete open chat posts" on open_chat_posts;
create policy "admins delete open chat posts" on open_chat_posts for delete
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

drop policy if exists "admins delete club posts" on club_posts;
create policy "admins delete club posts" on club_posts for delete
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

drop policy if exists "admins delete group posts" on group_posts;
create policy "admins delete group posts" on group_posts for delete
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

drop policy if exists "admins delete activity events" on activity_events;
create policy "admins delete activity events" on activity_events for delete
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

drop policy if exists "admins delete stories" on stories;
create policy "admins delete stories" on stories for delete
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

drop policy if exists "admins delete happenings" on happenings;
create policy "admins delete happenings" on happenings for delete
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

-- market_listings already has an author-only delete policy predating tracked
-- migrations; this adds a second, permissive admin policy alongside it
-- (Postgres ORs multiple permissive policies for the same command), so
-- existing self-delete keeps working unchanged.
drop policy if exists "admins delete market listings" on market_listings;
create policy "admins delete market listings" on market_listings for delete
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

notify pgrst, 'reload schema';
