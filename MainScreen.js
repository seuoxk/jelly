import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';

const BEACHES = [
  { name: '해운대 해수욕장', latitude: 35.1587, longitude: 129.1604, region: '부산', extraInfo: {} },
  { name: '광안리 해수욕장', latitude: 35.1532, longitude: 129.1187, region: '부산', extraInfo: {} },
  { name: '송정 해수욕장', latitude: 35.1801, longitude: 129.1996, region: '부산', extraInfo: {} },
  { name: '경포 해수욕장', latitude: 37.7955, longitude: 128.9077, region: '강원', extraInfo: {} },
  { name: '속초 해수욕장', latitude: 38.1903, longitude: 128.6027, region: '강원', extraInfo: {} },
  { name: '협재 해수욕장', latitude: 33.3949, longitude: 126.2395, region: '제주', extraInfo: {} },
  { name: '함덕 해수욕장', latitude: 33.5430, longitude: 126.6695, region: '제주', extraInfo: {} },
  { name: '대천 해수욕장', latitude: 36.3057, longitude: 126.5132, region: '충남', extraInfo: {} },
];
const DEFAULT_POSITION = { latitude: 35.1587, longitude: 129.1604 };

export default function MainScreen({ navigation }) {
  const { user, isGuest } = useAuth();
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [notice, setNotice] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [now, setNow] = useState(new Date());

  const loadLocation = useCallback(async () => {
    setLoadingLocation(true); setNotice('');
    try {
      if (!(await Location.hasServicesEnabledAsync())) throw new Error('서비스가 꺼져 있습니다.');
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('위치 권한이 없어 해운대 기준으로 표시합니다.');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPosition({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    } catch (error) { setPosition(DEFAULT_POSITION); setNotice(error.message || '현재 위치를 불러오지 못했습니다.'); }
    finally { setLoadingLocation(false); }
  }, []);

  useEffect(() => { loadLocation(); AsyncStorage.getItem('favoriteBeaches').then((value) => setFavorites(JSON.parse(value || '[]'))); }, [loadLocation]);
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  const nearby = useMemo(() => BEACHES.map((beach) => ({ ...beach, distance: distanceKm(position, beach) })).sort((a, b) => a.distance - b.distance), [position]);
  const nearest = nearby[0];
  const toggleFavorite = async (name) => { const next = favorites.includes(name) ? favorites.filter((item) => item !== name) : [...favorites, name]; setFavorites(next); await AsyncStorage.setItem('favoriteBeaches', JSON.stringify(next)); };
  const hour = now.getHours(); const waterTemp = 22 + Math.round(Math.sin(hour / 24 * Math.PI) * 2); const wind = 2.5 + ((hour * 3) % 11) / 2; const current = 0.2 + ((hour * 7) % 7) / 10; const score = Number(waterTemp >= 25) + Number(wind >= 6) + Number(current >= 0.65); const risk = [{ text: '안전', color: '#15803D', bg: '#DCFCE7' }, { text: '관심', color: '#B45309', bg: '#FEF3C7' }, { text: '주의', color: '#C2410C', bg: '#FFEDD5' }, { text: '경보', color: '#B91C1C', bg: '#FEE2E2' }][score];

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
    <View style={s.header}><View><Text style={s.logo}>seafari</Text><Text style={s.welcome}>{isGuest ? '게스트 님, 환영합니다!' : `${user?.nickname || '탐험가'} 님, 환영합니다!`}</Text></View>{isGuest ? <TouchableOpacity style={s.loginButton} onPress={() => navigation.getParent()?.navigate('Auth')}><Text style={s.loginText}>로그인</Text></TouchableOpacity> : <Ionicons name="water" size={29} color="#00B4D8" />}</View>
    {isGuest && <TouchableOpacity style={s.guestBanner} onPress={() => navigation.getParent()?.navigate('Auth')}><Ionicons name="cloud-upload-outline" size={18} color="#075985" /><Text style={s.guestText}>로그인하고 기록과 즐겨찾기를 안전하게 저장해보세요!</Text><Text style={s.guestLink}>로그인</Text></TouchableOpacity>}
    <View style={s.favoriteSection}><Text style={s.sectionLabel}>관심 해수욕장</Text><View style={s.favoriteRow}>{['해운대 해수욕장', '광안리 해수욕장', '경포 해수욕장'].map((name) => <TouchableOpacity key={name} onPress={() => toggleFavorite(name)} style={[s.favoriteChip, favorites.includes(name) && s.favoriteOn]}><Ionicons name={favorites.includes(name) ? 'heart' : 'heart-outline'} size={14} color="#FF4D4D" /><Text style={s.favoriteText}>{name.replace(' 해수욕장', '')}</Text></TouchableOpacity>)}</View></View>
    {loadingLocation ? <View style={s.card}><ActivityIndicator color="#00B4D8" /><Text style={s.loadingText}>가까운 해수욕장을 찾고 있어요...</Text></View> : <View style={s.card}><View style={s.cardTop}><View><Text style={s.caption}>가장 가까운 해수욕장</Text><Text style={s.beachName}>{nearest.name}</Text><Text style={s.subtext}>{nearest.distance.toFixed(1)}km · {nearest.region}</Text></View><TouchableOpacity onPress={() => toggleFavorite(nearest.name)}><Ionicons name={favorites.includes(nearest.name) ? 'heart' : 'heart-outline'} size={30} color="#FF4D4D" /></TouchableOpacity></View>{notice ? <TouchableOpacity onPress={loadLocation} style={s.notice}><Text style={s.noticeText}>{notice} · 다시 시도</Text></TouchableOpacity> : null}</View>}
    <View style={s.card}><View style={s.cardTop}><View><Text style={s.caption}>실시간 해파리 위험도 예보</Text><Text style={s.beachName}>{nearest?.name || '해운대 해수욕장'}</Text></View><View style={[s.riskBadge, { backgroundColor: risk.bg }]}><Text style={{ color: risk.color, fontWeight: '900' }}>{risk.text}</Text></View></View><View style={s.metrics}><Metric icon="thermometer-outline" label="수온" value={`${waterTemp}°C`} /><Metric icon="navigate-outline" label="흐름" value={`${current.toFixed(1)}m/s`} /><Metric icon="flag-outline" label="바람" value={`${wind.toFixed(1)}m/s`} /></View><Text style={s.subtext}>수온·유속·바람을 조합한 모의 예보입니다.</Text></View>
    <View style={s.menuGrid}><Menu icon="pulse-outline" title="실시간 예보" text="해양 안전 정보" onPress={() => {}} /><Menu icon="scan-outline" title="AI 생물 스캐너" text="사진으로 위험 확인" onPress={() => navigation.navigate('Scanner')} /><Menu icon="book-outline" title="해양 도감" text="생물 정보 검색" onPress={() => navigation.navigate('Dictionary')} /><Menu icon="medkit-outline" title="응급 대처" text="119·오프라인 수칙" onPress={() => navigation.navigate('Emergency')} /></View>
  </ScrollView></SafeAreaView>;
}
function Metric({ icon, label, value }) { return <View style={s.metric}><Ionicons name={icon} size={20} color="#00B4D8" /><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value}</Text></View>; }
function Menu({ icon, title, text, onPress }) { return <TouchableOpacity style={s.menu} onPress={onPress}><Ionicons name={icon} size={23} color="#00B4D8" /><Text style={s.menuTitle}>{title}</Text><Text style={s.menuText}>{text}</Text></TouchableOpacity>; }
function distanceKm(a, b) { const r = (value) => value * Math.PI / 180; const dLat = r(b.latitude - a.latitude); const dLng = r(b.longitude - a.longitude); const x = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(dLng / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)); }
const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#F0FAFC' }, container: { padding: 20, paddingBottom: 40, width: '100%', maxWidth: 680, alignSelf: 'center' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 20 }, logo: { fontSize: 30, fontWeight: '900', color: '#0A192F' }, welcome: { color: '#607D8B', marginTop: 4 }, loginButton: { backgroundColor: '#00B4D8', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 14 }, loginText: { color: '#0A192F', fontWeight: '900', fontSize: 12 }, guestBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#DDF6FB', padding: 12, borderRadius: 13, marginBottom: 17 }, guestText: { color: '#075985', fontSize: 12, flex: 1, fontWeight: '700' }, guestLink: { color: '#075985', fontWeight: '900', fontSize: 12 }, favoriteSection: { marginBottom: 13 }, sectionLabel: { color: '#0A192F', fontWeight: '900', fontSize: 14, marginBottom: 7 }, favoriteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, favoriteChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14 }, favoriteOn: { backgroundColor: '#FFF0F0' }, favoriteText: { color: '#475569', fontSize: 12, fontWeight: '700' }, card: { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 14, ...(Platform.OS === 'web' ? { boxShadow: '0 4px 16px rgba(10,25,47,0.08)' } : { elevation: 2 }) }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, caption: { color: '#00A2C2', fontSize: 12, fontWeight: '900' }, beachName: { color: '#0A192F', fontSize: 20, fontWeight: '900', marginTop: 5 }, subtext: { color: '#607D8B', fontSize: 12, marginTop: 6 }, notice: { backgroundColor: '#FFF7ED', borderRadius: 9, padding: 10, marginTop: 12 }, noticeText: { color: '#9A3412', fontSize: 12, fontWeight: '700' }, loadingText: { color: '#075985', textAlign: 'center', marginTop: 10, fontWeight: '700' }, riskBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 }, metrics: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }, metric: { flex: 1, alignItems: 'center' }, metricLabel: { color: '#607D8B', fontSize: 12, marginTop: 5 }, metricValue: { color: '#0A192F', fontWeight: '900', fontSize: 13, marginTop: 3 }, menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5 }, menu: { width: '48%', backgroundColor: '#FFF', borderRadius: 17, padding: 15 }, menuTitle: { color: '#0A192F', fontWeight: '900', fontSize: 14, marginTop: 8 }, menuText: { color: '#607D8B', fontSize: 11, marginTop: 4 } });
