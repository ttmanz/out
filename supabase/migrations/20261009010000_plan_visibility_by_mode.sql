-- Which subscription plans are listed follows the subscription mode.
--
-- The Rollout port added tiered level plans (silver/gold/platinum) and venue plans next
-- to Find-Mee's original three member plans. Every app build lists plans with
-- is_active = true, so without this the original plans and the new ones would all show up
-- together, with blank prices for the new ones.
--
--   levels      -> only the tiered level plans are active
--   venue_plan  -> only the venue plans are active
--   any other   -> only the original untiered member plans are active (today's behaviour)
--
-- An admin still edits prices and product ids under Admin -> Plans; switching the mode
-- (Admin -> Access Control) switches which set is listed.

create or replace function public.sync_plan_visibility(p_mode text)
returns void
language sql
security definer
set search_path to 'public'
as $$
  update public.subscription_plans
     set is_active = case
       when p_mode = 'levels'     then (tier_key is not null and audience = 'member')
       when p_mode = 'venue_plan' then (audience = 'venue')
       else                            (tier_key is null and audience = 'member')
     end;
$$;

revoke all on function public.sync_plan_visibility(text) from public, anon, authenticated;

create or replace function public.trg_sync_plan_visibility()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.mode is distinct from old.mode then
    perform public.sync_plan_visibility(new.mode);
  end if;
  return new;
end;
$$;

drop trigger if exists sync_plan_visibility_on_mode_change on public.subscription_settings;
create trigger sync_plan_visibility_on_mode_change
  after update of mode on public.subscription_settings
  for each row execute function public.trg_sync_plan_visibility();

-- Apply it for the mode that is live right now.
select public.sync_plan_visibility(coalesce((select mode from public.subscription_settings where id = 'global'), 'free'));
