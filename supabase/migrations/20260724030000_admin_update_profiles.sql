-- profiles only had a self-update policy (auth.uid() = id) — every admin
-- action targeting another member's row (Staff toggle, Venue Owner toggle,
-- Status cycle, Block/Unblock) was silently doing nothing: RLS excluded
-- the row, Postgres/PostgREST reports that as 0 rows updated with no
-- error, and the client code never checked for that, so the confirm
-- dialog just closed with no visible change and no error either.
create policy "admins update any profile" on profiles for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

notify pgrst, 'reload schema';
