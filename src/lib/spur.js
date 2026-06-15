import { supabase } from './supabase';
import { createHappening } from './happenings';

export const getSpurPosts = () =>
  supabase
    .from('happenings')
    .select('*, profiles:user_id(full_name)')
    .eq('happening_at', 'spur')
    .order('created_at', { ascending: false })
    .limit(30);

export const createSpurPost = (userId, { venue, activity }) =>
  createHappening(userId, {
    title: `Going to ${venue} for ${activity}, join me?`,
    venue,
    happening_at: 'spur',
    description: null,
    latitude: null,
    longitude: null,
  });

export const getSpurReplies = (spurId) =>
  supabase
    .from('spur_replies')
    .select('*, profiles:user_id(full_name)')
    .eq('spur_id', spurId)
    .order('created_at', { ascending: true });

export const createSpurReply = (userId, spurId, message) =>
  supabase.from('spur_replies').insert({ spur_id: spurId, user_id: userId, message });
