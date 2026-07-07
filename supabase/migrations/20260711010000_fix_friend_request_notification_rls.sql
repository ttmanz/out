-- notify_on_friend_request inserts into notifications as the requesting
-- user (no security definer), which hits notifications' own RLS and blocks
-- "Add friend" entirely, since the requester isn't the notification's
-- recipient. Match the pattern already used by notify_club_admin_on_join_request:
-- security definer so this bypasses the caller's own RLS grants.
create or replace function public.notify_on_friend_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  insert into notifications (user_id, type, actor_id, reference_id)
  values (new.addressee_id, 'friend_request', new.requester_id, new.id);
  return new;
end;
$function$;
