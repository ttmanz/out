import { supabase } from './supabase';

export const STORY_EXPIRY_DAYS = 5;

const expiryThreshold = () =>
  new Date(Date.now() - STORY_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

export const getStories = () =>
  supabase
    .from('stories')
    .select('*, profiles:user_id(full_name, photo_url)')
    .gte('created_at', expiryThreshold())
    .order('created_at', { ascending: false })
    .limit(50);

export const getFriendStories = async (userId) => {
  const { data: friendships, error: fErr } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (fErr) return { data: [], error: fErr };

  const ids = [
    ...(friendships ?? []).map((f) =>
      f.requester_id === userId ? f.addressee_id : f.requester_id
    ),
    userId,
  ];

  return supabase
    .from('stories')
    .select('*, profiles:user_id(full_name, photo_url)')
    .in('user_id', ids)
    .gte('created_at', expiryThreshold())
    .order('created_at', { ascending: false })
    .limit(50);
};

export const createStory = (userId, { text, photo_url, video_url }) =>
  supabase.from('stories').insert({ user_id: userId, text, photo_url, video_url });

// Admin-only: RLS restricts this to profiles.is_admin = true
export const adminDeleteStory = (id) =>
  supabase.from('stories').delete().eq('id', id);

export const getStoryReplies = (storyId) =>
  supabase
    .from('story_replies')
    .select('*, profiles:user_id(full_name)')
    .eq('story_id', storyId)
    .order('created_at', { ascending: true });

export const createStoryReply = (userId, storyId, message) =>
  supabase.from('story_replies').insert({ story_id: storyId, user_id: userId, message });
