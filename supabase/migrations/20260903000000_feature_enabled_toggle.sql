-- Progressive feature rollout: admins turn features on/off from Admin → Access.
-- A feature with enabled = false is hidden for everyone (Home card gone, screen
-- redirects to Home, posting blocked). Defaults to true so nothing changes until
-- an admin acts. Reuses the existing admin-editable feature_access table.

alter table public.feature_access add column if not exists enabled boolean not null default true;

notify pgrst, 'reload schema';
