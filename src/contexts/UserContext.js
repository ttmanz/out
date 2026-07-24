import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { getSession, onAuthStateChange, signOut } from '../lib/auth';
import { getProfile } from '../lib/profile';
import { subscriptionStatus, getSubscriptionSettings, getFeatureAccess, canAccessFeature } from '../lib/subscription';

const UserContext = createContext({
  profile: null,
  refreshProfile: () => {},
  hasAccess: true,
  canAccessFeature: () => ({ allowed: true }),
});

export const UserProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [featureMap, setFeatureMap] = useState({});

  // Global subscription mode + per-feature paid list — small, admin-edited
  // tables, loaded once and re-checked alongside the profile.
  const refreshAccessConfig = useCallback(async () => {
    const [{ data: settingsData }, { data: featuresData }] = await Promise.all([
      getSubscriptionSettings(),
      getFeatureAccess(),
    ]);
    setSettings(settingsData ?? null);
    const map = {};
    (featuresData ?? []).forEach((f) => { map[f.feature_key] = f; });
    setFeatureMap(map);
  }, []);

  // Checked on every auth state change (fresh login, token refresh, app
  // foreground) — not just at the login screen — so a member who gets
  // disabled/banned mid-session is kicked out the next time the app
  // re-checks their session, not only on their next email login.
  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await getSession();
    if (!session) { setProfile(null); return; }
    const { data } = await getProfile(session.user.id);
    if (data?.status === 'disabled' || data?.status === 'banned') {
      await signOut();
      setProfile(null);
      Alert.alert('Account Disabled', 'Your account has been disabled. Please contact support.');
      return;
    }
    setProfile(data ?? null);
  }, []);

  // Load on mount and again on every auth change (fresh login, token refresh),
  // so profile-derived state never stays stale for the whole session
  useEffect(() => {
    refreshProfile();
    refreshAccessConfig();
    const { data: { subscription } } = onAuthStateChange(() => refreshProfile());
    return () => subscription.unsubscribe();
  }, [refreshProfile, refreshAccessConfig]);

  const { hasAccess } = subscriptionStatus(profile);

  const checkFeature = useCallback(
    (featureKey) => canAccessFeature(featureKey, { profile, settings, featureMap }),
    [profile, settings, featureMap]
  );

  return (
    <UserContext.Provider value={{ profile, refreshProfile, hasAccess, canAccessFeature: checkFeature }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
