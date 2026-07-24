import { supabase } from './supabase';

export const getAllMembers = () =>
  supabase
    .from('profiles')
    .select('id, full_name, status, is_admin, is_staff, account_type, created_at')
    .order('created_at', { ascending: false });

export const setMemberStatus = (userId, status) =>
  supabase.from('profiles').update({ status }).eq('id', userId);

export const banMember = (userId) => setMemberStatus(userId, 'banned');
export const unbanMember = (userId) => setMemberStatus(userId, 'active');

export const setStaffStatus = (userId, is_staff) =>
  supabase.from('profiles').update({ is_staff }).eq('id', userId);

// Self-declared at profile setup; admin can override afterward
export const setAccountType = (userId, account_type) =>
  supabase.from('profiles').update({ account_type }).eq('id', userId);
