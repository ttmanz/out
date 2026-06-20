create table if not exists activity_events (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,        -- 'theaters' | 'movies' | 'concerts' | 'kids'
  name        text not null,
  venue       text,
  event_date  timestamptz,
  description text,
  photo_url   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table activity_events enable row level security;

-- All authenticated users can read active events
create policy "read active activity events"
  on activity_events for select
  using (active = true);
