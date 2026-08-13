import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from './i18n';

const AppSettingsContext = createContext(null);
const legacyKeys = { brand: 'common.brand', login: 'common.login', home: 'common.home', back: 'common.back', scanner: 'tabs.scanner', dictionary: 'tabs.dictionary', emergency: 'tabs.emergency', profile: 'tabs.profile', forecast: 'main.forecast', beaches: 'main.beaches', nearest: 'main.nearest', loadingWeather: 'main.loadingWeather', sourceKma: 'main.sourceKma', safe: 'main.safe', interest: 'main.interest', caution: 'main.caution', warning: 'main.warning', temperature: 'main.temperature', wind: 'main.wind', weather: 'main.weather', welcomeGuest: 'main.welcomeGuest', scannerHint: 'scanner.hint', camera: 'common.camera', gallery: 'common.gallery', analyzing: 'scanner.analyzing', recentScans: 'scanner.recent', noScans: 'scanner.empty', featureRisk: 'scanner.featuresRisk', actionGuide: 'scanner.actionGuide', emergencyGuide: 'scanner.emergencyGuide', darkMode: 'common.darkMode', language: 'common.language' };

// Semantic tokens: no pure black/white in the dark scheme, with surfaces and
// contrast tuned for long reading sessions in a low-light environment.
export const lightTheme = { background: '#F0FAFC', surface: '#FFFFFF', surfaceRaised: '#F8FCFD', text: '#0A192F', muted: '#607D8B', border: '#D9EEF3', soft: '#E0F2FE', accent: '#00B4D8', accentStrong: '#075985', onAccent: '#062235', danger: '#DC2626', dangerSoft: '#FEF2F2', dangerText: '#991B1B', success: '#15803D', successSoft: '#DCFCE7', warning: '#B45309', warningSoft: '#FEF3C7', skeleton: '#CBD5E1', backdrop: 'rgba(10,25,47,0.58)', shadow: '0 4px 16px rgba(10,25,47,0.10)' };
export const darkTheme = { background: '#121212', surface: '#232323', surfaceRaised: '#2C2C2C', text: '#E2E8F0', muted: '#B8C4D1', border: '#3A4653', soft: '#1B3445', accent: '#38BDF8', accentStrong: '#7DD3FC', onAccent: '#082032', danger: '#FB7185', dangerSoft: '#421D25', dangerText: '#FECDD3', success: '#4ADE80', successSoft: '#163323', warning: '#FBBF24', warningSoft: '#3A2D14', skeleton: '#3B4652', backdrop: 'rgba(0,0,0,0.66)', shadow: '0 3px 12px rgba(0,0,0,0.24)' };

export function AppSettingsProvider({ children }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState('system');
  const [language, setLanguageState] = useState('ko');
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { AsyncStorage.multiGet(['appTheme', 'appLanguage']).then(([storedTheme, storedLanguage]) => { const nextTheme = ['light', 'dark', 'system'].includes(storedTheme[1]) ? storedTheme[1] : 'system'; setThemeState(nextTheme); const nextLanguage = storedLanguage[1] === 'en' ? 'en' : 'ko'; setLanguageState(nextLanguage); return i18n.changeLanguage(nextLanguage); }).catch(() => {}).finally(() => setHydrated(true)); }, []);
  const resolvedTheme = theme === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : theme;
  const setTheme = (value) => { const next = ['light', 'dark', 'system'].includes(value) ? value : 'system'; setThemeState(next); AsyncStorage.setItem('appTheme', next).catch(() => {}); };
  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  const setLanguage = async (value) => { const next = value === 'en' ? 'en' : 'ko'; await i18n.changeLanguage(next); setLanguageState(next); AsyncStorage.setItem('appLanguage', next).catch(() => {}); };
  const value = useMemo(() => ({ theme, resolvedTheme, isDark: resolvedTheme === 'dark', colors: resolvedTheme === 'dark' ? darkTheme : lightTheme, language, setTheme, toggleTheme, setLanguage, t: (key, options) => i18n.t(legacyKeys[key] || key, options), hydrated }), [theme, resolvedTheme, language, hydrated]);
  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}
export function useAppSettings() { const context = useContext(AppSettingsContext); if (!context) throw new Error('useAppSettings must be used inside AppSettingsProvider'); return context; }
