import { supabase } from './supabase';

export const getSubscriptionPlans = () =>
  supabase
    .from('subscription_plans')
    .select('id, label, price_display, duration_months, badge, description, sort_order')
    .eq('is_active', true)
    .order('sort_order');

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

export const subscriptionStatus = (profile) => {
  const plan = profile?.subscription_plan;
  const expires = profile?.subscription_expires_at;
  if (!plan || !expires) return { hasAccess: false, isOnTrial: false, isActive: false, daysLeft: 0, planId: null };
  const msLeft = new Date(expires) - new Date();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const isOnTrial = plan === 'free_trial';
  const hasAccess = msLeft > 0;
  return { hasAccess, isOnTrial, isActive: hasAccess && !isOnTrial, daysLeft: Math.max(0, daysLeft), planId: plan };
};
