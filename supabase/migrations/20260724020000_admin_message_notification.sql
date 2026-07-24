-- Notify a member the first time an admin messages them, so it doesn't
-- silently look like a regular member's message. Fires once per
-- conversation (on its first message only), not on every message, to
-- avoid spamming an ongoing chat. security definer + set search_path,
-- matching the existing notification-trigger pattern.
create or replace function notify_on_admin_message()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
  recipient_id uuid;
  sender_is_admin boolean;
  is_first_message boolean;
begin
  select p.is_admin into sender_is_admin from profiles p where p.id = new.sender_id;
  if not coalesce(sender_is_admin, false) then
    return new;
  end if;

  select case when c.user1_id = new.sender_id then c.user2_id else c.user1_id end
    into recipient_id
  from conversations c where c.id = new.conversation_id;

  select not exists (
    select 1 from messages m
    where m.conversation_id = new.conversation_id and m.id <> new.id
  ) into is_first_message;

  if is_first_message and recipient_id is not null then
    insert into notifications (user_id, type, actor_id, reference_id, reference_type, reference_text, read, created_at)
    values (recipient_id, 'admin_message', new.sender_id, new.conversation_id, 'conversation', null, false, now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_on_admin_message on messages;
create trigger trg_notify_on_admin_message
  after insert on messages
  for each row execute function notify_on_admin_message();
