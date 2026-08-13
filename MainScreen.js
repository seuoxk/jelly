import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import { useAppSettings } from './AppSettingsContext';
import HeaderControls from './HeaderControls';

const BEACHES = [
  { name: '해운대해수욕장', latitude: 35.1587, longitude: 129.1604, nx: 99, ny: 75 }, { name: '광안리해수욕장', latitude: 35.1532, longitude: 129.1187, nx: 98, ny: 75 }, { name: '송도해수욕장', latitude: 35.0757, longitude: 129.0169, nx: 97, ny: 74 }, { name: '송정해수욕장', latitude: 35.1801, longitude: 129.1996, nx: 100, ny: 75 }, { name: '다대포해수욕장', latitude: 35.0468, longitude: 128.9656, nx: 97, ny: 74 }, { name: '일광해수욕장', latitude: 35.2611, longitude: 129.2336, nx: 101, ny: 76 }, { name: '임랑해수욕장', latitude: 35.3163, longitude: 129.2628, nx: 101, ny: 77 },
];
const DEFAULT_BEACH = BEACHES[2];
const km = (a, b) => { const r = (v) => v * Math.PI / 180; const x = Math.sin(r(b.latitude - a.latitude) / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(r(b.longitude - a.longitude) / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)); };
const weatherLabel = (sky, rain, language) => { if (rain && rain !== '0') return language === 'en' ? 'Precipitation' : '강수'; return language === 'en' ? ({ 1: 'Clear', 3: 'Cloudy', 4: 'Overcast' })[Number(sky)] || 'Checking' : ({ 1: '맑음', 3: '구름 많음', 4: '흐림' })[Number(sky)] || '확인 중'; };
function getEncodedKmaServiceKey(rawKey) {
  try { return encodeURIComponent(decodeURIComponent(rawKey)); }
  catch (_) { return encodeURIComponent(rawKey); }
}
function getKmaBaseDateTime() {
  // The KMA ultra-short current observation is published at about :40 each hour.
  // Build the query time in Asia/Seoul even when the web bundle runs elsewhere.
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const base = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute)));
  if (base.getUTCMinutes() < 40) base.setUTCHours(base.getUTCHours() - 1);
  const date = `${base.getUTCFullYear()}${String(base.getUTCMonth() + 1).padStart(2, '0')}${String(base.getUTCDate()).padStart(2, '0')}`;
  return { date, time: `${String(base.getUTCHours()).padStart(2, '0')}00` };
}

export default function MainScreen({ navigation }) {
  const { user, isGuest } = useAuth(); const { colors, t, language } = useAppSettings();
  const [position, setPosition] = useState(DEFAULT_BEACH); const [loadingLocation, setLoadingLocation] = useState(true); const [weatherLoading, setWeatherLoading] = useState(true); const [weather, setWeather] = useState(null); const [error, setError] = useState(''); const [favorites, setFavorites] = useState([]);
  const nearest = useMemo(() => BEACHES.map((beach) => ({ ...beach, distance: km(position, beach) })).sort((a, b) => a.distance - b.distance)[0] || DEFAULT_BEACH, [position]);
  const locate = useCallback(async () => { setLoadingLocation(true); try { const granted = (await Location.requestForegroundPermissionsAsync()).status === 'granted'; if (!granted) throw new Error(); const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); setPosition(current.coords); } catch (_) { setPosition(DEFAULT_BEACH); } finally { setLoadingLocation(false); } }, []);
  const loadWeather = useCallback(async (beach) => {
    setWeatherLoading(true); setError('');
    try {
      const rawServiceKey = process.env.EXPO_PUBLIC_KMA_SERVICE_KEY;
      if (!rawServiceKey) throw new Error('KMA_SERVICE_KEY_MISSING');
      // Decode once and encode once: avoids corrupting Data.go.kr decoded keys.
      const serviceKey = getEncodedKmaServiceKey(rawServiceKey);
      const { date, time } = getKmaBaseDateTime();
      const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${serviceKey}&pageNo=1&numOfRows=60&dataType=JSON&base_date=${date}&base_time=${time}&nx=${beach.nx}&ny=${beach.ny}`;
      const response = await fetch(url);
      const responseText = await response.text();
      console.log('KMA response:', response.status, responseText);
      let data;
      try { data = JSON.parse(responseText); }
      catch (_) { throw new Error('KMA_RESPONSE_NOT_JSON'); }
      const header = data?.response?.header;
      if (!response.ok || header?.resultCode !== '00') throw new Error(header?.resultMsg || `KMA_HTTP_${response.status}`);
      const values = Object.fromEntries((data?.response?.body?.items?.item || []).map((item) => [item.category, item.obsrValue]));
      if (values.T1H === undefined || values.WSD === undefined) throw new Error('KMA_OBSERVATION_NOT_READY');
      setWeather({ temperature: Number(values.T1H), wind: Number(values.WSD), sky: values.SKY, rain: values.PTY, at: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)} ${time.slice(0, 2)}:00` });
    } catch (requestError) {
      console.log('KMA request error:', requestError?.message || requestError);
      setWeather(null);
      setError(language === 'en' ? 'KMA data is being updated. Please try again shortly.' : '기상청 데이터 업데이트 중입니다. 잠시 후 다시 확인해 주세요.');
    } finally { setWeatherLoading(false); }
  }, [language]);
  useEffect(() => { locate(); AsyncStorage.getItem('favoriteBeaches').then((value) => setFavorites(JSON.parse(value || '[]'))).catch(() => {}); }, [locate]);
  useEffect(() => { loadWeather(nearest); }, [nearest.name, loadWeather]);
  const toggleFavorite = async (name) => { const next = favorites.includes(name) ? favorites.filter((item) => item !== name) : [...favorites, name]; setFavorites(next); await AsyncStorage.setItem('favoriteBeaches', JSON.stringify(next)); };
  const riskScore = weather ? Number(weather.wind >= 9) + Number(weather.temperature >= 26) : 0; const risk = [[t('safe'), '#15803D', '#DCFCE7'], [t('interest'), '#B45309', '#FEF3C7'], [t('caution'), '#C2410C', '#FFEDD5'], [t('warning'), '#B91C1C', '#FEE2E2']][riskScore];
  return <SafeAreaView style={[s.safe, { backgroundColor: colors.background }, Platform.OS === 'web' && { transition: 'background-color 180ms ease, color 180ms ease' }]}><ScrollView contentContainerStyle={s.container}>
    <View style={s.header}><View><Text style={[s.logo, { color: colors.text }]}>{t('brand')}</Text><Text style={[s.welcome, { color: colors.muted }]}>{isGuest ? t('welcomeGuest') : `${user?.nickname || 'Sea fari'}${language === 'en' ? ', welcome!' : ' 님, 환영합니다!'}`}</Text></View><View style={s.headerRight}><HeaderControls />{isGuest && <TouchableOpacity style={s.login} onPress={() => navigation.getParent()?.navigate('Auth')}><Text style={s.loginText}>{t('login')}</Text></TouchableOpacity>}</View></View>
    <Text style={[s.heading, { color: colors.text }]}>{t('beaches')}</Text><View style={s.chips}>{BEACHES.map((beach) => <TouchableOpacity key={beach.name} onPress={() => toggleFavorite(beach.name)} style={[s.chip, { backgroundColor: colors.surface }, favorites.includes(beach.name) && s.chipActive]}><Ionicons name={favorites.includes(beach.name) ? 'heart' : 'heart-outline'} color="#FF4D4D" size={14} /><Text style={[s.chipText, { color: colors.text }]}>{beach.name.replace('해수욕장', '')}</Text></TouchableOpacity>)}</View>
    <Card colors={colors}><Text style={s.caption}>{t('nearest')}</Text>{loadingLocation ? <ActivityIndicator color={colors.accent} /> : <><Text style={[s.beach, { color: colors.text }]}>{nearest.name}</Text><Text style={[s.muted, { color: colors.muted }]}>{nearest.distance.toFixed(1)} km · Busan</Text></>}</Card>
    <Card colors={colors}><View style={s.row}><View><Text style={s.caption}>{t('forecast')}</Text><Text style={[s.beach, { color: colors.text }]}>{nearest.name}</Text></View><View style={[s.badge, { backgroundColor: risk[2] }]}><Text style={{ color: risk[1], fontWeight: '900' }}>{risk[0]}</Text></View></View>{weatherLoading ? <View style={s.loading}><ActivityIndicator color={colors.accent} /><Text style={[s.muted, { color: colors.muted }]}>{t('loadingWeather')}</Text></View> : weather ? <><View style={s.metrics}><Metric icon="thermometer-outline" label={t('temperature')} value={`${weather.temperature.toFixed(1)}°C`} colors={colors} /><Metric icon="flag-outline" label={t('wind')} value={`${weather.wind.toFixed(1)}m/s`} colors={colors} /><Metric icon="cloud-outline" label={t('weather')} value={weatherLabel(weather.sky, weather.rain, language)} colors={colors} /></View><Text style={[s.muted, { color: colors.muted }]}>{weather.at}</Text></> : <TouchableOpacity style={s.weatherFallback} onPress={() => loadWeather(nearest)}><Ionicons name="refresh-outline" size={18} color={colors.icon} /><Text style={[s.fallbackText, { color: colors.icon }]}>{error || (language === 'en' ? 'KMA data is being updated.' : '기상청 데이터 업데이트 중입니다.')}</Text></TouchableOpacity>}<Text style={[s.source, { color: colors.muted }]}>{t('sourceKma')}</Text></Card>
    <View style={s.grid}><Menu icon="scan-outline" title={t('scanner')} text={language === 'en' ? 'Check risks from photos' : '사진으로 위험 확인'} colors={colors} onPress={() => navigation.navigate('Scanner')} /><Menu icon="book-outline" title={t('dictionary')} text={language === 'en' ? 'Search marine life' : '생물 정보 검색'} colors={colors} onPress={() => navigation.navigate('Dictionary')} /><Menu icon="medkit-outline" title={t('emergency')} text="119" colors={colors} onPress={() => navigation.navigate('Emergency')} /><Menu icon="person-outline" title={t('profile')} text={language === 'en' ? 'Settings' : '설정'} colors={colors} onPress={() => navigation.navigate('Profile')} /></View>
  </ScrollView></SafeAreaView>;
}
function Card({ colors, children }) { return <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }, Platform.OS === 'web' && { boxShadow: '0 4px 16px rgba(10,25,47,0.12)' }]}>{children}</View>; }
function Metric({ icon, label, value, colors }) { return <View style={s.metric}><Ionicons name={icon} size={20} color={colors.accent} /><Text style={[s.metricLabel, { color: colors.muted }]}>{label}</Text><Text style={[s.metricValue, { color: colors.text }]}>{value}</Text></View>; }
function Menu({ icon, title, text, colors, onPress }) { return <TouchableOpacity style={[s.menu, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onPress}><Ionicons name={icon} size={23} color={colors.accent} /><Text style={[s.menuTitle, { color: colors.text }]}>{title}</Text><Text style={[s.menuText, { color: colors.muted }]}>{text}</Text></TouchableOpacity>; }
const s = StyleSheet.create({ safe: { flex: 1 }, container: { padding: 20, paddingBottom: 40, maxWidth: 680, width: '100%', alignSelf: 'center' }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, headerRight: { flexDirection: 'row', alignItems: 'center', gap: 7 }, logo: { fontSize: 30, fontWeight: '900' }, welcome: { marginTop: 4 }, login: { backgroundColor: '#00B4D8', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 13 }, loginText: { color: '#062235', fontWeight: '900', fontSize: 12 }, heading: { fontSize: 15, fontWeight: '900', marginBottom: 8 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 }, chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14 }, chipActive: { backgroundColor: '#FFF0F0' }, chipText: { fontSize: 12, fontWeight: '700' }, card: { borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 14 }, row: { flexDirection: 'row', justifyContent: 'space-between' }, caption: { color: '#00A2C2', fontSize: 12, fontWeight: '900' }, beach: { fontSize: 20, fontWeight: '900', marginTop: 5 }, muted: { fontSize: 12, marginTop: 8 }, badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 }, loading: { paddingVertical: 22, alignItems: 'center' }, weatherFallback: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#E0F2FE', padding: 12, borderRadius: 12, marginTop: 18 }, fallbackText: { flex: 1, fontWeight: '700', fontSize: 13, lineHeight: 19 }, metrics: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }, metric: { flex: 1, alignItems: 'center' }, metricLabel: { fontSize: 12, marginTop: 5 }, metricValue: { fontWeight: '900', fontSize: 13, marginTop: 3 }, source: { fontSize: 11, marginTop: 13 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, menu: { width: '48%', borderWidth: 1, borderRadius: 17, padding: 15 }, menuTitle: { fontWeight: '900', fontSize: 14, marginTop: 8 }, menuText: { fontSize: 11, marginTop: 4 } });
