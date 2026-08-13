import React, { createContext, useContext, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export function AuthProvider({ children, initialUser = null }) {
  const [user, setUser] = useState(initialUser);

  const signIn = async (userId) => {
    const nextUser = { userId: userId.trim(), nickname: userId.trim() };
    setUser(nextUser);
  };
  const signOut = async () => {
    // Remove sessions created by older app versions as well.
    await AsyncStorage.removeItem('userProfile');
    setUser(null);
  };
  const value = useMemo(() => ({ user, userId: user?.userId || '', isLoggedIn: Boolean(user), isGuest: !user, signIn, signOut }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
