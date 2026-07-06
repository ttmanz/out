-- Posts visible to a club's approved members (and its admin)
create table if not exists club_posts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text,
  photo_url text,
  created_at timestamptz not null default now()
);

alter table club_posts enable row level security;

create policy "approved members read club posts"
  on club_posts for select
  using (
    exists (
      select 1 from club_members
      where club_members.club_id = club_posts.club_id
        and club_members.user_id = auth.uid()
        and club_members.status = 'approved'
    )
    or exists (
      select 1 from clubs where clubs.id = club_posts.club_id and clubs.admin_id = auth.uid()
    )
  );

create policy "approved members create club posts"
  on club_posts for insert
  with check (
    user_id = auth.uid()
    and (
      exists (
        select 1 from club_members
        where club_members.club_id = club_posts.club_id
          and club_members.user_id = auth.uid()
          and club_members.status = 'approved'
      )
      or exists (
        select 1 from clubs where clubs.id = club_posts.club_id and clubs.admin_id = auth.uid()
      )
    )
  );

-- Notify the club admin whenever someone requests to join.
-- security definer so it can write to notifications regardless of the
-- requester's own RLS grants (same pattern as other notification triggers).
create or replace function notify_club_admin_on_join_request()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  if new.status = 'pending' then
    insert into notifications (user_id, type, actor_id, reference_id, reference_type, reference_text, read, created_at)
    select clubs.admin_id, 'club_join_request', new.user_id, new.club_id, 'club', clubs.name, false, now()
    from clubs
    where clubs.id = new.club_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_club_admin_on_join_request on club_members;
create trigger trg_notify_club_admin_on_join_request
  after insert on club_members
  for each row execute function notify_club_admin_on_join_request();
