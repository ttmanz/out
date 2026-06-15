import { supabase } from './supabase';
import { createHappening } from './happenings';
export { getSpurReplies as getOpenChatReplies, createSpurReply as createOpenChatReply } from './spur';

export const getOpenChatPosts = () =>
  supabase
    .from('happenings')
    .select('*, profiles:user_id(full_name)')
    .eq('happening_at', 'open_chat')
    .order('created_at', { ascending: false })
    .limit(50);

export const createOpenChatPost = (userId, { message, venue }) =>
  createHappening(userId, {
    title: message,
    venue: venue || null,
    happening_at: 'open_chat',
    description: null,
    latitude: null,
    longitude: null,
  });

export const getPostBlocks = (postId) =>
  supabase.from('post_blocks').select('blocked_user_id').eq('post_id', postId);

export const blockUserFromPost = (postId, blockedUserId, blockedBy) =>
  supabase.from('post_blocks').insert({ post_id: postId, blocked_user_id: blockedUserId, blocked_by: blockedBy });
