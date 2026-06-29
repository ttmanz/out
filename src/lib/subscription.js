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
