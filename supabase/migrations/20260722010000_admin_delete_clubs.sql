-- Admins currently have no way to remove an entire club — only individual
-- posts within one (adminDeleteClubPost). clubs had INSERT/SELECT/UPDATE
-- policies but no DELETE policy at all, so even a direct API call couldn't
-- remove one. club_members and club_posts already cascade on clubs(id)
-- delete, so removing the club cleans up its members/posts automatically.
create policy "admins delete clubs" on clubs for delete
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

notify pgrst, 'reload schema';
