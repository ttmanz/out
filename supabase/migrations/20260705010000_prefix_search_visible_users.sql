-- Switch from a "contains" match to a "starts with" match, and make sure the
-- authenticated role can actually execute this (RPC calls silently fail
-- client-side without an explicit execute grant on a SECURITY DEFINER function).
create or replace function public.search_visible_users(search_query text, current_user_id uuid)
returns table(id uuid, full_name text, photo_url text, visibility text, allow_friend_requests boolean, interests text[])
language sql
security definer
as $function$
  select p.id, p.full_name, p.photo_url, p.visibility, p.allow_friend_requests, p.interests
  from profiles p
  where p.id != current_user_id
    and p.full_name ilike search_query || '%'
    and (
      p.visibility = 'everyone'
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
