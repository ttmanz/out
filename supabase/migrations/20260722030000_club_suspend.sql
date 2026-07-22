-- Middle ground between full club deletion and doing nothing: a club
-- status that hides it from everyone except its own admin, site admins,
-- and its already-approved members (so members see it's suspended rather
-- than the club just vanishing), and blocks new posts/joins while
-- suspended — without destroying any data. Site-admin-only action, same
-- tier as full club deletion.
alter table clubs add column if not exists status text not null default 'active';
alter table clubs drop constraint if exists clubs_status_check;
alter table clubs add constraint clubs_status_check check (status in ('active', 'suspended'));

drop policy if exists "clubs_read" on clubs;
create policy "clubs_read" on clubs for select
  using (
    status = 'active'
    or admin_id = auth.uid()
    or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
    or exists (
      select 1 from club_members
      where club_members.club_id = clubs.id
        and club_members.user_id = auth.uid()
        and club_members.status = 'approved'
    )
  );

create policy "site admins update clubs" on clubs for update
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

create policy "block posting in suspended clubs" on club_posts as restrictive for insert
  with check (
    not exists (select 1 from clubs where clubs.id = club_posts.club_id and clubs.status = 'suspended')
  );

create policy "cannot join suspended clubs" on club_members as restrictive for insert
  with check (
    not exists (select 1 from clubs where clubs.id = club_members.club_id and clubs.status = 'suspended')
  );

notify pgrst, 'reload schema';
