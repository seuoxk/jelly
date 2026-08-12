import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const Stack = createNativeStackNavigator(); const Tab = createBottomTabNavigator();
const iconMap = { Main: 'home', Scanner: 'scan', Dictionary: 'book', Emergency: 'medkit', Profile: 'person' };
function AppTabs() { return <Tab.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: '#00B4D8', tabBarInactiveTintColor: '#78909C', tabBarStyle: { borderTopColor: '#D9EEF3' }, tabBarIcon: ({ color, size }) => <Ionicons name={`${iconMap[route.name]}${route.name === 'Main' ? '' : '-outline'}`} size={size} color={color} /> })}><Tab.Screen name="Main" component={MainScreen} options={{ title: '실시간 예보' }} /><Tab.Screen name="Scanner" component={ScannerScreen} options={{ title: 'AI 스캐너' }} /><Tab.Screen name="Dictionary" component={DictionaryScreen} options={{ title: '해양 도감' }} /><Tab.Screen name="Emergency" component={EmergencyScreen} options={{ title: '응급 대처' }} /><Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '마이페이지' }} /></Tab.Navigator>; }
export default function App() { const [ready, setReady] = useState(false); const [initialRoute, setInitialRoute] = useState('Intro'); const [initialUser, setInitialUser] = useState(null); useEffect(() => { (async () => { const [intro, profile] = await AsyncStorage.multiGet(['hasSeenIntro', 'userProfile']); const user = profile[1] ? JSON.parse(profile[1]) : null; setInitialUser(user); setInitialRoute(user ? 'AppTabs' : intro[1] ? 'Auth' : 'Intro'); setReady(true); })(); }, []); if (!ready) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A192F' }}><ActivityIndicator color="#00B4D8" /></View>; return <AuthProvider initialUser={initialUser}><NavigationContainer><Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}><Stack.Screen name="Intro" component={IntroScreen} /><Stack.Screen name="Auth" component={AuthScreen} /><Stack.Screen name="AppTabs" component={AppTabs} /></Stack.Navigator></NavigationContainer></AuthProvider>; }
