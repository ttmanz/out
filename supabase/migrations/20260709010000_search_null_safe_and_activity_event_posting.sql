-- 1) People search: `p.id != current_user_id` returns nothing when the client
--    sends a NULL current_user_id (observed on device: profile not yet loaded
--    → every search silently empty). `is distinct from` keeps self-exclusion
--    for real ids but no longer nukes the whole result set on NULL.
create or replace function public.search_visible_users(search_query text, current_user_id uuid)
returns table(id uuid, full_name text, photo_url text, visibility text, allow_friend_requests boolean, interests text[])
language sql
security definer
as $function$
  select p.id, p.full_name, p.photo_url,
         coalesce(p.visibility, 'everyone') as visibility,
         coalesce(p.allow_friend_requests, true) as allow_friend_requests,
         p.interests
  from profiles p
  where p.id is distinct from current_user_id
    and p.full_name ilike search_query || '%'
    and (
      coalesce(p.visibility, 'everyone') = 'everyone'
      or (p.visibility = 'friends' and exists (
        select 1 from friendships f
        where f.status = 'accepted'
          and ((f.requester_id = current_user_id and f.addressee_id = p.id)
            or (f.addressee_id = current_user_id and f.requester_id = p.id))
      ))
      or (p.visibility = 'close_friends' and exists (
        select 1 from close_friends cf where cf.user_id = p.id and cf.friend_id = current_user_id
      ))
    )
    and not exists (
      select 1 from member_blocks mb
      where (mb.blocker_id = current_user_id and mb.blocked_id = p.id)
         or (mb.blocker_id = p.id and mb.blocked_id = current_user_id)
    )
  limit 50;
$function$;

grant execute on function public.search_visible_users(text, uuid) to authenticated;

-- 2) Members can post events in the Activities categories (theaters/movies/
--    concerts/kids). Owner column trigger-forced like every other write table.
alter table public.activity_events
  add column if not exists created_by uuid references profiles(id) on delete cascade;

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
  elsif TG_ARGV[0] = 'created_by' then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_force_created_by on activity_events;
create trigger trg_force_created_by
  before insert on activity_events
  for each row execute function set_owner_to_current_user('created_by');

drop policy if exists "members create activity events" on activity_events;
create policy "members create activity events"
  on activity_events for insert
  with check (auth.uid() is not null);

notify pgrst, 'reload schema';
