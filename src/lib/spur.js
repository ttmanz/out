import { supabase } from './supabase';
import { createHappening } from './happenings';

export const getSpurPosts = () => {
  const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  return supabase
    .from('happenings')
    .select('*, profiles:user_id(full_name)')
    .eq('happening_at', 'spur')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(30);
};

export const createSpurPost = (userId, { venue, activity, photo_url = null, link_url = null, link_title = null, link_image = null, link_domain = null }) =>
  createHappening(userId, {
    title: `Going to ${venue} for ${activity}, join me?`,
    venue,
    happening_at: 'spur',
    description: null,
    latitude: null,
    longitude: null,
    photo_url,
    link_url,
    link_title,
    link_image,
    link_domain,
  });

export const getSpurReplies = (spurId) =>
  supabase
    .from('spur_replies')
    .select('*, profiles:user_id(full_name)')
    .eq('spur_id', spurId)
    .order('created_at', { ascending: true });

export const createSpurReply = (userId, spurId, message) =>
  supabase.from('spur_replies').insert({ spur_id: spurId, user_id: userId, message });
