import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
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

const Stack = createNativeStackNavigator(); const Tab = createBottomTabNavigator();
const iconMap = { Main: 'home', Scanner: 'scan', Dictionary: 'book', Emergency: 'medkit', Profile: 'person' };
function AppTabs() { const { colors, t } = useAppSettings(); return <Tab.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted, tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.surface }, tabBarIcon: ({ color, size }) => <Ionicons name={`${iconMap[route.name]}${route.name === 'Main' ? '' : '-outline'}`} size={size} color={color} /> })}><Tab.Screen name="Main" component={MainScreen} options={{ title: t('forecast') }} /><Tab.Screen name="Scanner" component={ScannerScreen} options={{ title: t('scanner') }} /><Tab.Screen name="Dictionary" component={DictionaryScreen} options={{ title: t('dictionary') }} /><Tab.Screen name="Emergency" component={EmergencyScreen} options={{ title: t('emergency') }} /><Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t('profile') }} /></Tab.Navigator>; }
export default function App() { const [ready, setReady] = useState(false); useEffect(() => { setReady(true); }, []); if (!ready) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A192F' }}><ActivityIndicator color="#00B4D8" /></View>; return <AppSettingsProvider><AuthProvider initialUser={null}><NavigationContainer><Stack.Navigator initialRouteName="Auth" screenOptions={{ headerShown: false }}><Stack.Screen name="Intro" component={IntroScreen} /><Stack.Screen name="Auth" component={AuthScreen} /><Stack.Screen name="AppTabs" component={AppTabs} /></Stack.Navigator></NavigationContainer></AuthProvider></AppSettingsProvider>; }
