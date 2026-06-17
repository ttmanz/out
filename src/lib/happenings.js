import { supabase } from './supabase';

// Fetch all happenings newest-first, with poster's name
export const getHappenings = () =>
  supabase
    .from('happenings')
    .select('*, profiles:user_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(50);

// Post a new happening
export const createHappening = (userId, { title, venue, happening_at, description, latitude, longitude, photo_url = null }) =>
  supabase
    .from('happenings')
    .insert({ user_id: userId, title, venue, happening_at, description, latitude, longitude, photo_url });

// All posts by a specific member for their profile page
export const getMemberHappenings = (userId) =>
  supabase
    .from('happenings')
    .select('*, profiles:user_id(full_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
