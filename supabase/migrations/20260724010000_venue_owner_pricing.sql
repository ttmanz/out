-- Member type: self-declared at profile setup, admin can override afterward
-- (same tier as the existing is_staff toggle).
alter table profiles add column if not exists account_type text not null default 'member';
alter table profiles drop constraint if exists profiles_account_type_check;
alter table profiles add constraint profiles_account_type_check
  check (account_type in ('member', 'venue_owner'));

-- Venue owners can be priced differently per plan than regular members —
-- admin sets both prices independently rather than a multiplier, so pricing
-- stays fully flexible per plan/duration.
alter table subscription_plans add column if not exists venue_price_display text;
alter table subscription_plans add column if not exists venue_stripe_price_id text;

notify pgrst, 'reload schema';
