-- Runs the cleanup-giveaways-clips edge function every hour: Give Away posts are
-- deleted (photo/video included) 24 hours after they end, and Clip of the Day videos
-- that no admin approved are deleted every Monday 03:00 UTC.
--
-- The function checks an x-cron-secret header against its CRON_SECRET secret.
-- That value is NOT kept in this repository: it lives in Supabase Vault under the
-- name 'cleanup_cron_secret' (create it with
--   select vault.create_secret('<the same value as the CRON_SECRET function secret>', 'cleanup_cron_secret');
-- ), and the job reads it from there at run time.

create extension if not exists pg_net with schema extensions;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup-giveaways-clips') then
    perform cron.unschedule('cleanup-giveaways-clips');
  end if;
end $$;

select cron.schedule(
  'cleanup-giveaways-clips',
  '5 * * * *',
  $job$
  select net.http_post(
    url := 'https://mwvtciffmvxjvdphezka.supabase.co/functions/v1/cleanup-giveaways-clips',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cleanup_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $job$
);
