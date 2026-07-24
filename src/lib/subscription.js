import { supabase } from './supabase';

export const getSubscriptionPlans = () =>
  supabase
    .from('subscription_plans')
    .select('id, label, price_display, venue_price_display, duration_months, badge, description, sort_order')
    .eq('is_active', true)
    .order('sort_order');

// Admin-only: includes stripe_price_id, not needed on the public-facing screen
export const getAllSubscriptionPlans = () =>
  supabase
    .from('subscription_plans')
    .select('id, label, price_display, venue_price_display, duration_months, badge, description, sort_order, stripe_price_id, venue_stripe_price_id')
    .order('sort_order');

// A venue owner sees their own price where the admin has set one;
// otherwise everyone sees the regular member price.
export const planPriceFor = (plan, profile) =>
  (profile?.account_type === 'venue_owner' && plan.venue_price_display)
    ? plan.venue_price_display
    : plan.price_display;

export const updateSubscriptionPlan = (id, fields) =>
  supabase.from('subscription_plans').update(fields).eq('id', id);

export const activateSubscription = (userId, planId, durationMonths) => {
  const expires = new Date();
  expires.setMonth(expires.getMonth() + durationMonths);
  return supabase
    .from('profiles')
    .update({ subscription_plan: planId, subscription_expires_at: expires.toISOString() })
    .eq('id', userId);
};

export const getSubscriptionSettings = () =>
  supabase.from('subscription_settings').select('*').eq('id', 'global').single();

// Admin-only: RLS restricts this to profiles.is_admin = true
export const updateSubscriptionSettings = (fields) =>
  supabase.from('subscription_settings').update(fields).eq('id', 'global');

export const getFeatureAccess = () =>
  supabase.from('feature_access').select('*').order('label');

// Admin-only: RLS restricts this to profiles.is_admin = true
export const updateFeatureAccess = (featureKey, fields) =>
  supabase.from('feature_access').update(fields).eq('feature_key', featureKey);

const hasActivePlan = (profile) => {
  if (!profile?.subscription_plan || !profile?.subscription_expires_at) return false;
  return new Date(profile.subscription_expires_at) > new Date();
};

// Resolves whether a member can currently post/write to a given feature,
// given the global subscription mode + that feature's paid flag.
//
// - 'free': everyone has full access everywhere.
// - 'free_except': everyone has full access, except the features on the
//   paid list, which cost their one-off price unless subscribed. Any
//   active subscription (any account type) fully bypasses this.
// - 'free_until': full access for everyone until the date. Once it passes,
//   a subscription becomes the minimum requirement for EVERYTHING — no
//   subscription, no posting anywhere, full stop. On top of that, the
//   same paid list becomes a premium tier: a regular member's subscription
//   does not cover those features (they must also pay the one-off price),
//   while a venue owner's subscription does cover them.
export const canAccessFeature = (featureKey, { profile, settings, featureMap }) => {
  if (profile?.is_staff) return { allowed: true };

  const mode = settings?.mode ?? 'free';

  if (mode === 'free') return { allowed: true };

  if (mode === 'free_until') {
    const stillFree = settings?.free_until && new Date(settings.free_until) > new Date();
    if (stillFree) return { allowed: true };

    if (!hasActivePlan(profile)) return { allowed: false };

    // Subscribed — but the premium list still requires the venue-owner
    // tier specifically; a regular member's subscription alone isn't enough.
    const feature = featureMap?.[featureKey];
    if (!feature?.is_paid) return { allowed: true };
    if (profile?.account_type === 'venue_owner') return { allowed: true };
    return { allowed: false, price: feature.one_off_price };
  }

  // mode === 'free_except' — any active subscription bypasses the paid list entirely
  if (hasActivePlan(profile)) return { allowed: true };
  const feature = featureMap?.[featureKey];
  if (!feature?.is_paid) return { allowed: true };
  return { allowed: false, price: feature.one_off_price };
};

export const subscriptionStatus = (profile) => {
  // v1: all users get full access — billing integrated in v2
  if (profile?.is_staff) return { hasAccess: true, isOnTrial: false, isActive: true, daysLeft: 0, planId: 'staff' };
  const plan = profile?.subscription_plan;
  const expires = profile?.subscription_expires_at;
  if (plan && expires) {
    const msLeft = new Date(expires) - new Date();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    const isOnTrial = plan === 'free_trial';
    return { hasAccess: true, isOnTrial, isActive: !isOnTrial, daysLeft: Math.max(0, daysLeft), planId: plan };
  }
  return { hasAccess: true, isOnTrial: false, isActive: false, daysLeft: 0, planId: null };
};
