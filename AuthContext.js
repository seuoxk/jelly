import React, { createContext, useContext, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);
export function AuthProvider({ children, initialUser = null }) {
  const [user, setUser] = useState(initialUser);
  const value = useMemo(() => ({ user, isGuest: !user, signIn: async (profile) => { await AsyncStorage.setItem('userProfile', JSON.stringify(profile)); setUser(profile); }, signOut: async () => { await AsyncStorage.removeItem('userProfile'); setUser(null); } }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
