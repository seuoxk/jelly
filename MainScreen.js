import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

// API 연동 전 사용할 해수욕장 데이터입니다. extraInfo에 수온·파고·해파리 API 값을 추가할 수 있습니다.
const BEACHES = [
  { name: '해운대 해수욕장', latitude: 35.1587, longitude: 129.1604, region: '부산', extraInfo: {} },
  { name: '광안리 해수욕장', latitude: 35.1532, longitude: 129.1187, region: '부산', extraInfo: {} },
  { name: '송정 해수욕장', latitude: 35.1801, longitude: 129.1996, region: '부산', extraInfo: {} },
  { name: '다대포 해수욕장', latitude: 35.0474, longitude: 128.9673, region: '부산', extraInfo: {} },
  { name: '상주은모래비치', latitude: 34.7182, longitude: 127.9868, region: '경남', extraInfo: {} },
  { name: '학동흑진주몽돌해변', latitude: 34.7735, longitude: 128.6426, region: '경남', extraInfo: {} },
  { name: '경포 해수욕장', latitude: 37.7955, longitude: 128.9077, region: '강원', extraInfo: {} },
  { name: '속초 해수욕장', latitude: 38.1903, longitude: 128.6027, region: '강원', extraInfo: {} },
  { name: '망상 해수욕장', latitude: 37.5936, longitude: 129.0904, region: '강원', extraInfo: {} },
  { name: '낙산 해수욕장', latitude: 38.1245, longitude: 128.6322, region: '강원', extraInfo: {} },
  { name: '협재 해수욕장', latitude: 33.3949, longitude: 126.2395, region: '제주', extraInfo: {} },
  { name: '함덕 해수욕장', latitude: 33.5430, longitude: 126.6695, region: '제주', extraInfo: {} },
  { name: '이호테우 해수욕장', latitude: 33.4977, longitude: 126.4528, region: '제주', extraInfo: {} },
  { name: '을왕리 해수욕장', latitude: 37.4495, longitude: 126.3726, region: '인천', extraInfo: {} },
  { name: '대천 해수욕장', latitude: 36.3057, longitude: 126.5132, region: '충남', extraInfo: {} },
  { name: '꽃지 해수욕장', latitude: 36.4998, longitude: 126.3385, region: '충남', extraInfo: {} },
];

const DEFAULT_LOCATION = { latitude: 35.1587, longitude: 129.1604 };
const JELLYFISH_STATUS = { level: '주의', sightings: '최근 24시간 3건 신고', note: '해안가를 중심으로 해파리 목격 제보가 있습니다. 물속 생물을 발견하면 만지지 말고 안전요원에게 알려주세요.' };
const STATUS_STYLE = { 안전: { color: '#16A34A', background: '#DCFCE7', icon: 'checkmark-circle' }, 주의: { color: '#D97706', background: '#FEF3C7', icon: 'alert-circle' }, 경계: { color: '#EA580C', background: '#FFEDD5', icon: 'warning' }, 심각: { color: '#DC2626', background: '#FEE2E2', icon: 'close-circle' } };

export default function MainScreen({ navigation }) {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [locationState, setLocationState] = useState('loading'); // loading | ready | fallback | error
  const [locationMessage, setLocationMessage] = useState('현재 위치를 확인하고 있어요.');
  const [now, setNow] = useState(new Date());

  const findLocation = useCallback(async () => {
    setLocationState('loading'); setLocationMessage('현재 위치를 확인하고 있어요.');
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) throw new Error('services-off');
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('permission-denied');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, mayShowUserSettingsDialog: true });
      setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setLocationState('ready');
    } catch (error) {
      const code = error?.message;
      const messages = { 'services-off': '위치 서비스가 꺼져 있어 해운대 기준으로 표시합니다.', 'permission-denied': '위치 권한이 없어 해운대 기준으로 표시합니다.', 'timeout': 'GPS 응답 시간이 초과되어 해운대 기준으로 표시합니다.' };
      setLocation(DEFAULT_LOCATION); setLocationState(code === 'permission-denied' ? 'fallback' : 'error'); setLocationMessage(messages[code] || '현재 위치를 가져오지 못해 해운대 기준으로 표시합니다.');
    }
  }, []);

  useEffect(() => { findLocation(); }, [findLocation]);
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);

  const nearbyBeaches = useMemo(() => BEACHES.map((beach) => ({ ...beach, distanceKm: haversineKm(location, beach) })).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 3), [location]);
  const nearest = nearbyBeaches[0];
  const status = STATUS_STYLE[JELLYFISH_STATUS.level];
  const isOpenHours = now.getHours() >= 9 && now.getHours() < 18;
  const inSeason = now.getMonth() + 1 >= 7 && now.getMonth() + 1 <= 8;
  const timeText = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true }).format(now);

  return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>BEACH SAFETY</Text><Text style={styles.title}>안 쏘고 뭐海</Text><Text style={styles.brandSubtitle}>오늘 바다는 안전할까요?</Text></View><View style={styles.waveBadge}><Ionicons name="water" size={24} color="#0369A1" /></View></View>
    <NearbyBeachCard nearest={nearest} nearbyBeaches={nearbyBeaches} state={locationState} message={locationMessage} timeText={timeText} isOpenHours={isOpenHours} inSeason={inSeason} onRetry={findLocation} />
    <LiveForecastCard beachName={nearest?.name || '해운대 해수욕장'} now={now} />
    <View style={[styles.riskCard, { backgroundColor: status.background }]}><View style={[styles.iconCircle, { backgroundColor: status.color }]}><Ionicons name={status.icon} size={36} color="#FFF" /></View><View style={styles.riskText}><Text style={styles.beach}>{nearest?.name || '해운대 해수욕장'}</Text><Text style={[styles.level, { color: status.color }]}>해파리 위험도: {JELLYFISH_STATUS.level}</Text><Text style={styles.updated}>오늘 10:30 기준</Text></View></View>
    <View style={styles.infoRow}><Ionicons name="eye-outline" size={20} color="#0369A1" /><Text style={styles.infoText}>{JELLYFISH_STATUS.sightings}</Text></View>
    <Section title="현재 안내" icon="information-circle-outline"><Text style={styles.bodyText}>{JELLYFISH_STATUS.note}</Text></Section>
    <Section title="해파리를 발견했다면" icon="shield-checkmark-outline"><Tip number="1" text="맨손으로 만지거나 죽은 개체를 밟지 마세요." /><Tip number="2" text="천천히 물 밖으로 나와 안전요원에게 위치를 알려주세요." /><Tip number="3" text="쏘임이 의심되면 바닷물로 씻고 즉시 도움을 요청하세요." /></Section>
    <View style={styles.menuGrid}>
      <MenuButton icon="pulse-outline" title="실시간 예보" caption="수온·바람·유속" onPress={() => {}} />
      <MenuButton icon="scan-outline" title="AI 생물 스캐너" caption="사진으로 위험 판별" onPress={() => navigation?.navigate('Scanner')} />
      <MenuButton icon="book-outline" title="해양 도감" caption="생물 정보 찾아보기" onPress={() => navigation?.navigate('Dictionary')} />
      <MenuButton icon="medkit-outline" title="응급 대처 가이드" caption="쏘임·접촉 시 행동" onPress={() => navigation?.navigate('Emergency')} />
    </View>
    <TouchableOpacity style={styles.cameraButton} onPress={() => navigation?.navigate('Dictionary')}><Ionicons name="camera" size={25} color="#FFF" /><View><Text style={styles.cameraButtonTitle}>사진으로 생물 찾기</Text><Text style={styles.cameraButtonCaption}>AI 도감 분석을 시작해 보세요</Text></View><Ionicons name="chevron-forward" size={22} color="#FFF" style={styles.chevron} /></TouchableOpacity>
  </ScrollView></SafeAreaView>;
}

function NearbyBeachCard({ nearest, nearbyBeaches, state, message, timeText, isOpenHours, inSeason, onRetry }) {
  if (state === 'loading') return <View style={[styles.nearbyCard, styles.cardShadow, styles.loadingCard]}><ActivityIndicator color="#0284C7" /><Text style={styles.loadingText}>가까운 해수욕장을 찾고 있어요...</Text></View>;
  return <View style={[styles.nearbyCard, styles.cardShadow]}><View style={styles.nearbyTop}><View><Text style={styles.cardCaption}>가장 가까운 해수욕장</Text><Text style={styles.nearbyName}>{nearest?.name || '해운대 해수욕장'}</Text><Text style={styles.distance}>{nearest?.distanceKm.toFixed(1) || '0.0'} km · {nearest?.region || '부산'}</Text></View><Ionicons name="location" size={30} color="#0284C7" /></View><View style={styles.statusRow}><Badge icon={isOpenHours ? 'sunny-outline' : 'moon-outline'} text={isOpenHours ? '개장 중' : '폐장/야간'} active={isOpenHours} /><Badge icon="calendar-outline" text={inSeason ? '정식 개장' : '비시즌'} active={inSeason} /></View><Text style={styles.timeText}>현재 시각 {timeText}</Text>{state !== 'ready' && <View style={styles.locationNotice}><Text style={styles.locationNoticeText}>{message}</Text><TouchableOpacity onPress={onRetry}><Text style={styles.retryText}>다시 시도</Text></TouchableOpacity></View>}{nearbyBeaches.length > 1 && <Text style={styles.nearbyList}>주변: {nearbyBeaches.slice(1).map((beach) => `${beach.name} ${beach.distanceKm.toFixed(1)}km`).join(' · ')}</Text>}</View>;
}
function Badge({ icon, text, active }) { return <View style={[styles.badge, active ? styles.activeBadge : styles.inactiveBadge]}><Ionicons name={icon} size={14} color={active ? '#047857' : '#64748B'} /><Text style={[styles.badgeText, { color: active ? '#047857' : '#64748B' }]}>{text}</Text></View>; }
function Section({ title, icon, children }) { return <View style={[styles.section, styles.cardShadow]}><View style={styles.sectionTitleRow}><Ionicons name={icon} size={21} color="#0369A1" /><Text style={styles.sectionTitle}>{title}</Text></View>{children}</View>; }
function Tip({ number, text }) { return <View style={styles.tipRow}><View style={styles.number}><Text style={styles.numberText}>{number}</Text></View><Text style={styles.tipText}>{text}</Text></View>; }
function MenuButton({ icon, title, caption, onPress }) { return <TouchableOpacity style={[styles.menuButton, styles.cardShadow]} onPress={onPress}><Ionicons name={icon} size={22} color="#0369A1" /><Text style={styles.menuTitle}>{title}</Text><Text style={styles.menuCaption}>{caption}</Text></TouchableOpacity>; }
function LiveForecastCard({ beachName, now }) { const hour = now.getHours(); const waterTemp = 22 + Math.round(Math.sin((hour / 24) * Math.PI) * 2); const wind = 2.5 + ((hour * 3) % 11) / 2; const current = 0.2 + ((hour * 7) % 7) / 10; const score = (waterTemp >= 25 ? 1 : 0) + (wind >= 6 ? 1 : 0) + (current >= 0.65 ? 1 : 0); const levels = [{ label: '안전', color: '#15803D', background: '#DCFCE7' }, { label: '관심', color: '#B45309', background: '#FEF3C7' }, { label: '주의', color: '#C2410C', background: '#FFEDD5' }, { label: '경보', color: '#B91C1C', background: '#FEE2E2' }]; const level = levels[score]; return <View style={[styles.forecastCard, styles.cardShadow]}><View style={styles.forecastHead}><View><Text style={styles.cardCaption}>실시간 해파리 위험도 예보</Text><Text style={styles.forecastBeach}>{beachName}</Text></View><View style={[styles.forecastLevel, { backgroundColor: level.background }]}><Text style={[styles.forecastLevelText, { color: level.color }]}>{level.label}</Text></View></View><View style={styles.forecastMetrics}><Metric icon="thermometer-outline" label="수온" value={`${waterTemp}°C`} /><Metric icon="navigate-outline" label="흐름" value={`${current.toFixed(1)} m/s`} /><Metric icon="flag-outline" label="바람" value={`${wind.toFixed(1)} m/s`} /></View><Text style={styles.forecastNote}>수온·바닷물 흐름·바람을 조합한 모의 예보입니다. 추후 관측 API로 교체할 수 있습니다.</Text></View>; }
function Metric({ icon, label, value }) { return <View style={styles.metric}><Ionicons name={icon} size={18} color="#0369A1" /><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>; }
function haversineKm(from, to) { const rad = (d) => d * Math.PI / 180; const earth = 6371; const dLat = rad(to.latitude - from.latitude); const dLng = rad(to.longitude - from.longitude); const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(dLng / 2) ** 2; return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }

const shadow = Platform.OS === 'web' ? { boxShadow: '0 5px 18px rgba(15,23,42,0.10)' } : { shadowColor: '#0F172A', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 };
const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: '#F0F9FF', ...(Platform.OS === 'web' && { minHeight: '100vh' }) }, container: { padding: 20, paddingBottom: 36, flexGrow: 1, width: '100%', maxWidth: 680, alignSelf: 'center' }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }, eyebrow: { color: '#0284C7', fontSize: 12, fontWeight: '700', letterSpacing: 1 }, title: { color: '#0C4A6E', fontSize: 28, fontWeight: '800', marginTop: 4 }, brandSubtitle: { color: '#64748B', fontSize: 14, marginTop: 3 }, waveBadge: { backgroundColor: '#E0F2FE', padding: 11, borderRadius: 16 }, cardShadow: shadow, nearbyCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 18 }, loadingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 120 }, loadingText: { color: '#0369A1', marginLeft: 10, fontWeight: '600' }, nearbyTop: { flexDirection: 'row', justifyContent: 'space-between' }, cardCaption: { color: '#0284C7', fontSize: 12, fontWeight: '800' }, nearbyName: { color: '#0F172A', fontSize: 21, fontWeight: '800', marginTop: 4 }, distance: { color: '#475569', marginTop: 4 }, statusRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }, badge: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 5 }, activeBadge: { backgroundColor: '#DCFCE7' }, inactiveBadge: { backgroundColor: '#F1F5F9' }, badgeText: { fontSize: 12, fontWeight: '700', marginLeft: 4 }, timeText: { color: '#64748B', fontSize: 13, marginTop: 11 }, locationNotice: { backgroundColor: '#FFF7ED', borderRadius: 10, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 8 }, locationNoticeText: { color: '#9A3412', flex: 1, fontSize: 12, lineHeight: 18 }, retryText: { color: '#C2410C', fontWeight: '800', fontSize: 12 }, nearbyList: { color: '#64748B', fontSize: 12, marginTop: 12, lineHeight: 18 }, forecastCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 18 }, forecastHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, forecastBeach: { color: '#0F172A', fontWeight: '800', fontSize: 17, marginTop: 4 }, forecastLevel: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 }, forecastLevelText: { fontWeight: '800' }, forecastMetrics: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 17 }, metric: { flex: 1, alignItems: 'center' }, metricLabel: { color: '#64748B', fontSize: 12, marginTop: 5 }, metricValue: { color: '#0F172A', fontSize: 13, fontWeight: '800', marginTop: 3 }, forecastNote: { color: '#64748B', fontSize: 11, lineHeight: 16, marginTop: 16 }, riskCard: { borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center' }, iconCircle: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center' }, riskText: { marginLeft: 16, flex: 1 }, beach: { color: '#334155', fontSize: 15, fontWeight: '600' }, level: { fontSize: 22, fontWeight: '800', marginTop: 3 }, updated: { color: '#64748B', fontSize: 12, marginTop: 5 }, infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingHorizontal: 4 }, infoText: { marginLeft: 7, color: '#475569', fontSize: 14 }, section: { backgroundColor: '#FFF', borderRadius: 18, padding: 18, marginTop: 18 }, sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }, sectionTitle: { marginLeft: 7, color: '#0F172A', fontSize: 17, fontWeight: '700' }, bodyText: { color: '#475569', fontSize: 15, lineHeight: 22 }, tipRow: { flexDirection: 'row', alignItems: 'center', marginTop: 9 }, number: { width: 23, height: 23, borderRadius: 12, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center' }, numberText: { color: '#0369A1', fontSize: 12, fontWeight: '800' }, tipText: { flex: 1, marginLeft: 9, color: '#475569', fontSize: 14, lineHeight: 20 }, menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 }, menuButton: { width: '48%', backgroundColor: '#FFF', borderRadius: 16, padding: 15 }, menuTitle: { color: '#0F172A', fontWeight: '800', fontSize: 14, marginTop: 9 }, menuCaption: { color: '#64748B', fontSize: 11, marginTop: 4 }, cameraButton: { backgroundColor: '#0284C7', borderRadius: 20, marginTop: 22, padding: 18, flexDirection: 'row', alignItems: 'center' }, cameraButtonTitle: { color: '#FFF', fontSize: 17, fontWeight: '800', marginLeft: 12 }, cameraButtonCaption: { color: '#E0F2FE', fontSize: 12, marginLeft: 12, marginTop: 3 }, chevron: { marginLeft: 'auto' } });
