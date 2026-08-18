-- Fourth subscription_settings.mode: members stay free (same as 'free'),
-- but venue_owner accounts need an active subscription (after their trial)
-- for the whole app. Previously this was going to be an always-on
-- behavior independent of mode; making it an explicit mode instead so the
-- admin controls when it's active, consistent with the other 3 modes.

alter table subscription_settings drop constraint subscription_settings_mode_check;
alter table subscription_settings add constraint subscription_settings_mode_check
  check (mode = any (array['free', 'free_until', 'free_except', 'free_except_venue']));

notify pgrst, 'reload schema';
