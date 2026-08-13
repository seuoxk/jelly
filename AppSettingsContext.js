import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from './i18n';

const AppSettingsContext = createContext(null);
const light = { background: '#F0FAFC', surface: '#FFFFFF', text: '#0A192F', muted: '#607D8B', border: '#D9EEF3', soft: '#E0F2FE', accent: '#00B4D8', icon: '#075985' };
const dark = { background: '#081625', surface: '#10253A', text: '#F1F5F9', muted: '#B7C8D8', border: '#23435D', soft: '#16334B', accent: '#4DD4EF', icon: '#8BE6F6' };

export function AppSettingsProvider({ children }) {
  const [theme, setThemeState] = useState('light'); const [language, setLanguageState] = useState('ko'); const [hydrated, setHydrated] = useState(false);
  useEffect(() => { AsyncStorage.multiGet(['appTheme', 'appLanguage']).then(([storedTheme, storedLanguage]) => { if (storedTheme[1] === 'dark') setThemeState('dark'); if (storedLanguage[1] === 'en') setLanguageState('en'); }).catch(() => {}).finally(() => setHydrated(true)); }, []);
  const setTheme = (value) => { const next = value === 'dark' ? 'dark' : 'light'; setThemeState(next); AsyncStorage.setItem('appTheme', next).catch(() => {}); };
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const setLanguage = (value) => { const next = value === 'en' ? 'en' : 'ko'; setLanguageState(next); AsyncStorage.setItem('appLanguage', next).catch(() => {}); };
  const value = useMemo(() => ({ theme, isDark: theme === 'dark', colors: theme === 'dark' ? dark : light, language, setTheme, toggleTheme, setLanguage, t: (key) => translations[language][key] || translations.ko[key] || key, hydrated }), [theme, language, hydrated]);
  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}
export function useAppSettings() { const context = useContext(AppSettingsContext); if (!context) throw new Error('useAppSettings must be used inside AppSettingsProvider'); return context; }
