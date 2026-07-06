-- Spur of the Moment and Open Chat were piggybacking on the `happenings` table
-- (using happening_at = 'spur' / 'open_chat' as a discriminator), and Open Chat
-- replies were literally re-using Spur's reply table. Each feature should own
-- its own storage. This splits them into dedicated tables.

create table if not exists spur_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  venue text,
  photo_url text,
  link_url text,
  link_title text,
  link_image text,
  link_domain text,
  created_at timestamptz not null default now()
);

create table if not exists open_chat_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  venue text,
  photo_url text,
  link_url text,
  link_title text,
  link_image text,
  link_domain text,
  created_at timestamptz not null default now()
);

create table if not exists happening_replies (
  id uuid primary key default gen_random_uuid(),
  happening_id uuid not null references happenings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists open_chat_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references open_chat_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

-- Migrate existing rows out of `happenings`, keeping the same id so any
-- existing replies stay correctly linked.
insert into spur_posts (id, user_id, title, venue, photo_url, link_url, link_title, link_image, link_domain, created_at)
select id, user_id, title, venue, photo_url, link_url, link_title, link_image, link_domain, created_at
from happenings where happening_at = 'spur'
on conflict (id) do nothing;

insert into open_chat_posts (id, user_id, title, venue, photo_url, link_url, link_title, link_image, link_domain, created_at)
select id, user_id, title, venue, photo_url, link_url, link_title, link_image, link_domain, created_at
from happenings where happening_at = 'open_chat'
on conflict (id) do nothing;

-- Open Chat replies were stored in spur_replies (via the old re-exported functions) — move them out.
insert into open_chat_replies (id, post_id, user_id, message, created_at)
select sr.id, sr.spur_id, sr.user_id, sr.message, sr.created_at
from spur_replies sr
where sr.spur_id in (select id from open_chat_posts)
on conflict (id) do nothing;

delete from spur_replies where spur_id in (select id from open_chat_posts);

-- Any Happening replies created this session (via the temporary spur_replies reuse) — move them out too.
insert into happening_replies (id, happening_id, user_id, message, created_at)
select sr.id, sr.spur_id, sr.user_id, sr.message, sr.created_at
from spur_replies sr
where sr.spur_id in (select id from happenings where happening_at not in ('spur', 'open_chat'))
on conflict (id) do nothing;

delete from spur_replies where spur_id in (select id from happenings where happening_at not in ('spur', 'open_chat'));

-- Now that spur/open_chat rows live in their own tables, remove them from `happenings`.
delete from happenings where happening_at in ('spur', 'open_chat');

-- RLS, matching the existing permissive pattern already used by spur_replies
-- (open read, insert only your own rows).
alter table spur_posts enable row level security;
create policy "read spur posts" on spur_posts for select using (true);
create policy "insert own spur posts" on spur_posts for insert with check (user_id = auth.uid());

alter table open_chat_posts enable row level security;
create policy "read open chat posts" on open_chat_posts for select using (true);
create policy "insert own open chat posts" on open_chat_posts for insert with check (user_id = auth.uid());

alter table happening_replies enable row level security;
create policy "read happening replies" on happening_replies for select using (true);
create policy "insert own happening replies" on happening_replies for insert with check (user_id = auth.uid());

alter table open_chat_replies enable row level security;
create policy "read open chat replies" on open_chat_replies for select using (true);
create policy "insert own open chat replies" on open_chat_replies for insert with check (user_id = auth.uid());
