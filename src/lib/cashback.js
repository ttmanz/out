import { supabase } from './supabase';
import i18n from './i18n';

const t = (key, defaultValue, opts) => i18n.t(key, { defaultValue, ...opts });

// Venue rewards: store credit and bill discounts. A member photographs a receipt and
// submits a claim; nothing is credited until the venue confirms it. Store credit is
// spendable only at the venue that issued it, and a discount is applied at the till.
// (Cash back and cash-outs were removed from the app; the server objects keep the
// older "cashback" names.) Everything is written by SECURITY DEFINER functions — see
// supabase/migrations/20260929000000_cashback_receipts_credits.sql. The app only
// reads, and calls those functions.

// Amounts are shown with the ISO currency code, e.g. "6.00 ZMW". No symbol is
// hard-coded, so the same code works for any country.
export const formatAmount = (amount, currencyCode) =>
  `${Number(amount ?? 0).toFixed(2)}${currencyCode ? ` ${currencyCode}` : ''}`;

// Labels are getters so they follow the language chosen at the time they are read.
export const CLAIM_STATUS_LABEL = {
  get pending() { return t('rw.cashback.status_pending', 'Waiting for venue'); },
  get confirmed() { return t('rw.cashback.status_confirmed', 'Confirmed'); },
  get rejected() { return t('rw.cashback.status_rejected', 'Rejected'); },
  get cancelled() { return t('rw.cashback.status_cancelled', 'Cancelled'); },
};

export const REWARD_LABEL = {
  get credit() { return t('rw.cashback.reward_credit', 'store credit'); },
  get discount() { return t('rw.cashback.reward_discount', 'discount'); },
};

// What a venue owner can choose to offer ("participation"). Customers only see
// the rewards a venue has ticked (and given a percentage).
export const PARTICIPATION_OPTIONS = [
  {
    key: 'credit', emoji: '🎟️',
    get label() { return t('rw.cashback.opt_credit', 'Store credit'); },
    get desc() { return t('rw.cashback.opt_credit_desc', 'Give customers credit they can redeem at your venue later.'); },
  },
  {
    key: 'discount', emoji: '🏷️',
    get label() { return t('rw.cashback.opt_discount', 'Discount'); },
    get desc() { return t('rw.cashback.opt_discount_desc', 'Take a percentage off the customer\'s bill at the till.'); },
  },
];

// The rewards a venue can choose from: store credit and a bill discount.
// (Cash back and cash-outs were removed from the app.)
export const rewardOptions = () => PARTICIPATION_OPTIONS;

export const participationSummary = (participation) => {
  if (participation == null) return t('rw.cashback.choose_rewards', 'Choose which rewards you offer');
  const shown = PARTICIPATION_OPTIONS.filter((o) => participation.includes(o.key));
  if (shown.length === 0) return t('rw.cashback.no_rewards', 'No rewards offered');
  return shown.map((o) => o.label).join(', ');
};

// --- Member: receipts ---

// Venues currently offering store credit and/or a bill discount,
// with the percentages a member would actually get, their currency, and that
// country's minimum spend.
export const getCashbackVenues = () => supabase.rpc('list_cashback_venues');

// receiptPath may be null for a discount, which is applied at the till.
export const submitCashbackClaim = (venueOwnerId, spendAmount, receiptPath, rewardType) =>
  supabase.rpc('submit_cashback_claim', {
    p_venue_owner_id: venueOwnerId,
    p_spend_amount: spendAmount,
    p_receipt_path: receiptPath,
    p_reward_type: rewardType,
  });

export const cancelCashbackClaim = (claimId) =>
  supabase.rpc('cancel_cashback_claim', { p_claim_id: claimId });

export const getMyCashbackClaims = (userId) =>
  supabase
    .from('cashback_claims')
    .select('id, spend_amount, cashback_amount, currency_code, reward_type, status, created_at, venue:profiles!cashback_claims_venue_owner_id_fkey(full_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

// --- Member: store credit ---

export const getMyVenueCredits = () => supabase.rpc('my_venue_credits');

export const requestCreditRedemption = (venueOwnerId, amount) =>
  supabase.rpc('request_credit_redemption', { p_venue_owner_id: venueOwnerId, p_amount: amount });

export const cancelCreditRedemption = (redemptionId) =>
  supabase.rpc('cancel_credit_redemption', { p_redemption_id: redemptionId });

export const getMyPendingCreditRedemptions = (userId) =>
  supabase
    .from('venue_credit_redemptions')
    .select('id, amount, currency_code, created_at, venue:profiles!venue_credit_redemptions_venue_owner_id_fkey(full_name)')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

// --- Countries ---

export const getCountries = () =>
  supabase.from('countries').select('code, name, currency_code, min_spend, is_active').order('name');

// --- Venue owner ---

// Venues start unapproved: they can set an offer, but aren't listed to
// customers and can't confirm anything until an admin approves them. Also
// returns the rewards the venue has ticked (participation).
export const getMyVenueStatus = (venueOwnerId) =>
  supabase.from('profiles').select('venue_approved, participation').eq('id', venueOwnerId).single();

export const getMyVenueOffer = (venueOwnerId) =>
  supabase.from('venue_cashback_offers').select('credit_percent, discount_percent, country_code').eq('venue_owner_id', venueOwnerId).maybeSingle();

// The venue's country fixes the currency of every claim at it, and can't be
// changed once customers have claimed there. `participation` is the list of
// rewards ticked ('credit', 'discount'): each ticked reward needs a
// percentage, and an unticked one is not offered whatever its percentage.
export const setVenueCashbackOffer = (creditPercent, discountPercent, countryCode, participation) =>
  supabase.rpc('set_venue_cashback_offer', {
    p_cash_percent: 0,
    p_credit_percent: creditPercent,
    p_discount_percent: discountPercent,
    p_country_code: countryCode,
    p_participation: participation,
  });

export const getVenueClaims = (venueOwnerId) =>
  supabase
    .from('cashback_claims')
    .select('id, spend_amount, cashback_amount, currency_code, reward_type, status, receipt_path, created_at, member:profiles!cashback_claims_user_id_fkey(full_name)')
    .eq('venue_owner_id', venueOwnerId)
    .order('created_at', { ascending: false })
    .limit(50);

export const resolveCashbackClaim = (claimId, approve) =>
  supabase.rpc('resolve_cashback_claim', { p_claim_id: claimId, p_approve: approve });

export const getVenuePendingRedemptions = (venueOwnerId) =>
  supabase
    .from('venue_credit_redemptions')
    .select('id, amount, currency_code, created_at, member:profiles!venue_credit_redemptions_user_id_fkey(full_name)')
    .eq('venue_owner_id', venueOwnerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

export const resolveCreditRedemption = (redemptionId, approve) =>
  supabase.rpc('resolve_credit_redemption', { p_redemption_id: redemptionId, p_approve: approve });

// What this venue currently owes its customers in store credit.
export const getVenueCreditOutstanding = () => supabase.rpc('venue_credit_outstanding');

// --- Admin ---

// Every venue account, unapproved ones first, with enough detail to vet them.
export const getVenueOwners = () =>
  supabase
    .from('profiles')
    .select('id, full_name, city, phone, instagram, venue_approved, created_at')
    .eq('account_type', 'venue_owner')
    .order('venue_approved', { ascending: true })
    .order('created_at', { ascending: false });

// Which country each venue has chosen (venues without a row haven't chosen).
export const getVenueCountries = () =>
  supabase.from('venue_cashback_offers').select('venue_owner_id, country_code');

export const setVenueApproved = (venueOwnerId, approved) =>
  supabase.rpc('set_venue_approved', { p_venue_owner_id: venueOwnerId, p_approved: approved });

export const getRecentCashbackClaims = (limit = 30) =>
  supabase
    .from('cashback_claims')
    .select('id, spend_amount, cashback_amount, currency_code, reward_type, status, created_at, member:profiles!cashback_claims_user_id_fkey(full_name), venue:profiles!cashback_claims_venue_owner_id_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit);
