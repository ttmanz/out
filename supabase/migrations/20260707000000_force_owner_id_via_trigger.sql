-- The pattern `with check (auth.uid() = owner_column)` has proven unreliable in
-- this project for INSERT policies (confirmed even on a throwaway scratch table
-- under Supabase's own "run as authenticated user" impersonation — an
-- objectively correct policy still failed). Rather than keep chasing that,
-- switch to the more defensive, common production pattern: force the owner
-- column to auth.uid() via a BEFORE INSERT trigger (ignoring whatever the
-- client sends), and simplify the INSERT check to just "is authenticated".
-- This sidesteps the mismatch entirely, for every write-heavy table added
-- this session.

create or replace function set_owner_to_current_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_ARGV[0] = 'organizer_id' then
    new.organizer_id := auth.uid();
  elsif TG_ARGV[0] = 'user_id' then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

-- night_outs (organizer_id)
drop trigger if exists trg_force_organizer_id on night_outs;
create trigger trg_force_organizer_id
  before insert on night_outs
  for each row execute function set_owner_to_current_user('organizer_id');

drop policy if exists night_out_insert on night_outs;
create policy night_out_insert
  on night_outs for insert
  with check (auth.uid() is not null);

-- spur_posts (user_id)
drop trigger if exists trg_force_user_id on spur_posts;
create trigger trg_force_user_id
  before insert on spur_posts
  for each row execute function set_owner_to_current_user('user_id');

drop policy if exists "insert own spur posts" on spur_posts;
create policy "insert own spur posts"
  on spur_posts for insert
  with check (auth.uid() is not null);

-- open_chat_posts (user_id)
drop trigger if exists trg_force_user_id on open_chat_posts;
create trigger trg_force_user_id
  before insert on open_chat_posts
  for each row execute function set_owner_to_current_user('user_id');

drop policy if exists "insert own open chat posts" on open_chat_posts;
create policy "insert own open chat posts"
  on open_chat_posts for insert
  with check (auth.uid() is not null);

-- club_posts (user_id) — keep the existing membership/admin check, just make
-- the owner column itself trigger-forced rather than client-trusted.
drop trigger if exists trg_force_user_id on club_posts;
create trigger trg_force_user_id
  before insert on club_posts
  for each row execute function set_owner_to_current_user('user_id');

drop policy if exists "approved members create club posts" on club_posts;
create policy "approved members create club posts"
  on club_posts for insert
  with check (
    auth.uid() is not null
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

-- happening_replies (user_id)
drop trigger if exists trg_force_user_id on happening_replies;
create trigger trg_force_user_id
  before insert on happening_replies
  for each row execute function set_owner_to_current_user('user_id');

drop policy if exists "insert own happening replies" on happening_replies;
create policy "insert own happening replies"
  on happening_replies for insert
  with check (auth.uid() is not null);

-- open_chat_replies (user_id)
drop trigger if exists trg_force_user_id on open_chat_replies;
create trigger trg_force_user_id
  before insert on open_chat_replies
  for each row execute function set_owner_to_current_user('user_id');

drop policy if exists "insert own open chat replies" on open_chat_replies;
create policy "insert own open chat replies"
  on open_chat_replies for insert
  with check (auth.uid() is not null);
