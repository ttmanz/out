import { supabase } from './supabase';

export const REPORT_REASONS = ['spam', 'harassment', 'inappropriate', 'other'];

// reporter_id is omitted — trg_force_reporter_id stamps it server-side
// before NOT NULL and RLS checks run.
export const submitReport = ({ targetType, targetId, reportedUserId = null, reason, details = null, contentExcerpt = null }) =>
  supabase.from('reports').insert({
    target_type: targetType,
    target_id: targetId,
    reported_user_id: reportedUserId,
    reason,
    details,
    content_excerpt: contentExcerpt,
  });

// Admin-only below: RLS restricts reads/updates to profiles.is_admin = true
export const getReports = (status) => {
  let q = supabase
    .from('reports')
    .select('*, reporter:reporter_id(full_name), reported:reported_user_id(id, full_name)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) q = q.eq('status', status);
  return q;
};

export const updateReportStatus = (id, status) =>
  supabase.from('reports').update({ status }).eq('id', id);
