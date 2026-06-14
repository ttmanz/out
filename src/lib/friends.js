import { supabase } from './supabase';

// Search profiles by name, excluding the current user
export const searchUsers = (query, currentUserId) =>
  supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url')
    .ilike('full_name', `%${query}%`)
    .neq('id', currentUserId)
    .limit(20);

// Send a friend request
export const sendFriendRequest = (requesterId, addresseeId) =>
  supabase
    .from('friendships')
    .insert({ requester_id: requesterId, addressee_id: addresseeId });

// Accept a received friend request
export const acceptFriendRequest = (friendshipId) =>
  supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId);

// Decline a received friend request
export const declineFriendRequest = (friendshipId) =>
  supabase
    .from('friendships')
    .update({ status: 'declined' })
    .eq('id', friendshipId);

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
      requester:profiles!friendships_requester_id_fkey(id, full_name, avatar_url)
    `)
    .eq('addressee_id', userId)
    .eq('status', 'pending');

// Get IDs of users the current user has already sent requests to
export const getSentRequestIds = (userId) =>
  supabase
    .from('friendships')
    .select('addressee_id')
    .eq('requester_id', userId);
