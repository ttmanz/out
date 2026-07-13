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
      requester:profiles!friendships_requester_id_fkey(id, full_name, photo_url),
      addressee:profiles!friendships_addressee_id_fkey(id, full_name, photo_url)
    `)
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

// Get pending requests sent TO the current user
export const getPendingRequests = (userId) =>
  supabase
    .from('friendships')
    .select(`
      id,
      requester:profiles!friendships_requester_id_fkey(id, full_name, photo_url, visibility)
    `)
    .eq('addressee_id', userId)
    .eq('status', 'pending');

// Get IDs of users the current user has already sent requests to
export const getSentRequestIds = (userId) =>
  supabase.from('friendships').select('addressee_id').eq('requester_id', userId);

// Get IDs of the current user's accepted friends (both directions), so
// screens like Search People can hide people who are already friends
export const getFriendIds = async (userId) => {
  const { data, error } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) return { data: [], error };
  const ids = (data ?? []).map((f) => (f.requester_id === userId ? f.addressee_id : f.requester_id));
  return { data: ids, error: null };
};

// Block a member
export const blockMember = (blockerId, blockedId) =>
  supabase.from('member_blocks').insert({ blocker_id: blockerId, blocked_id: blockedId });

export const getMyBlockedIds = (userId) =>
  supabase.from('member_blocks').select('blocked_id').eq('blocker_id', userId);

// Blocked members with their names, for the unblock list in Profile Settings.
// Two queries on purpose — member_blocks' FKs may not point at profiles, which
// would break a PostgREST embedded select.
export const getMyBlockedProfiles = async (userId) => {
  const { data: blocks, error } = await getMyBlockedIds(userId);
  if (error || !(blocks ?? []).length) return { data: [], error };
  return supabase.from('profiles').select('id, full_name').in('id', blocks.map((b) => b.blocked_id));
};

export const unblockMember = (blockerId, blockedId) =>
  supabase.from('member_blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId);
