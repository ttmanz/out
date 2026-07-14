import { supabase } from './supabase';

export const getOpenChatPosts = () => {
  const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  return supabase
    .from('open_chat_posts')
    .select('*, profiles:user_id(full_name)')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(50);
};

export const createOpenChatPost = (userId, { message, venue, photo_url = null, link_url = null, link_title = null, link_image = null, link_domain = null }) =>
  supabase.from('open_chat_posts').insert({
    user_id: userId,
    title: message,
    venue: venue || null,
    photo_url,
    link_url,
    link_title,
    link_image,
    link_domain,
  });

// All of a specific member's open chat posts, for their profile page (no time cutoff)
export const getMemberOpenChatPosts = (userId) =>
  supabase
    .from('open_chat_posts')
    .select('*, profiles:user_id(full_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

export const getOpenChatReplies = (postId) =>
  supabase
    .from('open_chat_replies')
    .select('*, profiles:user_id(full_name)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

export const createOpenChatReply = (userId, postId, message) =>
  supabase.from('open_chat_replies').insert({ post_id: postId, user_id: userId, message });

export const getPostBlocks = (postId) =>
  supabase.from('post_blocks').select('blocked_user_id').eq('post_id', postId);

export const blockUserFromPost = (postId, blockedUserId, blockedBy) =>
  supabase.from('post_blocks').insert({ post_id: postId, blocked_user_id: blockedUserId, blocked_by: blockedBy });

// Admin-only: RLS restricts this to profiles.is_admin = true
export const adminDeleteOpenChatPost = (id) =>
  supabase.from('open_chat_posts').delete().eq('id', id);
