-- Per-user opt-out for push notifications, surfaced as a simple on/off in
-- Profile Settings. Enforced server-side in send-push (not just client-side)
-- so "off" actually means no push is sent, not just a suppressed alert.

alter table profiles
  add column if not exists push_notifications_enabled boolean not null default true;
