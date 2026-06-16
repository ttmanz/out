import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSession } from '../lib/auth';
import { getProfile } from '../lib/profile';

const UserContext = createContext({ profile: null, refreshProfile: () => {} });

export const UserProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await getSession();
    if (!session) { setProfile(null); return; }
    const { data } = await getProfile(session.user.id);
    setProfile(data ?? null);
  }, []);

  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  return (
    <UserContext.Provider value={{ profile, refreshProfile }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
