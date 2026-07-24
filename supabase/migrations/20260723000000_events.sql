-- New "Events" feature: individuals/companies post organized events
-- (product launches, workshops, conferences, networking, etc.), separate
-- from the entertainment-focused Activity Events (theaters/movies/
-- concerts/kids). Mirrors activity_events' exact shape, RLS, and
-- owner-forced trigger, plus adds link fields (product launches/
-- conferences usually have a registration/ticket link) matching the
-- link_url/link_title/link_image/link_domain pattern already used on
-- spur_posts/happenings/open_chat_posts/group_posts.
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  venue text,
  event_date timestamptz,
  description text,
  photo_url text,
  link_url text,
  link_title text,
  link_image text,
  link_domain text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid
);
alter table events enable row level security;

create policy "read active events" on events for select using (active = true);
create policy "members create events" on events for insert with check (auth.uid() is not null);
create policy "admins delete events" on events for delete
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
create policy "block banned members" on events as restrictive for all
  using (is_member_active(auth.uid()))
  with check (is_member_active(auth.uid()));

drop trigger if exists trg_force_created_by on events;
create trigger trg_force_created_by before insert on events
  for each row execute function set_owner_to_current_user('created_by');

create table if not exists event_replies (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);
alter table event_replies enable row level security;

create policy "read event replies" on event_replies for select using (true);
create policy "insert own event replies" on event_replies for insert with check (auth.uid() is not null);
create policy "block banned members" on event_replies as restrictive for all
  using (is_member_active(auth.uid()))
  with check (is_member_active(auth.uid()));

notify pgrst, 'reload schema';
