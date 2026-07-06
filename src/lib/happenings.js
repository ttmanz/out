import { supabase } from './supabase';

// Fetch all happenings newest-first, with poster's name
export const getHappenings = () =>
  supabase
    .from('happenings')
    .select('*, profiles:user_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(50);

// Post a new happening
export const createHappening = (userId, { title, venue, happening_at, description, photo_url = null, link_url = null, link_title = null, link_image = null, link_domain = null }) =>
  supabase
    .from('happenings')
    .insert({ user_id: userId, title, venue, happening_at, description, photo_url, link_url, link_title, link_image, link_domain });

// All posts by a specific member for their profile page
export const getMemberHappenings = (userId) =>
  supabase
    .from('happenings')
    .select('*, profiles:user_id(full_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

export const getHappeningReplies = (happeningId) =>
  supabase
    .from('happening_replies')
    .select('*, profiles:user_id(full_name)')
    .eq('happening_id', happeningId)
    .order('created_at', { ascending: true });

export const createHappeningReply = (userId, happeningId, message) =>
  supabase.from('happening_replies').insert({ happening_id: happeningId, user_id: userId, message });
