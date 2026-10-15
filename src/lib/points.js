import { supabase } from './supabase';
import i18n from './i18n';

const t = (key, defaultValue, opts) => i18n.t(key, { defaultValue, ...opts });

// Every row here is written server-side by a trigger — see
// supabase/migrations/20260917000000_points_ledger.sql. The app only reads.

// Getters so the label follows the language chosen at the time it is read.
export const REASON_LABEL = {
  get at_venue_checkin() { return t('rw.points.reason_at_venue_checkin', 'Checked in at a venue'); },
  get voucher_redemption() { return t('rw.points.reason_voucher_redemption', 'Redeemed a venue voucher'); },
  get referral_bonus() { return t('rw.points.reason_referral_bonus', 'Friend joined with your code'); },
  get referral_welcome_bonus() { return t('rw.points.reason_referral_welcome_bonus', 'Joined with a friend\'s code'); },
  get profile_completion_bonus() { return t('rw.points.reason_profile_completion_bonus', 'Completed your profile'); },
  get subscription_reward() { return t('rw.points.reason_subscription_reward', 'Subscriber reward'); },
  get clip_posted() { return t('rw.points.reason_clip_posted', 'Posted a Clip of the Day'); },
  get clip_approved_bonus() { return t('rw.points.reason_clip_approved_bonus', 'Your clip was approved'); },
};

export const getMyPointsBalance = (userId) =>
  supabase.from('profiles').select('points_balance').eq('id', userId).single();

export const getMyPointsHistory = (userId) =>
  supabase
    .from('points_ledger')
    .select('id, amount, reason, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

// Admin-only board: every member with their running balance, highest first.
export const getAllMembersWithPoints = () =>
  supabase
    .from('profiles')
    .select('id, full_name, photo_url, points_balance')
    .order('points_balance', { ascending: false });

// Admin-only: RLS restricts inserts to profiles.is_admin = true. Reuses the
// same ledger the checkin trigger writes to, so the balance-update trigger
// fires the same way — this is just a second, admin-scoped way in.
export const awardPoints = (userId, amount, reason) =>
  supabase.from('points_ledger').insert({ user_id: userId, amount, reason });

// Recent activity across all members, for the admin board's audit trail —
// checkin-earned and admin-awarded rows both show up here.
export const getRecentPointsActivity = (limit = 30) =>
  supabase
    .from('points_ledger')
    .select('id, user_id, amount, reason, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

// Admin-only: the live, editable amount for every earn event — read by the
// triggers/edge function themselves, not just this screen. See
// supabase/migrations/20260925050000_points_rules_config.sql.
export const getPointsRules = () =>
  supabase.from('points_rules').select('*').order('rule_key');

export const updatePointsRule = (ruleKey, amount) =>
  supabase.from('points_rules').update({ amount, updated_at: new Date().toISOString() }).eq('rule_key', ruleKey);
