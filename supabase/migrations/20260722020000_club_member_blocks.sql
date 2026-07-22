-- Club-scoped member block: a third tier between the per-post block already
-- in Open Chat (blocks one user from one post) and the site-wide member ban
-- (blocks a user from the whole app). This blocks a member from one specific
-- club only, and leaves their existing posts in that club untouched.
create table if not exists club_blocks (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (club_id, blocked_user_id)
);
alter table club_blocks enable row level security;

create policy "read club blocks" on club_blocks for select using (true);

create policy "club or site admins insert club blocks" on club_blocks for insert
  with check (
    exists (select 1 from clubs where clubs.id = club_id and clubs.admin_id = auth.uid())
    or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
  );

create policy "club or site admins delete club blocks" on club_blocks for delete
  using (
    exists (select 1 from clubs where clubs.id = club_id and clubs.admin_id = auth.uid())
    or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
  );

-- club_members had no DELETE policy at all — both "reject request" and
-- "kick approved member" were silent no-ops before this.
create policy "club or site admins delete club members" on club_members for delete
  using (
    exists (select 1 from clubs where clubs.id = club_members.club_id and clubs.admin_id = auth.uid())
    or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
  );

-- Prevent a blocked member from requesting to join again.
create policy "blocked members cannot join" on club_members as restrictive for insert
  with check (
    not exists (
      select 1 from club_blocks
      where club_blocks.club_id = club_members.club_id
        and club_blocks.blocked_user_id = club_members.user_id
    )
  );

notify pgrst, 'reload schema';
