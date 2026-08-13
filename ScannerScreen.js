import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import { useAppSettings } from './AppSettingsContext';
import HeaderControls from './HeaderControls';

const VISION_MODELS = ['google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free', 'openrouter/free'];
const PROMPT = `Identify the marine organism in this photo as specifically as visible evidence permits. Consider Korean coastal jellyfish, fish, crustaceans, mollusks, echinoderms, anemones, and seaweed. Return only valid JSON, without markdown. All fields except scientificName MUST be natural Korean. {"name":"Korean common name or 판별 불가","scientificName":"Latin name or empty string","category":"해파리|어류|산호/말미잘|불가사리/성게|갑각류|연체동물|해조류|기타","dangerLevel":"안전|관심|주의|경계|경보","description":"Korean description","actionGuide":"Korean safety guide"}`;
const categories = ['해파리', '어류', '산호/말미잘', '불가사리/성게', '갑각류', '연체동물', '해조류', '기타'];
const dangers = ['안전', '관심', '주의', '경계', '경보'];
const categoryAliases = { jellyfish: '해파리', fish: '어류', coral: '산호/말미잘', anemone: '산호/말미잘', starfish: '불가사리/성게', urchin: '불가사리/성게', crustacean: '갑각류', mollusk: '연체동물', seaweed: '해조류', algae: '해조류', other: '기타' };
const dangerAliases = { safe: '안전', low: '관심', caution: '주의', warning: '경계', severe: '경보', dangerous: '경보' };

function parseResult(content) {
  const text = String(Array.isArray(content) ? content.map((part) => part?.text || part || '').join('') : content || '').replace(/```json|```/gi, '').trim();
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI_JSON_MISSING');
  const raw = JSON.parse(text.slice(start, end + 1));
  const ko = (value, fallback) => /[가-힣]/.test(String(value || '')) ? String(value).trim() : fallback;
  const rawCategory = String(raw.category || '').trim(); const rawDanger = String(raw.dangerLevel || '').trim();
  return { name: ko(raw.name, '판별 불가'), scientificName: String(raw.scientificName || '').trim(), category: categories.includes(rawCategory) ? rawCategory : (categoryAliases[rawCategory.toLowerCase()] || '기타'), dangerLevel: dangers.includes(rawDanger) ? rawDanger : (dangerAliases[rawDanger.toLowerCase()] || '주의'), description: ko(raw.description, '사진만으로는 정확한 특징을 충분히 확인하지 못했습니다. 직접 접촉하지 마세요.'), actionGuide: ko(raw.actionGuide, '만지지 말고 안전거리를 유지한 뒤 현장 안내를 따라 주세요.') };
}
async function fetchWithTimeout(url, options, timeoutMs = 15000) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs); try { return await fetch(url, { ...options, signal: controller.signal }); } finally { clearTimeout(timer); } }

export default function ScannerScreen({ navigation }) {
  const { user, isGuest } = useAuth(); const { colors, t } = useAppSettings();
  const [image, setImage] = useState(null); const [loading, setLoading] = useState(false); const [result, setResult] = useState(null); const [history, setHistory] = useState([]); const [error, setError] = useState('');
  useEffect(() => { AsyncStorage.getItem('scanHistory').then((value) => setHistory(JSON.parse(value || '[]'))).catch(() => setHistory([])); }, []);
  const persistHistory = (next) => { setHistory(next); AsyncStorage.setItem('scanHistory', JSON.stringify(next)).catch(() => {}); };
  const clearImage = () => { if (!loading) { setImage(null); setResult(null); setError(''); } };
  const goHome = () => navigation?.navigate?.('Main'); const goBack = () => navigation?.canGoBack?.() ? navigation.goBack() : goHome();
  const pickImage = async (camera) => {
    setError(''); const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert(t('scanner.permissionTitle'), camera ? t('scanner.cameraPermission') : t('scanner.galleryPermission'));
    const response = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 });
    if (response.canceled) return; const asset = response.assets?.[0];
    if (!asset?.base64) return Alert.alert(t('scanner.imageErrorTitle'), t('scanner.imageError'));
    setImage(asset); setResult(null); await analyze(asset);
  };
  const analyze = async (asset) => {
    const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
    if (!apiKey) { setError(t('scanner.configError')); return; }
    setLoading(true); setError(''); let lastError;
    try {
      for (const model of VISION_MODELS) {
        try {
          const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT }, { type: 'image_url', image_url: { url: `data:${asset.mimeType || 'image/jpeg'};base64,${String(asset.base64).replace(/^data:[^;]+;base64,/i, '')}` } }] }], temperature: 0.15, max_tokens: 600 }) });
          if (!response.ok) { const detail = await response.text(); console.log('OpenRouter error details:', detail); throw new Error(`HTTP_${response.status}`); }
          const parsed = parseResult((await response.json())?.choices?.[0]?.message?.content); setResult(parsed);
          const historyItem = { id: String(Date.now()), imageUri: asset.uri, ...parsed, createdAt: new Date().toISOString() };
          persistHistory([historyItem, ...history].slice(0, 10));
          if (!isGuest && user) { const key = `marineCollection_${user.userId || user.nickname}`; const saved = JSON.parse((await AsyncStorage.getItem(key)) || '[]'); await AsyncStorage.setItem(key, JSON.stringify([historyItem, ...saved.filter((item) => item.name !== historyItem.name)].slice(0, 100))); }
          return;
        } catch (modelError) { lastError = modelError; console.warn('Vision model failed:', model, modelError); }
      } throw lastError || new Error('VISION_UNAVAILABLE');
    } catch (analysisError) { console.warn('Image analysis failed:', analysisError); setError(t('scanner.analysisFailed')); }
    finally { setLoading(false); }
  };
  const hazardous = result && ['주의', '경계', '경보'].includes(result.dangerLevel);
  return <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
    <View style={s.nav}><TouchableOpacity style={s.back} onPress={goBack}><Ionicons name="chevron-back" size={20} color={colors.accentStrong} /><Text style={[s.backText, { color: colors.accentStrong }]}>{t('common.back')}</Text></TouchableOpacity><View style={s.navRight}><HeaderControls /><TouchableOpacity style={[s.home, { backgroundColor: colors.soft }]} onPress={goHome}><Ionicons name="home-outline" size={17} color={colors.accentStrong} /><Text style={[s.homeText, { color: colors.accentStrong }]}>{t('common.home')}</Text></TouchableOpacity></View></View>
    <Text style={[s.title, { color: colors.text }]}>{t('tabs.scanner')}</Text><Text style={[s.subtitle, { color: colors.muted }]}>{t('scanner.hint')}</Text>
    {image ? <View style={s.preview}><Image source={{ uri: image.uri }} style={s.image} /><TouchableOpacity style={[s.remove, { backgroundColor: colors.surfaceRaised }]} disabled={loading} onPress={clearImage} accessibilityLabel={t('common.removePhoto')}><Ionicons name="close-circle" size={34} color={colors.danger} /></TouchableOpacity></View> : <><View style={[s.placeholder, { backgroundColor: colors.soft, borderColor: colors.accent }]}><Ionicons name="scan-outline" size={54} color={colors.accent} /></View><View style={s.actions}><Action icon="camera-outline" label={t('common.camera')} onPress={() => pickImage(true)} colors={colors} /><Action icon="images-outline" label={t('common.gallery')} onPress={() => pickImage(false)} colors={colors} /></View></>}
    {loading && <View style={[s.loading, { backgroundColor: colors.surface }]}><ActivityIndicator color={colors.accent} /><Text style={[s.loadingText, { color: colors.accentStrong }]}>{t('scanner.analyzing')}</Text></View>}
    {!!error && <TouchableOpacity style={[s.error, { backgroundColor: colors.dangerSoft }]} onPress={() => image && analyze(image)}><Ionicons name="refresh-outline" size={19} color={colors.danger} /><Text style={[s.errorText, { color: colors.dangerText }]}>{error}</Text></TouchableOpacity>}
    {result && <View style={[s.result, { backgroundColor: hazardous ? colors.dangerSoft : colors.surface, borderColor: hazardous ? colors.danger : colors.border }]}><View style={s.resultHead}><View style={{ flex: 1 }}><Text style={[s.name, { color: colors.text }]}>{result.name}</Text>{!!result.scientificName && <Text style={[s.scientific, { color: colors.muted }]}>{result.scientificName}</Text>}</View><Text style={[s.badge, { color: hazardous ? colors.dangerText : colors.success, backgroundColor: hazardous ? colors.dangerSoft : colors.successSoft }]}>{result.dangerLevel}</Text></View><Text style={[s.category, { color: colors.accentStrong, backgroundColor: colors.soft }]}>{result.category}</Text><Section title={t('scanner.featuresRisk')} text={result.description} colors={colors} /><Section title={t('scanner.actionGuide')} text={result.actionGuide} colors={colors} />{hazardous && <TouchableOpacity style={[s.emergency, { backgroundColor: colors.danger }]} onPress={() => navigation.navigate('Emergency')}><Ionicons name="medkit-outline" size={19} color={colors.onAccent} /><Text style={[s.emergencyText, { color: colors.onAccent }]}>{t('scanner.emergencyGuide')}</Text></TouchableOpacity>}</View>}
    <View style={s.historyHead}><Text style={[s.historyTitle, { color: colors.text }]}>{t('scanner.recent')}</Text>{history.length > 0 && <TouchableOpacity onPress={() => persistHistory([])}><Text style={[s.clearHistory, { color: colors.accentStrong }]}>{t('common.clearHistory')}</Text></TouchableOpacity>}</View>{history.length === 0 ? <Text style={[s.empty, { color: colors.muted, backgroundColor: colors.surface }]}>{t('scanner.empty')}</Text> : history.map((item) => <TouchableOpacity key={item.id} style={[s.historyItem, { backgroundColor: colors.surface }]} onPress={() => { setResult(item); setImage({ uri: item.imageUri }); }}><Image source={{ uri: item.imageUri }} style={s.thumb} /><View style={{ flex: 1 }}><Text style={[s.historyName, { color: colors.text }]}>{item.name}</Text><Text style={[s.historyMeta, { color: colors.muted }]}>{item.category} · {item.dangerLevel}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted} /></TouchableOpacity>)}
  </ScrollView></SafeAreaView>;
}
function Action({ icon, label, onPress, colors }) { return <TouchableOpacity style={[s.action, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onPress}><Ionicons name={icon} size={21} color={colors.accentStrong} /><Text style={[s.actionText, { color: colors.accentStrong }]}>{label}</Text></TouchableOpacity>; }
function Section({ title, text, colors }) { return <View style={s.section}><Text style={[s.sectionTitle, { color: colors.text }]}>{title}</Text><Text style={[s.body, { color: colors.muted }]}>{text}</Text></View>; }
const s = StyleSheet.create({ safe: { flex: 1 }, container: { padding: 20, paddingBottom: 42 }, nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, navRight: { flexDirection: 'row', gap: 7, alignItems: 'center' }, back: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 }, backText: { fontWeight: '800' }, home: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 13 }, homeText: { marginLeft: 4, fontSize: 12, fontWeight: '800' }, title: { fontSize: 26, fontWeight: '900', marginTop: 8 }, subtitle: { marginTop: 7, lineHeight: 20 }, placeholder: { height: 240, borderRadius: 22, marginTop: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderStyle: 'dashed' }, preview: { position: 'relative', marginTop: 22 }, image: { height: 240, borderRadius: 22 }, remove: { position: 'absolute', top: 10, right: 10, zIndex: 10, borderRadius: 18 }, actions: { flexDirection: 'row', gap: 12, marginTop: 14 }, action: { flex: 1, padding: 15, borderRadius: 15, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }, actionText: { fontWeight: '800', marginLeft: 7 }, loading: { borderRadius: 18, padding: 18, marginTop: 18, alignItems: 'center' }, loadingText: { fontWeight: '800', marginTop: 12 }, error: { flexDirection: 'row', gap: 8, padding: 13, borderRadius: 14, marginTop: 16 }, errorText: { flex: 1, lineHeight: 19, fontSize: 13 }, result: { borderWidth: 1, borderRadius: 20, padding: 18, marginTop: 18 }, resultHead: { flexDirection: 'row', gap: 10 }, name: { fontSize: 22, fontWeight: '900' }, scientific: { fontStyle: 'italic', marginTop: 4 }, badge: { fontWeight: '900', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 13, overflow: 'hidden' }, category: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, fontSize: 12, fontWeight: '800', marginTop: 10 }, section: { marginTop: 17 }, sectionTitle: { fontWeight: '900' }, body: { lineHeight: 21, marginTop: 6 }, emergency: { padding: 13, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', marginTop: 18 }, emergencyText: { fontWeight: '900', marginLeft: 7 }, historyHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 8 }, historyTitle: { fontSize: 18, fontWeight: '900' }, clearHistory: { fontSize: 12, fontWeight: '800' }, empty: { borderRadius: 14, padding: 15 }, historyItem: { borderRadius: 14, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 8 }, thumb: { width: 48, height: 48, borderRadius: 9 }, historyName: { fontWeight: '800' }, historyMeta: { marginTop: 4, fontSize: 12 } });
