import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import IntroScreen from './IntroScreen';
import AuthScreen from './AuthScreen';
import MainScreen from './MainScreen';
import ScannerScreen from './ScannerScreen';
import DictionaryScreen from './DictionaryScreen';
import EmergencyScreen from './EmergencyScreen';
import ProfileScreen from './ProfileScreen';
import { AuthProvider } from './AuthContext';
import { AppSettingsProvider, useAppSettings } from './AppSettingsContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const iconMap = { Main: 'home', Scanner: 'scan', Dictionary: 'book', Emergency: 'medkit', Profile: 'person' };

function AppTabs() {
  const { colors, t } = useAppSettings();
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.surface },
      tabBarIcon: ({ color, size }) => <Ionicons name={`${iconMap[route.name]}${route.name === 'Main' ? '' : '-outline'}`} size={size} color={color} />,
    })}>
      <Tab.Screen name="Main" component={MainScreen} options={{ title: t('forecast') }} />
      <Tab.Screen name="Scanner" component={ScannerScreen} options={{ title: t('scanner') }} />
      <Tab.Screen name="Dictionary" component={DictionaryScreen} options={{ title: t('dictionary') }} />
      <Tab.Screen name="Emergency" component={EmergencyScreen} options={{ title: t('emergency') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t('profile') }} />
    </Tab.Navigator>
  );
}

function AppShell() {
  const { colors } = useAppSettings();
  return (
    <AuthProvider initialUser={null}>
      <View style={[styles.page, Platform.OS === 'web' && { backgroundColor: colors.background }]}>
        <WebDocumentMeta />
        <View style={[styles.appFrame, Platform.OS === 'web' && { backgroundColor: colors.background }]}>
          <NavigationContainer>
            <Stack.Navigator initialRouteName="Auth" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Intro" component={IntroScreen} />
              <Stack.Screen name="Auth" component={AuthScreen} />
              <Stack.Screen name="AppTabs" component={AppTabs} />
            </Stack.Navigator>
          </NavigationContainer>
        </View>
      </View>
    </AuthProvider>
  );
}

// Expo's Metro web exporter supplies its own HTML template. Keep these tags in
// the document at runtime as well as web/index.html so deployed web builds
// consistently expose the intended share metadata.
function WebDocumentMeta() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const tags = {
      'og:type': 'website',
      'og:title': '실시간 해양 생물 도감 & 위험 예보',
      'og:description': '해파리 쏘임 방지 및 해양 생물 정보',
      'og:image': `${window.location.origin}/og-thumbnail.png`,
      'twitter:card': 'summary_large_image',
      'twitter:title': '실시간 해양 생물 도감 & 위험 예보',
      'twitter:description': '해파리 쏘임 방지 및 해양 생물 정보',
      'twitter:image': `${window.location.origin}/og-thumbnail.png`,
    };
    const created = [];
    Object.entries(tags).forEach(([property, content]) => {
      let tag = document.head.querySelector(`meta[property="${property}"]`) || document.head.querySelector(`meta[name="${property}"]`);
      if (!tag) { tag = document.createElement('meta'); (property.startsWith('og:') ? tag.setAttribute('property', property) : tag.setAttribute('name', property)); document.head.appendChild(tag); created.push(tag); }
      tag.setAttribute('content', content);
    });
    document.title = 'seafari | 실시간 해양 생물 도감 & 위험 예보';
    return () => created.forEach((tag) => tag.remove());
  }, []);
  return null;
}

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  if (!ready) return <View style={styles.boot}><ActivityIndicator color="#38BDF8" /></View>;
  return <AppSettingsProvider><AppShell /></AppSettingsProvider>;
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#121212' },
  page: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: '100vh', alignItems: 'center', paddingVertical: 18 } : {}),
  },
  appFrame: {
    flex: 1, width: '100%', overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      maxWidth: 480, marginHorizontal: 'auto', borderRadius: 24,
      boxShadow: '0 16px 48px rgba(10, 25, 47, 0.24)',
      borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.28)',
    } : {}),
  },
});
