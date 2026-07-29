-- RevenueCat payment integration: repurpose the never-wired Stripe
-- placeholder columns, add one-off feature-unlock tracking, and close the
-- client-side self-grant hole in profiles.subscription_plan/expires_at.

alter table subscription_plans rename column stripe_price_id to revenuecat_product_id;
alter table subscription_plans rename column venue_stripe_price_id to venue_revenuecat_product_id;
alter table feature_access rename column stripe_price_id to revenuecat_product_id;

-- One-off feature unlocks, written only by the revenuecat-webhook Edge
-- Function (service role) after a verified non-subscription purchase.
create table if not exists user_feature_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  feature_key text not null,
  product_id text not null,
  purchased_at timestamptz not null default now(),
  unique (user_id, feature_key)
);
alter table user_feature_unlocks enable row level security;

create policy "users read own feature unlocks" on user_feature_unlocks
  for select using (auth.uid() = user_id);

-- No insert/update/delete policy for authenticated users — only the
-- service-role key (used by the webhook) can bypass RLS to write here.

-- Guard against the client self-granting a subscription via the existing
-- "Users can update own profile" policy: subscription_plan and
-- subscription_expires_at may only change via the service role (i.e. the
-- revenuecat-webhook Edge Function), never a direct client update.
create or replace function public.guard_subscription_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if (new.subscription_plan is distinct from old.subscription_plan
      or new.subscription_expires_at is distinct from old.subscription_expires_at)
     and coalesce(current_setting('request.jwt.claims', true)::json->>'role', '') <> 'service_role'
  then
    raise exception 'subscription_plan/subscription_expires_at can only be changed by the payment webhook';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_guard_subscription_columns on profiles;
create trigger trg_guard_subscription_columns
  before update on profiles
  for each row execute function public.guard_subscription_columns();

notify pgrst, 'reload schema';
