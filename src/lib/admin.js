import { supabase } from './supabase';

export const getAllMembers = () =>
  supabase
    .from('profiles')
    .select('id, full_name, status, is_admin, created_at')
    .order('created_at', { ascending: false });

export const setMemberStatus = (userId, status) =>
  supabase.from('profiles').update({ status }).eq('id', userId);
