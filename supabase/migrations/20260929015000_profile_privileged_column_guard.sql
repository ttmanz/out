-- Closes a privilege-escalation hole on profiles.
--
-- profiles has a "users can update own profile" policy with no column limits (only the
-- subscription columns were guarded by trg_guard_subscription_columns), so any signed-in
-- member could set their OWN is_admin, is_staff or status straight from the app.
--
-- This guard refuses direct client edits of those columns unless the caller is an admin.
-- Only direct client writes are restricted: SECURITY DEFINER functions and triggers run
-- as the database owner, and edge functions use the service role, so they pass through.
--
-- The later migration 20260929020000_venue_approval_and_profile_guard.sql replaces this
-- function (same name) with a version that also guards balances and venue approval.

create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_admin boolean;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  select coalesce(is_admin, false) into v_admin from profiles where id = auth.uid();

  if new.is_admin is distinct from old.is_admin
     or new.is_staff is distinct from old.is_staff
     or new.status is distinct from old.status then
    if not coalesce(v_admin, false) then
      raise exception 'Only an admin can change that' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_profile_privileged_columns on public.profiles;
create trigger trg_guard_profile_privileged_columns
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();
