import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSession } from '../lib/auth';
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

  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  const { hasAccess } = subscriptionStatus(profile);

  return (
    <UserContext.Provider value={{ profile, refreshProfile, hasAccess }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
