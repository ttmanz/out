import { supabase } from './supabase';

export const getProfile = (userId) =>
  supabase
    .from('profiles')
    .select('id, full_name, visibility, allow_friend_requests, status, is_admin, is_staff, photo_url, dob, gender, city, bio, interests, phone, instagram, profile_completed, subscription_plan, subscription_expires_at')
    .eq('id', userId)
    .single();

export const updateProfileSettings = (userId, { visibility, allow_friend_requests }) =>
  supabase.from('profiles').update({ visibility, allow_friend_requests }).eq('id', userId);

export const updateFullProfile = (userId, fields) =>
  supabase.from('profiles').update({ ...fields, profile_completed: true }).eq('id', userId);

export const uploadAvatar = async (userId, uri) => {
  const ext = uri.split('.').pop().toLowerCase();
  const path = `${userId}/avatar.${ext}`;
  const response = await fetch(uri);
  const blob = await response.blob();
  const { error } = await supabase.storage.from('avatars').upload(path, blob, {
    contentType: `image/${ext}`,
    upsert: true,
  });
  if (error) return { error };
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return { url: `${data.publicUrl}?t=${Date.now()}` };
};
