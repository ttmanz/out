import { supabase } from './supabase';

export const createNightOut = (organizerId, { title, venue, planned_at, description, photo_url = null }) =>
  supabase
    .from('night_outs')
    .insert({ organizer_id: organizerId, title, venue: venue || null, planned_at: planned_at || null, description: description || null, photo_url })
    .select('id')
    .single();

export const getMyNightOuts = () =>
  supabase
    .from('night_outs')
    .select(`
      id, title, venue, planned_at, description, organizer_id, created_at,
      organizer:profiles!night_outs_organizer_id_fkey(full_name),
      members:night_out_members(user_id, status)
    `)
    .order('created_at', { ascending: false });

export const getNightOut = (id) =>
  supabase
    .from('night_outs')
    .select(`
      id, title, venue, planned_at, description, organizer_id, created_at,
      organizer:profiles!night_outs_organizer_id_fkey(full_name),
      members:night_out_members(
        id, user_id, status,
        member:profiles!night_out_members_user_id_fkey(full_name)
      )
    `)
    .eq('id', id)
    .single();

export const addNightOutMembers = (nightOutId, userIds) =>
  supabase
    .from('night_out_members')
    .insert(userIds.map((uid) => ({ night_out_id: nightOutId, user_id: uid, status: 'invited' })));

export const updateRsvp = (nightOutId, userId, status) =>
  supabase
    .from('night_out_members')
    .update({ status })
    .eq('night_out_id', nightOutId)
    .eq('user_id', userId);

export const deleteNightOut = (id) =>
  supabase.from('night_outs').delete().eq('id', id);
