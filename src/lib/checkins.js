import { supabase } from './supabase';

export const upsertCheckin = (userId, latitude, longitude) =>
  supabase.from('member_checkins').upsert(
    { user_id: userId, latitude, longitude, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );

export const getRecentCheckins = () => {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  return supabase
    .from('member_checkins')
    .select('user_id, latitude, longitude, updated_at, profiles:user_id(full_name, visibility, venue_visibility)')
    .gte('updated_at', twoHoursAgo)
    .limit(200);
};
