import { supabase } from './supabase';

export const getOpenGroups = () =>
  supabase.from('open_groups').select('id, name, description, photo_url, created_at').order('name', { ascending: true });

export const createOpenGroup = (adminId, { name, description, photo_url }) =>
  supabase
    .from('open_groups')
    .insert({ created_by: adminId, name, description: description || null, photo_url: photo_url || null })
    .select('id')
    .single();

export const updateOpenGroup = (id, payload) =>
  supabase.from('open_groups').update(payload).eq('id', id);

export const deleteOpenGroup = (id) =>
  supabase.from('open_groups').delete().eq('id', id);

export const getGroupPosts = (groupId) =>
  supabase
    .from('group_posts')
    .select('*, profiles:user_id(full_name, photo_url), group_post_likes(count)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(50);

export const getFriendGroupPosts = async (groupId, userId) => {
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
    .from('group_posts')
    .select('*, profiles:user_id(full_name, photo_url), group_post_likes(count)')
    .eq('group_id', groupId)
    .in('user_id', ids)
    .order('created_at', { ascending: false })
    .limit(50);
};

export const createGroupPost = (groupId, userId, { text, photo_url = null, link_url = null, link_title = null, link_image = null, link_domain = null }) =>
  supabase.from('group_posts').insert({
    group_id: groupId,
    user_id: userId,
    text,
    photo_url,
    link_url,
    link_title,
    link_image,
    link_domain,
  });

export const getGroupPostReplies = (postId) =>
  supabase
    .from('group_post_replies')
    .select('*, profiles:user_id(full_name)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

export const createGroupPostReply = (userId, postId, message) =>
  supabase.from('group_post_replies').insert({ post_id: postId, user_id: userId, message });

// Admin-only: RLS restricts this to profiles.is_admin = true
export const adminDeleteGroupPost = (id) =>
  supabase.from('group_posts').delete().eq('id', id);

export const deleteGroupPost = (id, userId) =>
  supabase.from('group_posts').delete().eq('id', id).eq('user_id', userId);

export const getMyGroupPostLikes = (userId, postIds) =>
  supabase.from('group_post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds);

export const getMyGroupPostSaves = (userId, postIds) =>
  supabase.from('group_post_saves').select('post_id').eq('user_id', userId).in('post_id', postIds);

export const likeGroupPost = (postId, userId) =>
  supabase.from('group_post_likes').insert({ post_id: postId, user_id: userId });

export const unlikeGroupPost = (postId, userId) =>
  supabase.from('group_post_likes').delete().eq('post_id', postId).eq('user_id', userId);

export const saveGroupPost = (postId, userId) =>
  supabase.from('group_post_saves').insert({ post_id: postId, user_id: userId });

export const unsaveGroupPost = (postId, userId) =>
  supabase.from('group_post_saves').delete().eq('post_id', postId).eq('user_id', userId);
