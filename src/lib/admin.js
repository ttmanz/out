import { supabase } from './supabase';

export const getAllMembers = () =>
  supabase
    .from('profiles')
    .select('id, full_name, status, is_admin, is_staff, created_at')
    .order('created_at', { ascending: false });

export const setMemberStatus = (userId, status) =>
  supabase.from('profiles').update({ status }).eq('id', userId);

export const setStaffStatus = (userId, is_staff) =>
  supabase.from('profiles').update({ is_staff }).eq('id', userId);
