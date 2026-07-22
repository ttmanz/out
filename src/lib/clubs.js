import { supabase } from './supabase';

const CLUB_FIELDS = 'id, name, description, photo_url, admin_id, created_at, admin:profiles!clubs_admin_id_fkey(full_name)';

export const getClubs = () =>
  supabase.from('clubs').select(CLUB_FIELDS).order('created_at', { ascending: false });

export const getMyClubs = (userId) =>
  supabase.from('club_members').select('club_id').eq('user_id', userId).eq('status', 'approved');

export const getClub = (clubId) =>
  supabase.from('clubs').select(CLUB_FIELDS).eq('id', clubId).single();

export const getClubMembers = (clubId) =>
  supabase
    .from('club_members')
    .select('id, user_id, status, created_at, member:profiles!club_members_user_id_fkey(full_name, photo_url)')
    .eq('club_id', clubId)
    .order('created_at', { ascending: true });

export const createClub = (adminId, { name, description, photo_url }) =>
  supabase
    .from('clubs')
    .insert({ admin_id: adminId, name, description: description || null, photo_url: photo_url || null })
    .select('id')
    .single();

export const requestToJoin = (clubId, userId) =>
  supabase.from('club_members').insert({ club_id: clubId, user_id: userId, status: 'pending' });

export const approveMember = (clubId, userId) =>
  supabase.from('club_members').update({ status: 'approved' }).eq('club_id', clubId).eq('user_id', userId);

export const rejectMember = (clubId, userId) =>
  supabase.from('club_members').delete().eq('club_id', clubId).eq('user_id', userId);

export const getMemberStatus = (clubId, userId) =>
  supabase.from('club_members').select('status').eq('club_id', clubId).eq('user_id', userId).maybeSingle();

export const getClubBlocks = (clubId) =>
  supabase
    .from('club_blocks')
    .select('id, blocked_user_id, profiles:blocked_user_id(full_name)')
    .eq('club_id', clubId);

// Kicks the member (if currently in club_members) and blocks them from
// rejoining this specific club — leaves their existing posts untouched.
export const blockClubMember = async (clubId, userId, blockedBy) => {
  await supabase.from('club_members').delete().eq('club_id', clubId).eq('user_id', userId);
  return supabase.from('club_blocks').insert({ club_id: clubId, blocked_user_id: userId, blocked_by: blockedBy });
};

export const unblockClubMember = (clubId, userId) =>
  supabase.from('club_blocks').delete().eq('club_id', clubId).eq('blocked_user_id', userId);

export const getClubPosts = (clubId) =>
  supabase
    .from('club_posts')
    .select('*, profiles:user_id(full_name)')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

export const createClubPost = (clubId, userId, { text, photo_url = null }) =>
  supabase.from('club_posts').insert({ club_id: clubId, user_id: userId, text, photo_url });

// Admin-only: RLS restricts this to profiles.is_admin = true
export const adminDeleteClubPost = (id) =>
  supabase.from('club_posts').delete().eq('id', id);

// Admin-only: RLS restricts this to profiles.is_admin = true.
// club_members and club_posts cascade on delete, so this also removes them.
export const adminDeleteClub = (id) =>
  supabase.from('clubs').delete().eq('id', id);
