-- User-facing reporting of objectionable content/members — required by both
-- stores for UGC apps (Apple 1.2, Play UGC policy). Members file reports;
-- admins review them in the Admin tab. Mirrors the project's established
-- patterns: force-owner trigger, is_admin RLS, admin notification trigger.

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  -- What kind of thing is being reported, and its row id. For 'member'
  -- reports target_id is the member's profile id. No FK on target_id —
  -- it spans many tables and reported content may get deleted while the
  -- report should survive as an audit trail.
  target_type text not null check (target_type in
    ('member', 'happening', 'story', 'spur', 'open_chat', 'group_post',
     'market_listing', 'event', 'activity_event')),
  target_id uuid not null,
  -- The member being reported / the author of the reported content, so
  -- admins can act on the person even after the content is gone. SET NULL,
  -- not CASCADE — deleting your account must not erase reports against you
  -- (content_excerpt keeps the evidence reviewable).
  reported_user_id uuid references profiles(id) on delete set null,
  reason text not null check (reason in ('spam', 'harassment', 'inappropriate', 'other')),
  details text,
  -- Snapshot of the offending text at report time, so the report stays
  -- reviewable after the content is deleted or edited.
  content_excerpt text,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

alter table reports enable row level security;

-- Members can file reports as themselves only
create policy "insert own reports" on reports for insert
  with check (reporter_id = auth.uid());

-- Only admins can read and process reports
create policy "admins read reports" on reports for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
create policy "admins update reports" on reports for update
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

-- Server-side guarantee the reporter can't be spoofed (matches trg_force_created_by)
create or replace function force_reporter_id()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  new.reporter_id := auth.uid();
  return new;
end;
$$;
drop trigger if exists trg_force_reporter_id on reports;
create trigger trg_force_reporter_id before insert on reports
  for each row execute function force_reporter_id();

-- Notify every admin when a report is filed (matches notify_on_admin_message)
create or replace function notify_admins_on_report()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  insert into notifications (user_id, type, actor_id, reference_id, reference_type, reference_text, read, created_at)
  select p.id, 'content_report', new.reporter_id, new.id, new.target_type, new.reason, false, now()
  from profiles p
  where p.is_admin = true and p.id <> new.reporter_id;
  return new;
end;
$$;
drop trigger if exists trg_notify_admins_on_report on reports;
create trigger trg_notify_admins_on_report after insert on reports
  for each row execute function notify_admins_on_report();

notify pgrst, 'reload schema';
