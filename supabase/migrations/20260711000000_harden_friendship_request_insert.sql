-- "Add friend" insert into friendships was failing client-side ("could not
-- send friend request"). friendships predates the 20260707000000 pass that
-- replaced the flaky `with check (auth.uid() = owner_column)` INSERT pattern
-- (documented there as unreliable on this Supabase project) with a
-- trigger-forced owner column + a plain auth-is-not-null check. Apply the
-- same fix here, reusing the existing trigger function.
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
  elsif TG_ARGV[0] = 'requester_id' then
    new.requester_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_force_requester_id on friendships;
create trigger trg_force_requester_id
  before insert on friendships
  for each row execute function set_owner_to_current_user('requester_id');

-- Additive permissive policy (RLS ORs multiple permissive policies together),
-- so this fixes the insert regardless of whatever the original policy is
-- named or does.
drop policy if exists "insert own friend requests" on friendships;
create policy "insert own friend requests"
  on friendships for insert
  with check (auth.uid() is not null);

notify pgrst, 'reload schema';
