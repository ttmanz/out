-- Replies/comments on Activity events (same pattern as happening_replies:
-- FK straight to profiles for PostgREST embeds, owner trigger-forced).
create table if not exists activity_event_replies (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references activity_events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

alter table activity_event_replies enable row level security;

drop policy if exists "read activity event replies" on activity_event_replies;
create policy "read activity event replies"
  on activity_event_replies for select using (true);

drop trigger if exists trg_force_user_id on activity_event_replies;
create trigger trg_force_user_id
  before insert on activity_event_replies
  for each row execute function set_owner_to_current_user('user_id');

drop policy if exists "insert own activity event replies" on activity_event_replies;
create policy "insert own activity event replies"
  on activity_event_replies for insert
  with check (auth.uid() is not null);

-- Unblock support: members could block (insert) but never unblock — there was
-- no DELETE policy on member_blocks, and no UI. The UI now lives in Profile
-- Settings; this lets the blocker remove their own block rows.
drop policy if exists "remove own blocks" on member_blocks;
create policy "remove own blocks"
  on member_blocks for delete
  using (auth.uid() = blocker_id);

notify pgrst, 'reload schema';
