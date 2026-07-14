import { supabase } from './supabase';

export const getSpurPosts = () => {
  const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  return supabase
    .from('spur_posts')
    .select('*, profiles:user_id(full_name)')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(30);
};

export const createSpurPost = (userId, { venue, activity, photo_url = null, link_url = null, link_title = null, link_image = null, link_domain = null }) =>
  supabase.from('spur_posts').insert({
    user_id: userId,
    title: `Going to ${venue} for ${activity}, join me?`,
    venue,
    photo_url,
    link_url,
    link_title,
    link_image,
    link_domain,
  });

// All of a specific member's spur posts, for their profile page (no time cutoff)
export const getMemberSpurPosts = (userId) =>
  supabase
    .from('spur_posts')
    .select('*, profiles:user_id(full_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

export const getSpurReplies = (spurId) =>
  supabase
    .from('spur_replies')
    .select('*, profiles:user_id(full_name)')
    .eq('spur_id', spurId)
    .order('created_at', { ascending: true });

export const createSpurReply = (userId, spurId, message) =>
  supabase.from('spur_replies').insert({ spur_id: spurId, user_id: userId, message });

// Admin-only: RLS restricts this to profiles.is_admin = true
export const adminDeleteSpurPost = (id) =>
  supabase.from('spur_posts').delete().eq('id', id);
