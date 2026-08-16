-- Owners can delete their own posts, mirroring the admin-only policies added
-- in 20260713000000_admin_post_deletion.sql. happenings, stories, and
-- market_listings already have owner-scoped delete policies predating
-- tracked migrations; messages already has a broad "msg_access" FOR ALL
-- policy scoped to conversation participants, so no new policy is needed
-- there either — client-side UI restricts the delete action to the sender.

drop policy if exists "owners delete spur posts" on spur_posts;
create policy "owners delete spur posts" on spur_posts for delete
  using (auth.uid() = user_id);

drop policy if exists "owners delete open chat posts" on open_chat_posts;
create policy "owners delete open chat posts" on open_chat_posts for delete
  using (auth.uid() = user_id);

drop policy if exists "owners delete club posts" on club_posts;
create policy "owners delete club posts" on club_posts for delete
  using (auth.uid() = user_id);

drop policy if exists "owners delete group posts" on group_posts;
create policy "owners delete group posts" on group_posts for delete
  using (auth.uid() = user_id);

-- activity_events and events use created_by (not user_id) for authorship,
-- but createActivityEvent()/createEvent() never populated it until this
-- change, so this policy only takes effect for rows created going forward.
drop policy if exists "owners delete activity events" on activity_events;
create policy "owners delete activity events" on activity_events for delete
  using (auth.uid() = created_by);

drop policy if exists "owners delete events" on events;
create policy "owners delete events" on events for delete
  using (auth.uid() = created_by);

notify pgrst, 'reload schema';
