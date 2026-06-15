import { supabase } from './supabase';

export const getNotifications = (userId) =>
  supabase
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(full_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(60);

export const markAllNotificationsRead = (userId) =>
  supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);

export const getUnreadNotificationCount = (userId) =>
  supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
