import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSession, onAuthStateChange } from '../lib/auth';
import { getProfile } from '../lib/profile';
import { subscriptionStatus } from '../lib/subscription';

const UserContext = createContext({ profile: null, refreshProfile: () => {}, hasAccess: true });

export const UserProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await getSession();
    if (!session) { setProfile(null); return; }
    const { data } = await getProfile(session.user.id);
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
