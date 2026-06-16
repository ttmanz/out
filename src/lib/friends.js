import { supabase } from './supabase';

// Search profiles by name, respecting visibility and block settings
export const searchUsers = (query, currentUserId) =>
  supabase.rpc('search_visible_users', {
    search_query: query,
    current_user_id: currentUserId,
  });

export const getCloseFriendIds = (userId) =>
  supabase.from('close_friends').select('friend_id').eq('user_id', userId);

export const addCloseFriend = (userId, friendId) =>
  supabase.from('close_friends').insert({ user_id: userId, friend_id: friendId });

export const removeCloseFriend = (userId, friendId) =>
  supabase.from('close_friends').delete().eq('user_id', userId).eq('friend_id', friendId);

// Send a friend request — checks target's allow_friend_requests setting first
export const sendFriendRequest = async (requesterId, addresseeId) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('allow_friend_requests')
    .eq('id', addresseeId)
    .single();

  if (profile && !profile.allow_friend_requests) {
    return { data: null, error: { code: 'REQUESTS_CLOSED', message: 'This member is not accepting friend requests' } };
  }

  return supabase.from('friendships').insert({ requester_id: requesterId, addressee_id: addresseeId });
};

// Accept a received friend request
export const acceptFriendRequest = (friendshipId) =>
  supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);

// Decline a received friend request
export const declineFriendRequest = (friendshipId) =>
  supabase.from('friendships').update({ status: 'declined' }).eq('id', friendshipId);

// Remove an accepted friendship in either direction
export const removeFriend = (userId, friendId) =>
  supabase.from('friendships').delete()
    .or(`and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`);

// Get accepted friends for a user (both directions)
export const getFriends = (userId) =>
  supabase
    .from('friendships')
    .select(`
      id,
      requester_id,
      addressee_id,
      requester:profiles!friendships_requester_id_fkey(id, full_name, avatar_url),
      addressee:profiles!friendships_addressee_id_fkey(id, full_name, avatar_url)
    `)
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

// Get pending requests sent TO the current user
export const getPendingRequests = (userId) =>
  supabase
    .from('friendships')
    .select(`
      id,
      requester:profiles!friendships_requester_id_fkey(id, full_name, avatar_url, visibility)
    `)
    .eq('addressee_id', userId)
    .eq('status', 'pending');

// Get IDs of users the current user has already sent requests to
export const getSentRequestIds = (userId) =>
  supabase.from('friendships').select('addressee_id').eq('requester_id', userId);

// Block a member
export const blockMember = (blockerId, blockedId) =>
  supabase.from('member_blocks').insert({ blocker_id: blockerId, blocked_id: blockedId });

export const getMyBlockedIds = (userId) =>
  supabase.from('member_blocks').select('blocked_id').eq('blocker_id', userId);
