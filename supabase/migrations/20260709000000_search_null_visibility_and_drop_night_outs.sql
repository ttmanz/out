-- 1) People search: profiles that never set a visibility (NULL — the default
--    for accounts that haven't completed profile settings) matched none of the
--    visibility branches, so they were invisible to search. Treat NULL as
--    'everyone' (the app's advertised default). Same for allow_friend_requests:
--    NULL now reads as true instead of rendering a "requests closed" badge.
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
  where p.id != current_user_id
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

-- 2) Night Out Planner feature removed from the app — drop its tables, the
--    pg_cron cleanup job, and any notifications that point at it.
do $$
declare
  jid bigint;
begin
  for jid in select jobid from cron.job where command ilike '%night_out%' loop
    perform cron.unschedule(jid);
  end loop;
exception when undefined_table then
  null; -- pg_cron not installed / no jobs
end $$;

delete from notifications where type = 'night_out_invite';
drop table if exists night_out_members cascade;
drop table if exists night_outs cascade;

notify pgrst, 'reload schema';
