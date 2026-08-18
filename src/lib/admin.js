import { supabase } from './supabase';

export const getAllMembers = () =>
  supabase
    .from('profiles')
    .select('id, full_name, photo_url, status, is_admin, is_staff, account_type, created_at')
    .order('created_at', { ascending: false });

// .select() makes the affected rows come back, so a caller can tell a
// real 0-rows-updated (e.g. an RLS policy silently excluding the row)
// apart from a normal successful update — plain .update() alone reports
// neither rows-affected nor an error for that case.
export const setMemberStatus = (userId, status) =>
  supabase.from('profiles').update({ status }).eq('id', userId).select('id');

export const banMember = (userId) => setMemberStatus(userId, 'banned');
export const unbanMember = (userId) => setMemberStatus(userId, 'active');

export const setStaffStatus = (userId, is_staff) =>
  supabase.from('profiles').update({ is_staff }).eq('id', userId).select('id');

// Self-declared at profile setup; admin can override afterward
export const setAccountType = (userId, account_type) =>
  supabase.from('profiles').update({ account_type }).eq('id', userId).select('id');

// Members (not venue_owner) with more than 2 AI-flagged commercial posts
// this calendar month — flagged_commercial_members is a view that does
// the count/having filtering server-side.
export const getFlaggedCommercialMembers = () =>
  supabase.from('flagged_commercial_members').select('*').order('flag_count', { ascending: false });

// The specific posts behind one member's flag count, for review.
export const getCommercialFlagsForUser = (userId) =>
  supabase
    .from('commercial_post_flags')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    .order('created_at', { ascending: false });
