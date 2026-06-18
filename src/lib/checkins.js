import { supabase } from './supabase';

export const upsertCheckin = (userId, latitude, longitude) =>
  supabase.from('member_checkins').upsert(
    { user_id: userId, latitude, longitude, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );

export const getRecentCheckins = () =>
  supabase
    .from('member_checkins')
    .select('user_id, latitude, longitude, updated_at, profiles:user_id(full_name, visibility)')
    .limit(200);
