import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import marineData from './assets/marineData.json';
import HeaderControls from './HeaderControls';
import { useAppSettings } from './AppSettingsContext';

const CATEGORIES = ['전체', '해파리', '어류', '산호/말미잘', '불가사리/성게', '갑각류', '연체동물', '해조류', '기타'];
const MODELS = ['google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free', 'openrouter/free'];
const META = [
  ['노무라입깃해파리','해파리','경계'], ['보름달물해파리','해파리','주의'], ['파란고리문어','연체동물','심각'], ['쏠배감펭','어류','경계'], ['복섬','어류','심각'], ['말미잘','산호/말미잘','주의'], ['보라성게','불가사리/성게','주의'], ['불가사리','불가사리/성게','안전'], ['꽃게','갑각류','주의'], ['갯가재','갑각류','주의'], ['참문어','연체동물','주의'], ['소라','연체동물','주의'], ['홍합','연체동물','주의'], ['미역','해조류','안전'], ['다시마','해조류','안전'], ['파래','해조류','주의'], ['톳','해조류','주의'], ['해삼','기타','안전'], ['갯지렁이','기타','주의'], ['해파리치어','해파리','주의'],
];
const PROMPT = '당신은 한국 연안 해양생물 식별 전문가입니다. 사진의 색상, 형태, 무늬, 촉수·가시·지느러미와 촬영 환경을 근거로 해양 생물을 종 단위까지 식별하세요. 노무라입깃해파리, 보름달물해파리, 파란고리문어, 쏠배감펭, 성게, 미역·다시마 등 한국 근해 종도 비교하세요. 확신이 없으면 가장 가까운 한국어 후보명 또는 "판별 불가"를 쓰세요. scientificName을 제외한 모든 값은 자연스러운 한국어로 작성하세요. 설명이나 마크다운 없이 JSON만 반환하세요: {"name":"생물 이름 또는 판별 불가","scientificName":"학명 또는 빈 문자열","category":"해파리|어류|산호/말미잘|불가사리/성게|갑각류|연체동물|해조류|기타","dangerLevel":"안전|관심|주의|경계|경보","description":"특징과 위험성","actionGuide":"발견 또는 접촉 시 대처"}';

const DATABASE = marineData.map((raw, index) => {
  const [name, category, dangerLevel] = META[index] || ['미확인 해양 생물', '기타', '주의'];
  return {
    ...raw, name, category, dangerLevel,
    description: `${name}의 사진·서식 환경을 함께 확인하세요. 맨손 접촉이나 임의 채집은 피하는 것이 안전합니다.`,
    actionGuide: '정확히 식별되기 전에는 만지지 말고 안전거리를 유지하세요. 쏘임·물림 등 이상 증상이 있으면 의료기관 또는 119에 도움을 요청하세요.',
    aiVisualFeatures: raw.aiVisualFeatures || [], habitatInfo: raw.habitatInfo || {}, distinguishingPoints: raw.distinguishingPoints || '', toxinType: raw.toxinType || '확인 필요',
  };
});

function extractJson(content) {
  const text = (Array.isArray(content) ? content.map((v) => v?.text || v || '').join('') : String(content || ''))
    .replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI 응답에 JSON 결과가 없습니다.');
  return JSON.parse(text.slice(start, end + 1));
}
function findLocal(name, scientificName) { const compact = String(name || '').replace(/\s/g, ''); return DATABASE.find((item) => item.name.replace(/\s/g, '') === compact || (scientificName && item.scientificName?.toLowerCase() === scientificName.toLowerCase())); }
function normalizeAiResult(parsed) { const categoryAliases = { jellyfish: '해파리', fish: '어류', coral: '산호/말미잘', anemone: '산호/말미잘', starfish: '불가사리/성게', urchin: '불가사리/성게', crustacean: '갑각류', mollusk: '연체동물', seaweed: '해조류', algae: '해조류', other: '기타' }; const dangerAliases = { safe: '안전', low: '관심', caution: '주의', warning: '경계', severe: '경보', dangerous: '경보' }; const korean = (value, fallback) => /[가-힣]/.test(String(value || '')) ? String(value).trim() : fallback; const rawCategory = String(parsed?.category || ''); const rawDanger = String(parsed?.dangerLevel || ''); return { name: korean(parsed?.name, '판별 불가'), scientificName: String(parsed?.scientificName || '').trim(), category: CATEGORIES.includes(rawCategory) ? rawCategory : (categoryAliases[rawCategory.toLowerCase()] || '기타'), dangerLevel: ['안전', '관심', '주의', '경계', '경보'].includes(rawDanger) ? rawDanger : (dangerAliases[rawDanger.toLowerCase()] || '주의'), description: korean(parsed?.description, '사진만으로는 정확한 특징을 충분히 확인하지 못했습니다. 맨손 접촉은 피하세요.'), actionGuide: korean(parsed?.actionGuide, '맨손 접촉을 피하고 안전거리를 유지한 뒤 현장 안내를 따르세요.') }; }
async function fetchWithTimeout(url, options, timeoutMs = 15000) { const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), timeoutMs); try { return await fetch(url, { ...options, signal: controller.signal }); } catch (requestError) { if (controller.signal.aborted) throw new Error(`요청 시간이 ${timeoutMs / 1000}초를 초과했습니다.`); throw requestError; } finally { clearTimeout(timeoutId); } }

export default function DictionaryScreen({ navigation }) {
  const { colors } = useAppSettings();
  const [query, setQuery] = useState(''); const [category, setCategory] = useState('전체'); const [selected, setSelected] = useState(null);
  const [imageUri, setImageUri] = useState(null); const [loading, setLoading] = useState(false); const [result, setResult] = useState(null); const [error, setError] = useState('');
  const filtered = useMemo(() => { const word = query.trim().toLowerCase(); return DATABASE.filter((item) => (category === '전체' || item.category === category) && (!word || [item.name, item.scientificName, ...(item.aiVisualFeatures || [])].join(' ').toLowerCase().includes(word))); }, [query, category]);
  const back = () => navigation?.canGoBack?.() ? navigation.goBack() : navigation?.navigate?.('Main');
  const goHome = () => navigation?.navigate?.('Main');

  const pick = async (camera) => {
    setError('');
    const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('권한 필요', camera ? '카메라 권한을 허용해 주세요.' : '사진 보관함 권한을 허용해 주세요.');
    const response = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 });
    if (response.canceled) return;
    const asset = response.assets?.[0];
    if (!asset?.base64) return Alert.alert('이미지 오류', '선택한 이미지 데이터를 읽지 못했습니다.');
    setImageUri(asset.uri); setResult(null); await analyze(asset.base64, asset.mimeType || 'image/jpeg');
  };
  const analyze = async (base64, mimeType) => {
    const key = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
    if (!key) { const message = 'EXPO_PUBLIC_OPENROUTER_API_KEY가 설정되지 않았습니다.'; setError(message); Alert.alert('설정 오류', message); return; }
    setLoading(true); setError(''); let lastError;
    try {
      for (const model of MODELS) {
        try {
          const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model, messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT }, { type: 'image_url', image_url: { url: `data:${mimeType};base64,${String(base64).replace(/^data:[^;]+;base64,/i, '')}` } }] }], temperature: 0.2, max_tokens: 600 }) });
          if (!response.ok) { const details = await response.text(); console.log('OpenRouter error details:', details); throw new Error(`HTTP ${response.status}`); }
          const parsed = extractJson((await response.json())?.choices?.[0]?.message?.content);
          const local = findLocal(parsed.name, parsed.scientificName);
          const normalized = normalizeAiResult(parsed);
          setResult(local ? { ...local, ...normalized, aiVisualFeatures: local.aiVisualFeatures, habitatInfo: local.habitatInfo, distinguishingPoints: local.distinguishingPoints, toxinType: local.toxinType } : normalized);
          return;
        } catch (modelError) { lastError = modelError; console.warn('Dictionary vision model failed:', model, modelError); }
      }
      throw lastError || new Error('분석 모델을 사용할 수 없습니다.');
    } catch (analysisError) { const message = '분석 결과를 표시하지 못했습니다. 네트워크와 API 키를 확인한 뒤 다시 시도해 주세요.'; setError(message); Alert.alert('AI 분석 실패', message); console.warn('Dictionary image analysis failed:', analysisError); } finally { setLoading(false); }
  };

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}><FlatList data={filtered} keyExtractor={(item) => item.id} initialNumToRender={12} maxToRenderPerBatch={12} windowSize={7} removeClippedSubviews={Platform.OS !== 'web'} contentContainerStyle={styles.list}
    renderItem={({ item }) => <TouchableOpacity style={styles.item} onPress={() => setSelected(item)}><View style={styles.itemTop}><Text style={styles.itemName}>{item.name}</Text><Text style={[styles.danger, { color: dangerColor(item.dangerLevel) }]}>{item.dangerLevel}</Text></View><Text style={styles.category}>{item.category} · {item.scientificName}</Text><Text style={styles.description} numberOfLines={2}>{item.description}</Text></TouchableOpacity>}
    ListHeaderComponent={<><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><TouchableOpacity style={styles.back} onPress={back}><Ionicons name="chevron-back" size={20} color="#075985" /><Text style={styles.backText}>뒤로가기</Text></TouchableOpacity><View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><HeaderControls /><TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2FE', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 13 }} onPress={goHome}><Ionicons name="home-outline" size={17} color="#075985" /><Text style={{ color: '#075985', fontWeight: '800', fontSize: 12, marginLeft: 4 }}>홈</Text></TouchableOpacity></View></View><Text style={styles.title}>해양 생물 도감</Text><Text style={styles.subtitle}>이름, 학명, AI 시각 특징으로 검색하세요.</Text><View style={styles.search}><Ionicons name="search-outline" size={20} color="#00B4D8" /><TextInput style={styles.input} value={query} onChangeText={setQuery} placeholder="예: 노무라입깃해파리, 성게, 미역" placeholderTextColor="#78909C" /></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{CATEGORIES.map((value) => <TouchableOpacity key={value} style={[styles.chip, category === value && styles.chipOn]} onPress={() => setCategory(value)}><Text style={styles.chipText}>{value}</Text></TouchableOpacity>)}</ScrollView><Text style={styles.count}>{filtered.length}종</Text></>}
    ListEmptyComponent={<Text style={styles.empty}>검색 결과가 없습니다.</Text>}
    ListFooterComponent={<View style={styles.scanner}><Text style={styles.scannerTitle}>사진으로 AI 도감 찾기</Text>{imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : <View style={styles.imagePlaceholder}><Ionicons name="camera-outline" size={36} color="#00B4D8" /></View>}<View style={styles.actions}><Action icon="camera-outline" text="촬영" onPress={() => pick(true)} /><Action icon="images-outline" text="갤러리" onPress={() => pick(false)} /></View>{loading && <View style={styles.loading}><ActivityIndicator color="#00B4D8" /><Text style={styles.loadingText}>AI가 사진을 분석 중입니다...</Text></View>}{error ? <Text style={styles.error}>{error}</Text> : null}{result ? <TouchableOpacity style={styles.aiCard} onPress={() => setSelected(result)}><Text style={styles.itemName}>{result.name}</Text><Text style={styles.category}>{result.category} · 위험도 {result.dangerLevel}</Text><Text style={styles.description}>{result.description}</Text><Text style={styles.openDetail}>상세 정보 보기</Text></TouchableOpacity> : null}</View>}
  /><DetailModal item={selected} onClose={() => setSelected(null)} /></SafeAreaView>;
}
function Action({ icon, text, onPress }) { return <TouchableOpacity style={styles.action} onPress={onPress}><Ionicons name={icon} size={20} color="#075985" /><Text style={styles.actionText}>{text}</Text></TouchableOpacity>; }
function DetailModal({ item, onClose }) { if (!item) return null; const habitat = item.habitatInfo || {}; return <Modal visible transparent animationType="slide" onRequestClose={onClose}><View style={styles.backdrop}><ScrollView contentContainerStyle={styles.modal}><View style={styles.modalHead}><View><Text style={styles.modalName}>{item.name}</Text><Text style={styles.scientific}>{item.scientificName}</Text></View><TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={30} color="#607D8B" /></TouchableOpacity></View><Text style={styles.tag}>{item.category} · 위험도 {item.dangerLevel}</Text><Section title="설명" value={item.description} /><Section title="발견·접촉 시 대처" value={item.actionGuide} /><Section title="AI 시각 특징" value={(item.aiVisualFeatures || []).join(' · ') || '정보 없음'} /><Section title="유사 생물 구별법" value={item.distinguishingPoints || '정보 없음'} /><Section title="서식 정보" value={`${habitat.season || '정보 없음'} · ${habitat.depth || '정보 없음'} · ${habitat.region || '정보 없음'}`} /><Section title="위험 유형" value={item.toxinType || '확인 필요'} /></ScrollView></View></Modal>; }
function Section({ title, value }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionText}>{value}</Text></View>; }
function dangerColor(level) { return ({ 안전: '#15803D', 관심: '#B45309', 주의: '#B45309', 경계: '#C2410C', 경보: '#B91C1C', 심각: '#B91C1C' })[level] || '#64748B'; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#F0FAFC' }, list: { padding: 20, paddingBottom: 42, maxWidth: 720, width: '100%', alignSelf: 'center' }, back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 7 }, backText: { color: '#075985', fontWeight: '800' }, title: { fontSize: 27, fontWeight: '900', color: '#0A192F', marginTop: 7 }, subtitle: { color: '#607D8B', marginTop: 6 }, search: { height: 50, marginTop: 16, backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center' }, input: { flex: 1, marginLeft: 8, color: '#0A192F' }, chips: { paddingVertical: 13, gap: 8 }, chip: { backgroundColor: '#DDF3F8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15 }, chipOn: { backgroundColor: '#00B4D8' }, chipText: { color: '#0A192F', fontSize: 12, fontWeight: '800' }, count: { color: '#607D8B', fontSize: 12, marginBottom: 2 }, item: { backgroundColor: '#FFF', borderRadius: 16, padding: 15, marginTop: 9, ...(Platform.OS === 'web' ? { boxShadow: '0 2px 10px rgba(10,25,47,0.05)' } : {}) }, itemTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, itemName: { color: '#0A192F', fontWeight: '900', fontSize: 18, flex: 1 }, danger: { fontWeight: '900' }, category: { color: '#607D8B', fontSize: 12, marginTop: 5 }, description: { color: '#475569', lineHeight: 20, marginTop: 8 }, empty: { textAlign: 'center', color: '#607D8B', marginVertical: 26 }, scanner: { marginTop: 30 }, scannerTitle: { color: '#0A192F', fontSize: 20, fontWeight: '900', marginBottom: 11 }, imagePlaceholder: { height: 135, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DDF3F8', borderRadius: 16 }, image: { height: 180, borderRadius: 16 }, actions: { flexDirection: 'row', gap: 10, marginTop: 10 }, action: { flex: 1, backgroundColor: '#FFF', borderRadius: 13, padding: 13, flexDirection: 'row', justifyContent: 'center', gap: 6 }, actionText: { color: '#075985', fontWeight: '800' }, loading: { backgroundColor: '#FFF', padding: 16, marginTop: 10, borderRadius: 14, alignItems: 'center' }, loadingText: { color: '#075985', fontWeight: '700', marginTop: 8 }, error: { color: '#B91C1C', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12, marginTop: 10, lineHeight: 19 }, aiCard: { backgroundColor: '#E8F8FC', padding: 15, borderRadius: 16, marginTop: 12 }, openDetail: { color: '#075985', fontWeight: '900', marginTop: 11 }, backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,25,47,0.58)' }, modal: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 23, maxHeight: '85%' }, modalHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, modalName: { color: '#0A192F', fontSize: 24, fontWeight: '900' }, scientific: { color: '#607D8B', fontStyle: 'italic', marginTop: 3 }, tag: { alignSelf: 'flex-start', backgroundColor: '#DDF3F8', color: '#075985', borderRadius: 13, overflow: 'hidden', padding: 10, marginTop: 15, fontWeight: '800' }, section: { marginTop: 17 }, sectionTitle: { color: '#0A192F', fontWeight: '900' }, sectionText: { color: '#475569', lineHeight: 21, marginTop: 6 } });
