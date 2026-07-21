import { supabase } from './supabase';

export const getProfile = (userId) =>
  supabase
    .from('profiles')
    .select('id, full_name, visibility, allow_friend_requests, status, is_admin, is_staff, photo_url, dob, gender, city, bio, interests, phone, instagram, profile_completed, subscription_plan, subscription_expires_at')
    .eq('id', userId)
    .single();

export const updateProfileSettings = (userId, { visibility, allow_friend_requests, full_name }) =>
  supabase.from('profiles').update({ visibility, allow_friend_requests, full_name }).eq('id', userId);

export const updateFullProfile = (userId, fields) =>
  supabase.from('profiles').update({ ...fields, profile_completed: true }).eq('id', userId);
