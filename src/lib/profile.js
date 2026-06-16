import { supabase } from './supabase';

export const getProfile = (userId) =>
  supabase
    .from('profiles')
    .select('id, full_name, visibility, allow_friend_requests, status, is_admin')
    .eq('id', userId)
    .single();

export const updateProfileSettings = (userId, { visibility, allow_friend_requests }) =>
  supabase.from('profiles').update({ visibility, allow_friend_requests }).eq('id', userId);
