import { supabase } from './supabase';

export const getOrCreateConversation = async (userId, friendId) => {
  const [a, b] = [userId, friendId].sort();
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user1_id', a)
    .eq('user2_id', b)
    .maybeSingle();
  if (existing) return { data: existing, error: null };
  return supabase.from('conversations').insert({ user1_id: a, user2_id: b }).select('id').single();
};

export const getConversations = (userId) =>
  supabase
    .from('conversations')
    .select(`
      id, user1_id, user2_id, last_message_at, last_message_content,
      user1:profiles!conversations_user1_id_fkey(id, full_name),
      user2:profiles!conversations_user2_id_fkey(id, full_name)
    `)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });

export const getMessages = (conversationId) =>
  supabase
    .from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(id, full_name)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

export const sendMessage = (conversationId, senderId, content) =>
  supabase.from('messages').insert({ conversation_id: conversationId, sender_id: senderId, content });

export const markMessagesRead = (conversationId, currentUserId) =>
  supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', currentUserId)
    .is('read_at', null);
