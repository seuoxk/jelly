import React, { useEffect, useRef } from 'react';
import { Animated, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const features = [['pulse-outline', '실시간 해양 예보'], ['scan-outline', 'AI 생물 스캐너'], ['medkit-outline', '오프라인 응급 대처']];
export default function IntroScreen({ navigation }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start(); }, [fade]);
  return <SafeAreaView style={s.safe}><Animated.View style={[s.container, { opacity: fade }]}><View style={s.hero}><Ionicons name="water" size={68} color="#00B4D8" /><Text style={s.brand}>seafari</Text><Text style={s.tagline}>더 안전하게, 더 깊이 바다를 즐기세요</Text></View><View>{features.map(([icon, label]) => <View style={s.feature} key={label}><Ionicons name={icon} size={25} color="#00B4D8" /><Text style={s.featureText}>{label}</Text></View>)}</View><TouchableOpacity style={s.guest} onPress={() => navigation.replace('AppTabs')}><Text style={s.guestText}>seafari 둘러보기</Text></TouchableOpacity><TouchableOpacity style={s.login} onPress={() => navigation.replace('Auth')}><Text style={s.loginText}>로그인 및 회원가입</Text></TouchableOpacity></Animated.View></SafeAreaView>;
}
const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#0A192F' }, container: { flex: 1, padding: 28, justifyContent: 'space-around', maxWidth: 680, width: '100%', alignSelf: 'center' }, hero: { alignItems: 'center' }, brand: { color: '#FFF', fontSize: 38, fontWeight: '900', marginTop: 12 }, tagline: { color: '#A5D8E8', marginTop: 8 }, feature: { backgroundColor: '#112A46', borderRadius: 17, padding: 17, marginTop: 11, flexDirection: 'row', alignItems: 'center', gap: 12 }, featureText: { color: '#FFF', fontWeight: '800' }, guest: { backgroundColor: '#00B4D8', padding: 17, borderRadius: 16, alignItems: 'center' }, guestText: { color: '#0A192F', fontWeight: '900', fontSize: 16 }, login: { borderWidth: 1, borderColor: '#5DD5EC', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 }, loginText: { color: '#C5F5FF', fontWeight: '800' } });
