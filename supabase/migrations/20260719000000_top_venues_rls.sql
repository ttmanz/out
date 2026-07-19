-- top_venues has RLS enabled but had zero policies (predates tracked
-- migrations) — with RLS on and no policies, every read/write is denied
-- by default, which is why admin's "Add Venue" silently failed with
-- "Could not save venue." Public read (everyone browses Top Venues),
-- admin-only write, reusing the is_admin check already established
-- for open_groups/post-deletion.

drop policy if exists "read top venues" on top_venues;
create policy "read top venues" on top_venues for select using (true);

drop policy if exists "admins manage top venues" on top_venues;
create policy "admins manage top venues" on top_venues for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

notify pgrst, 'reload schema';
