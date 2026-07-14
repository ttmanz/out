-- Admin member ban: no RLS policy anywhere previously checked profiles.status,
-- so a restricted/disabled member's session (or a direct API call) could
-- still post, message, friend-request, and appear in search. This adds a
-- shared is_member_active() check, enforced as a RESTRICTIVE policy (ANDed
-- with every existing permissive policy, regardless of what it says) on
-- every write-capable interaction table, plus hides banned/disabled members
-- from search going forward.

create or replace function public.is_member_active(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $function$
  select coalesce((select status from profiles where id = uid) not in ('disabled', 'banned'), true);
$function$;

-- Post tables
drop policy if exists "block banned members" on spur_posts;
create policy "block banned members" on spur_posts as restrictive for all
  using (is_member_active(auth.uid())) with check (is_member_active(auth.uid()));

drop policy if exists "block banned members" on open_chat_posts;
create policy "block banned members" on open_chat_posts as restrictive for all
  using (is_member_active(auth.uid())) with check (is_member_active(auth.uid()));

drop policy if exists "block banned members" on club_posts;
create policy "block banned members" on club_posts as restrictive for all
  using (is_member_active(auth.uid())) with check (is_member_active(auth.uid()));

drop policy if exists "block banned members" on group_posts;
create policy "block banned members" on group_posts as restrictive for all
  using (is_member_active(auth.uid())) with check (is_member_active(auth.uid()));

drop policy if exists "block banned members" on activity_events;
create policy "block banned members" on activity_events as restrictive for all
  using (is_member_active(auth.uid())) with check (is_member_active(auth.uid()));

drop policy if exists "block banned members" on stories;
create policy "block banned members" on stories as restrictive for all
  using (is_member_active(auth.uid())) with check (is_member_active(auth.uid()));

drop policy if exists "block banned members" on happenings;
create policy "block banned members" on happenings as restrictive for all
  using (is_member_active(auth.uid())) with check (is_member_active(auth.uid()));

drop policy if exists "block banned members" on market_listings;
create policy "block banned members" on market_listings as restrictive for all
  using (is_member_active(auth.uid())) with check (is_member_active(auth.uid()));

-- Reply tables
drop policy if exists "block banned members" on spur_replies;
create policy "block banned members" on spur_replies as restrictive for all
  using (is_member_active(auth.uid())) with check (is_member_active(auth.uid()));

drop policy if exists "block banned members" on open_chat_replies;
create policy "block banned members" on open_chat_replies as restrictive for all
  using (is_member_active(auth.uid())) with check (is_member_active(auth.uid()));

drop policy if exists "block banned members" on group_post_replies;
create policy "block banned members" on group_post_replies as restrictive for all
  using (is_member_active(auth.uid())) with check (is_member_active(auth.uid()));

drop policy if exists "block banned members" on activity_event_replies;
create policy "block banned members" on activity_event_replies as restrictive for all
  using (is_member_active(auth.uid())) with check (is_member_active(auth.uid()));

drop policy if exists "block banned members" on happening_replies;
create policy "block banned members" on happening_replies as restrictive for all
  using (is_member_active(auth.uid())) with check (is_member_active(auth.uid()));

-- Friendships & messages
drop policy if exists "block banned members" on friendships;
create policy "block banned members" on friendships as restrictive for all
  using (is_member_active(auth.uid())) with check (is_member_active(auth.uid()));

drop policy if exists "block banned members" on messages;
create policy "block banned members" on messages as restrictive for all
  using (is_member_active(auth.uid())) with check (is_member_active(auth.uid()));

-- Hide banned/disabled members from Search People going forward
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
    and coalesce(p.status, 'active') not in ('disabled', 'banned')
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

notify pgrst, 'reload schema';
