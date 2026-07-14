import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { getSession, onAuthStateChange, signOut } from '../lib/auth';
import { getProfile } from '../lib/profile';
import { subscriptionStatus } from '../lib/subscription';

const UserContext = createContext({ profile: null, refreshProfile: () => {}, hasAccess: true });

export const UserProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);

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
    const { data: { subscription } } = onAuthStateChange(() => refreshProfile());
    return () => subscription.unsubscribe();
  }, [refreshProfile]);

  const { hasAccess } = subscriptionStatus(profile);

  return (
    <UserContext.Provider value={{ profile, refreshProfile, hasAccess }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
