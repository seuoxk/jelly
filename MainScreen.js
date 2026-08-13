import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import { useAppSettings } from './AppSettingsContext';
import HeaderControls from './HeaderControls';
import SkeletonCard from './SkeletonCard';

// Busan's seven official beach presets. KMA grid values intentionally match
// the supplied forecast coordinates so every manual selection is deterministic.
const BUSAN_BEACHES = [
  { id: 'haeundae', nameKey: 'main.beachHaeundae', latitude: 35.1587, longitude: 129.1604, nx: 98, ny: 75 },
  { id: 'gwangalli', nameKey: 'main.beachGwangalli', latitude: 35.1532, longitude: 129.1187, nx: 97, ny: 75 },
  { id: 'songdo', nameKey: 'main.beachSongdo', latitude: 35.0757, longitude: 129.0169, nx: 97, ny: 74 },
  { id: 'dadaepo', nameKey: 'main.beachDadaepo', latitude: 35.0468, longitude: 128.9656, nx: 96, ny: 74 },
  { id: 'songjeong', nameKey: 'main.beachSongjeong', latitude: 35.1801, longitude: 129.1996, nx: 99, ny: 76 },
  { id: 'ilgwang', nameKey: 'main.beachIlgwang', latitude: 35.2611, longitude: 129.2336, nx: 100, ny: 77 },
  { id: 'imrang', nameKey: 'main.beachImrang', latitude: 35.3163, longitude: 129.2628, nx: 100, ny: 78 },
];
const DEFAULT_BEACH = BUSAN_BEACHES[2];
const distanceKm = (a, b) => { const r = (v) => v * Math.PI / 180; const h = Math.sin(r(b.latitude - a.latitude) / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(r(b.longitude - a.longitude) / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)); };
function getEncodedKmaServiceKey(rawKey) { try { return encodeURIComponent(decodeURIComponent(rawKey)); } catch (_) { return encodeURIComponent(rawKey); } }
function getKmaBaseDateTime() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const base = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute)));
  if (base.getUTCMinutes() < 40) base.setUTCHours(base.getUTCHours() - 1);
  return { date: `${base.getUTCFullYear()}${String(base.getUTCMonth() + 1).padStart(2, '0')}${String(base.getUTCDate()).padStart(2, '0')}`, time: `${String(base.getUTCHours()).padStart(2, '0')}00` };
}

export default function MainScreen({ navigation }) {
  const { user, isGuest } = useAuth();
  const { colors, t } = useAppSettings();
  const [position, setPosition] = useState(DEFAULT_BEACH);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [selectedBeachId, setSelectedBeachId] = useState('nearby');
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState([]);

  const nearbyBeach = useMemo(() => BUSAN_BEACHES.map((beach) => ({ ...beach, distance: distanceKm(position, beach) })).sort((a, b) => a.distance - b.distance)[0] || DEFAULT_BEACH, [position]);
  const selectedBeach = selectedBeachId === 'nearby' ? nearbyBeach : BUSAN_BEACHES.find((beach) => beach.id === selectedBeachId) || nearbyBeach;
  const beachLabel = (beach) => t(beach.nameKey);

  const locate = useCallback(async () => {
    setLoadingLocation(true);
    try {
      const granted = (await Location.requestForegroundPermissionsAsync()).status === 'granted';
      if (!granted) throw new Error('LOCATION_DENIED');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPosition(current.coords);
    } catch (_) { setPosition(DEFAULT_BEACH); }
    finally { setLoadingLocation(false); }
  }, []);

  const loadWeather = useCallback(async (beach) => {
    setWeatherLoading(true); setError('');
    try {
      const rawServiceKey = process.env.EXPO_PUBLIC_KMA_SERVICE_KEY;
      if (!rawServiceKey) throw new Error('KMA_SERVICE_KEY_MISSING');
      const { date, time } = getKmaBaseDateTime();
      const serviceKey = getEncodedKmaServiceKey(rawServiceKey);
      const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${serviceKey}&pageNo=1&numOfRows=60&dataType=JSON&base_date=${date}&base_time=${time}&nx=${beach.nx}&ny=${beach.ny}`;
      const response = await fetch(url); const responseText = await response.text();
      console.log('KMA response:', response.status, responseText);
      let data; try { data = JSON.parse(responseText); } catch (_) { throw new Error('KMA_RESPONSE_NOT_JSON'); }
      const header = data?.response?.header;
      if (!response.ok || header?.resultCode !== '00') throw new Error(header?.resultMsg || `KMA_HTTP_${response.status}`);
      const values = Object.fromEntries((data?.response?.body?.items?.item || []).map((item) => [item.category, item.obsrValue]));
      if (values.T1H === undefined || values.WSD === undefined) throw new Error('KMA_OBSERVATION_NOT_READY');
      setWeather({ temperature: Number(values.T1H), wind: Number(values.WSD), sky: values.SKY, rain: values.PTY, at: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)} ${time.slice(0, 2)}:00` });
    } catch (requestError) { console.log('KMA request error:', requestError?.message || requestError); setWeather(null); setError(t('main.kmaUpdating')); }
    finally { setWeatherLoading(false); }
  }, [t]);

  useEffect(() => { locate(); AsyncStorage.getItem('favoriteBeaches').then((value) => setFavorites(JSON.parse(value || '[]'))).catch(() => {}); }, [locate]);
  useEffect(() => { loadWeather(selectedBeach); }, [selectedBeach.id, loadWeather]);
  const toggleFavorite = async (id) => { const next = favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id]; setFavorites(next); await AsyncStorage.setItem('favoriteBeaches', JSON.stringify(next)); };
  const riskScore = weather ? Number(weather.wind >= 9) + Number(weather.temperature >= 26) : 0;
  const risk = [[t('main.safe'), colors.success, colors.successSoft], [t('main.interest'), colors.warning, colors.warningSoft], [t('main.caution'), colors.warning, colors.warningSoft], [t('main.warning'), colors.danger, colors.dangerSoft]][riskScore];

  return <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={s.container}>
    <View style={s.header}><View><Text style={[s.logo, { color: colors.text }]}>{t('common.brand')}</Text><Text style={[s.welcome, { color: colors.muted }]}>{isGuest ? t('main.welcomeGuest') : t('main.welcomeUser', { name: user?.nickname || 'seafari' })}</Text></View><View style={s.headerRight}><HeaderControls />{isGuest && <TouchableOpacity style={[s.login, { backgroundColor: colors.accent }]} onPress={() => navigation.getParent()?.navigate('Auth')}><Text style={[s.loginText, { color: colors.onAccent }]}>{t('common.login')}</Text></TouchableOpacity>}</View></View>
    <Text style={[s.heading, { color: colors.text }]}>{t('main.beaches')}</Text><View style={s.favoriteChips}>{BUSAN_BEACHES.map((beach) => <TouchableOpacity key={beach.id} onPress={() => toggleFavorite(beach.id)} style={[s.favoriteChip, { backgroundColor: colors.surface }, favorites.includes(beach.id) && { backgroundColor: colors.dangerSoft }]}><Ionicons name={favorites.includes(beach.id) ? 'heart' : 'heart-outline'} color={colors.danger} size={14} /><Text style={[s.chipText, { color: colors.text }]}>{beachLabel(beach)}</Text></TouchableOpacity>)}</View>
    <Card colors={colors}><Text style={[s.caption, { color: colors.accentStrong }]}>{t('main.nearest')}</Text>{loadingLocation ? <SkeletonCard lines={2} /> : <><Text style={[s.beach, { color: colors.text }]}>{beachLabel(nearbyBeach)}</Text><Text style={[s.muted, { color: colors.muted }]}>{nearbyBeach.distance.toFixed(1)} km · Busan</Text></>}</Card>
    <Card colors={colors}><View style={s.row}><View><Text style={[s.caption, { color: colors.accentStrong }]}>{t('main.forecast')}</Text><Text style={[s.beach, { color: colors.text }]}>{beachLabel(selectedBeach)}</Text></View><View style={[s.badge, { backgroundColor: risk[2] }]}><Text style={{ color: risk[1], fontWeight: '900' }}>{risk[0]}</Text></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.selectorChips} style={s.selectorScroll}>
        <BeachChip selected={selectedBeachId === 'nearby'} icon="location" label={t('main.nearbyLocation')} onPress={() => setSelectedBeachId('nearby')} colors={colors} />
        {BUSAN_BEACHES.map((beach) => <BeachChip key={beach.id} selected={selectedBeachId === beach.id} label={beachLabel(beach)} onPress={() => setSelectedBeachId(beach.id)} colors={colors} />)}
      </ScrollView>
      {weatherLoading ? <View style={s.loading}><SkeletonCard lines={2} /></View> : weather ? <><View style={s.metrics}><Metric icon="thermometer-outline" label={t('main.temperature')} value={`${weather.temperature.toFixed(1)}°C`} colors={colors} /><Metric icon="flag-outline" label={t('main.wind')} value={`${weather.wind.toFixed(1)}m/s`} colors={colors} /><Metric icon="cloud-outline" label={t('main.weather')} value={weather.rain && weather.rain !== '0' ? t('main.rain') : t('main.checking')} colors={colors} /></View><Text style={[s.muted, { color: colors.muted }]}>{weather.at}</Text></> : <TouchableOpacity style={[s.weatherFallback, { backgroundColor: colors.soft }]} onPress={() => loadWeather(selectedBeach)}><Ionicons name="refresh-outline" size={18} color={colors.accentStrong} /><Text style={[s.fallbackText, { color: colors.accentStrong }]}>{error}</Text></TouchableOpacity>}<Text style={[s.source, { color: colors.muted }]}>{t('main.sourceKma')}</Text></Card>
    <View style={s.grid}><Menu icon="scan-outline" title={t('tabs.scanner')} text={t('main.photoRisk')} colors={colors} onPress={() => navigation.navigate('Scanner')} /><Menu icon="book-outline" title={t('tabs.dictionary')} text={t('main.searchLife')} colors={colors} onPress={() => navigation.navigate('Dictionary')} /><Menu icon="medkit-outline" title={t('tabs.emergency')} text="119" colors={colors} onPress={() => navigation.navigate('Emergency')} /><Menu icon="person-outline" title={t('tabs.profile')} text={t('main.settings')} colors={colors} onPress={() => navigation.navigate('Profile')} /></View>
  </ScrollView></SafeAreaView>;
}
function BeachChip({ selected, icon, label, onPress, colors }) { return <TouchableOpacity onPress={onPress} style={[s.selectorChip, { backgroundColor: selected ? colors.accent : colors.soft, borderColor: selected ? colors.accent : colors.border }]}><>{icon && <Ionicons name={icon} size={14} color={selected ? colors.onAccent : colors.accentStrong} />}</><Text style={[s.selectorText, { color: selected ? colors.onAccent : colors.text }]}>{label}</Text></TouchableOpacity>; }
function Card({ colors, children }) { return <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }, Platform.OS === 'web' && { boxShadow: colors.shadow }]}>{children}</View>; }
function Metric({ icon, label, value, colors }) { return <View style={s.metric}><Ionicons name={icon} size={20} color={colors.accent} /><Text style={[s.metricLabel, { color: colors.muted }]}>{label}</Text><Text style={[s.metricValue, { color: colors.text }]}>{value}</Text></View>; }
function Menu({ icon, title, text, colors, onPress }) { return <TouchableOpacity style={[s.menu, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onPress}><Ionicons name={icon} size={23} color={colors.accent} /><Text style={[s.menuTitle, { color: colors.text }]}>{title}</Text><Text style={[s.menuText, { color: colors.muted }]}>{text}</Text></TouchableOpacity>; }
const s = StyleSheet.create({ safe: { flex: 1 }, container: { padding: 20, paddingBottom: 40, width: '100%', alignSelf: 'center' }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, headerRight: { flexDirection: 'row', alignItems: 'center', gap: 7 }, logo: { fontSize: 30, fontWeight: '900' }, welcome: { marginTop: 4 }, login: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 13 }, loginText: { fontWeight: '900', fontSize: 12 }, heading: { fontSize: 15, fontWeight: '900', marginBottom: 8 }, favoriteChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 }, favoriteChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14 }, chipText: { fontSize: 12, fontWeight: '700' }, card: { borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 14 }, row: { flexDirection: 'row', justifyContent: 'space-between' }, caption: { fontSize: 12, fontWeight: '900' }, beach: { fontSize: 20, fontWeight: '900', marginTop: 5 }, muted: { fontSize: 12, marginTop: 8 }, badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 }, selectorScroll: { marginTop: 16 }, selectorChips: { gap: 8, paddingRight: 8 }, selectorChip: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, borderWidth: 1, borderRadius: 21 }, selectorText: { fontSize: 13, fontWeight: '800' }, loading: { paddingVertical: 20 }, weatherFallback: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 12, borderRadius: 12, marginTop: 18 }, fallbackText: { flex: 1, fontWeight: '700', fontSize: 13, lineHeight: 19 }, metrics: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }, metric: { flex: 1, alignItems: 'center' }, metricLabel: { fontSize: 12, marginTop: 5 }, metricValue: { fontWeight: '900', fontSize: 13, marginTop: 3 }, source: { fontSize: 11, marginTop: 13 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, menu: { width: '48%', borderWidth: 1, borderRadius: 17, padding: 15 }, menuTitle: { fontWeight: '900', fontSize: 14, marginTop: 8 }, menuText: { fontSize: 11, marginTop: 4 } });
