import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import HeaderControls from './HeaderControls';
import { useAppSettings } from './AppSettingsContext';

const VISION_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'openrouter/free',
];

const ANALYSIS_PROMPT = `당신은 한국 연안 해양생물 식별 전문가입니다. 사진 속 해양 생물(동물, 해조류/식물 포함)을 종 단위까지 최대한 구체적으로 식별하세요. 색상, 몸 형태, 무늬, 촉수·가시·지느러미, 촬영 환경을 함께 근거로 판단하세요. 한국 근해의 노무라입깃해파리, 보름달물해파리, 파란고리문어, 쏠배감펭, 성게, 미역·다시마도 후보로 비교하세요. 불확실하면 추측을 단정하지 말고 name에 가장 가까운 한국어 후보 종명을 쓰거나 "판별 불가"를 쓰세요. 모든 텍스트 값은 자연스러운 한국어로 작성하고 scientificName만 라틴어로 작성하세요. 응답은 설명이나 마크다운 없이 아래 JSON 객체만 반환하세요.
{"name":"생물 이름","scientificName":"학명 또는 빈 문자열","category":"해파리|어류|산호/말미잘|불가사리/성게|갑각류|연체동물|해조류|기타","dangerLevel":"안전|관심|주의|경계|경보","description":"외형과 위험성 설명","actionGuide":"발견 또는 접촉 시 대처 요령"}`;

function extractJsonObject(value) {
  const text = Array.isArray(value)
    ? value.map((part) => (typeof part === 'string' ? part : part?.text || '')).join('')
    : String(value || '');
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI 응답에서 JSON 결과를 찾지 못했습니다.');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeResult(parsed) {
  const dangerLevels = ['안전', '관심', '주의', '경계', '경보'];
  const categories = ['해파리', '어류', '산호/말미잘', '불가사리/성게', '갑각류', '연체동물', '해조류', '기타'];
  const categoryAliases = { jellyfish: '해파리', fish: '어류', coral: '산호/말미잘', anemone: '산호/말미잘', starfish: '불가사리/성게', urchin: '불가사리/성게', crustacean: '갑각류', mollusk: '연체동물', seaweed: '해조류', algae: '해조류', other: '기타' };
  const dangerAliases = { safe: '안전', low: '관심', caution: '주의', warning: '경계', severe: '경보', dangerous: '경보' };
  const koreanOrFallback = (value, fallback) => /[가-힣]/.test(String(value || '')) ? String(value).trim() : fallback;
  const rawCategory = String(parsed?.category || '').trim();
  const rawDanger = String(parsed?.dangerLevel || '').trim();
  return {
    name: koreanOrFallback(parsed?.name, '판별 불가'),
    scientificName: String(parsed?.scientificName || '').trim(),
    category: categories.includes(rawCategory) ? rawCategory : (categoryAliases[rawCategory.toLowerCase()] || '기타'),
    dangerLevel: dangerLevels.includes(rawDanger) ? rawDanger : (dangerAliases[rawDanger.toLowerCase()] || '주의'),
    description: koreanOrFallback(parsed?.description, '사진만으로는 정확한 특징을 충분히 확인하지 못했습니다. 맨손 접촉은 피하세요.'),
    actionGuide: koreanOrFallback(parsed?.actionGuide, '맨손 접촉을 피하고, 안전거리를 유지한 뒤 현장 안내를 따르세요.'),
  };
}

// Free vision providers can leave a request pending indefinitely. Abort it so
// the UI always leaves its loading state and can try the next fallback model.
async function fetchWithTimeout(url, options, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`요청 시간이 ${timeoutMs / 1000}초를 초과했습니다.`);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function ScannerScreen({ navigation }) {
  const { user, isGuest } = useAuth();
  const { colors, t } = useAppSettings();
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('scanHistory')
      .then((value) => setHistory(JSON.parse(value || '[]')))
      .catch(() => setHistory([]));
  }, []);

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation?.navigate?.('Main');
  };
  const goHome = () => navigation?.navigate?.('Main');

  const pickImage = async (useCamera) => {
    setErrorMessage('');
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('권한이 필요합니다', useCamera ? '카메라 권한을 허용해 주세요.' : '사진 보관함 권한을 허용해 주세요.');
      return;
    }

    const pickerResult = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 });
    if (pickerResult.canceled) return;

    const asset = pickerResult.assets?.[0];
    if (!asset?.base64) {
      Alert.alert('이미지를 읽지 못했습니다', '다른 사진을 선택하거나 다시 촬영해 주세요.');
      return;
    }

    setImageUri(asset.uri);
    setResult(null);
    await analyzeImage(asset.base64, asset.mimeType || 'image/jpeg', asset.uri);
  };

  const analyzeImage = async (rawBase64, mimeType, uri) => {
    const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
    if (!apiKey) {
      const message = 'EXPO_PUBLIC_OPENROUTER_API_KEY가 설정되지 않았습니다. .env를 확인한 뒤 Expo 서버를 재시작해 주세요.';
      setErrorMessage(message);
      Alert.alert('설정 오류', message);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    const cleanBase64 = rawBase64.replace(/^data:[^;]+;base64,/i, '');
    let lastError = null;

    try {
      for (const model of VISION_MODELS) {
        try {
          const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [{
                role: 'user',
                content: [
                  { type: 'text', text: ANALYSIS_PROMPT },
                  { type: 'image_url', image_url: { url: `data:${mimeType};base64,${cleanBase64}` } },
                ],
              }],
              temperature: 0.2,
              max_tokens: 600,
            }),
          });

          if (!response.ok) {
            const details = await response.text();
            console.log('OpenRouter error details:', details);
            throw new Error(`${model}: HTTP ${response.status}`);
          }

          const data = await response.json();
          const parsed = normalizeResult(extractJsonObject(data?.choices?.[0]?.message?.content));
          if (!parsed.name || parsed.name === '판별 불가') throw new Error(`${model}: 종을 식별하지 못했습니다.`);

          setResult(parsed);
          // 로그인 사용자의 식별 결과는 개인 해양 도감 컬렉션에 자동 저장합니다.
          if (!isGuest && user) {
            const collectionKey = `marineCollection_${user.email || user.nickname || 'member'}`;
            const saved = JSON.parse((await AsyncStorage.getItem(collectionKey)) || '[]');
            const entry = { id: String(Date.now()), ...parsed, imageUri: uri, collectedAt: new Date().toISOString() };
            await AsyncStorage.setItem(collectionKey, JSON.stringify([entry, ...saved.filter((item) => item.name !== entry.name)].slice(0, 100)));
          }
          const item = {
            id: String(Date.now()), imageUri: uri, name: parsed.name,
            dangerLevel: parsed.dangerLevel, category: parsed.category,
          };
          setHistory((previous) => {
            const next = [item, ...previous].slice(0, 10);
            AsyncStorage.setItem('scanHistory', JSON.stringify(next)).catch(() => {});
            return next;
          });
          return;
        } catch (error) {
          lastError = error;
          console.warn('Vision model failed:', model, error);
        }
      }
      throw lastError || new Error('사용 가능한 분석 모델이 없습니다.');
    } catch (error) {
      const message = 'AI 분석 결과를 표시하지 못했습니다. 네트워크와 API 키를 확인한 뒤 다시 시도해 주세요.';
      setErrorMessage(message);
      Alert.alert('분석 실패', message);
      console.warn('Image analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const hazardous = result && ['주의', '경계', '경보'].includes(result.dangerLevel);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.navRow}><TouchableOpacity style={styles.backButton} onPress={goBack} accessibilityLabel="뒤로가기"><Ionicons name="chevron-back" size={20} color="#075985" /><Text style={styles.backText}>뒤로가기</Text></TouchableOpacity><View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><HeaderControls /><TouchableOpacity style={styles.homeButton} onPress={goHome} accessibilityLabel="맨 처음 화면으로"><Ionicons name="home-outline" size={17} color="#075985" /><Text style={styles.homeText}>홈</Text></TouchableOpacity></View></View>

        <Text style={[styles.title, { color: colors.text }]}>{t('scanner')}</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>{t('scannerHint')}</Text>

        {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : <View style={styles.placeholder}><Ionicons name="scan-outline" size={54} color="#00B4D8" /></View>}
        <View style={styles.actions}>
          <ActionButton icon="camera-outline" text={t('camera')} onPress={() => pickImage(true)} />
          <ActionButton icon="images-outline" text={t('gallery')} onPress={() => pickImage(false)} />
        </View>

        {loading && <View style={[styles.skeleton, { backgroundColor: colors.surface }]}><ActivityIndicator color={colors.accent} /><View style={styles.skeletonWide} /><View style={styles.skeletonLine} /><View style={styles.skeletonShort} /><Text style={[styles.loadingText, { color: colors.icon }]}>{t('analyzing')}</Text></View>}
        {!!errorMessage && <View style={styles.errorCard}><Ionicons name="alert-circle-outline" size={20} color="#B91C1C" /><Text style={styles.errorText}>{errorMessage}</Text></View>}

        {result && <View style={[styles.resultCard, hazardous && styles.warningCard]}>
          <View style={styles.resultHeader}><View style={{ flex: 1 }}><Text style={styles.name}>{result.name}</Text>{result.scientificName ? <Text style={styles.scientific}>{result.scientificName}</Text> : null}</View><View style={[styles.badge, hazardous ? styles.dangerBadge : styles.safeBadge]}><Text style={hazardous ? styles.dangerBadgeText : styles.safeBadgeText}>{result.dangerLevel}</Text></View></View>
          <Text style={styles.category}>{result.category}</Text>
          <Text style={styles.sectionTitle}>특징 및 위험성</Text><Text style={styles.body}>{result.description}</Text>
          <Text style={styles.sectionTitle}>발견·접촉 시 대처</Text><Text style={styles.body}>{result.actionGuide}</Text>
          {hazardous && <TouchableOpacity style={styles.emergencyButton} onPress={() => navigation?.navigate?.('Emergency')}><Ionicons name="medkit-outline" size={19} color="#FFF" /><Text style={styles.emergencyText}>응급 대처 가이드 보기</Text></TouchableOpacity>}
        </View>}

        <Text style={[styles.historyTitle, { color: colors.text }]}>{t('recentScans')}</Text>
        {history.length === 0 ? <Text style={[styles.empty, { color: colors.muted, backgroundColor: colors.surface }]}>{t('noScans')}</Text> : history.map((item) => <View style={[styles.historyItem, { backgroundColor: colors.surface }]} key={item.id}>{item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.thumb} /> : <Ionicons name="image-outline" size={32} color={colors.accent} />}<View><Text style={[styles.historyName, { color: colors.text }]}>{item.name}</Text><Text style={[styles.historyMeta, { color: colors.muted }]}>{item.category || '기타'} · {item.dangerLevel}</Text></View></View>)}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({ icon, text, onPress }) { return <TouchableOpacity style={styles.actionButton} onPress={onPress}><Ionicons name={icon} size={21} color="#075985" /><Text style={styles.actionText}>{text}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0FAFC' }, container: { padding: 20, paddingBottom: 42, maxWidth: 680, width: '100%', alignSelf: 'center' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, backButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingRight: 10 }, backText: { color: '#075985', fontWeight: '800', marginLeft: 2 }, homeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2FE', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 13 }, homeText: { color: '#075985', fontWeight: '800', marginLeft: 4, fontSize: 12 },
  title: { fontSize: 26, fontWeight: '900', color: '#0A192F', marginTop: 8 }, subtitle: { color: '#607D8B', marginTop: 7, lineHeight: 20 },
  placeholder: { height: 240, borderRadius: 22, backgroundColor: '#E0F2FE', marginTop: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: '#7DD3FC' }, image: { height: 240, borderRadius: 22, marginTop: 22, backgroundColor: '#E0F2FE' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 14 }, actionButton: { flex: 1, padding: 15, borderRadius: 15, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', ...(Platform.OS === 'web' ? { boxShadow: '0 3px 12px rgba(10,25,47,0.08)' } : { elevation: 2 }) }, actionText: { color: '#075985', fontWeight: '800', marginLeft: 7 },
  skeleton: { backgroundColor: '#FFF', borderRadius: 18, padding: 18, marginTop: 18, alignItems: 'stretch' }, skeletonWide: { height: 18, width: '75%', marginTop: 16, backgroundColor: '#D9EEF3', borderRadius: 8 }, skeletonLine: { height: 13, width: '100%', marginTop: 13, backgroundColor: '#EAF5F7', borderRadius: 8 }, skeletonShort: { height: 13, width: '56%', marginTop: 9, backgroundColor: '#EAF5F7', borderRadius: 8 }, loadingText: { color: '#075985', fontWeight: '800', textAlign: 'center', marginTop: 14 },
  errorCard: { flexDirection: 'row', gap: 8, backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 16 }, errorText: { color: '#991B1B', flex: 1, lineHeight: 19, fontSize: 13 },
  resultCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginTop: 18, ...(Platform.OS === 'web' ? { boxShadow: '0 4px 16px rgba(10,25,47,0.08)' } : { elevation: 2 }) }, warningCard: { borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FFF8F8' }, resultHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, name: { color: '#0A192F', fontWeight: '900', fontSize: 22 }, scientific: { color: '#64748B', fontStyle: 'italic', marginTop: 4 }, badge: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 13 }, safeBadge: { backgroundColor: '#DCFCE7' }, dangerBadge: { backgroundColor: '#FEE2E2' }, safeBadgeText: { color: '#15803D', fontWeight: '900' }, dangerBadgeText: { color: '#B91C1C', fontWeight: '900' }, category: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: '#E0F2FE', color: '#075985', fontWeight: '800', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, overflow: 'hidden', fontSize: 12 }, sectionTitle: { color: '#0A192F', fontWeight: '900', marginTop: 17 }, body: { color: '#475569', lineHeight: 21, marginTop: 6 }, emergencyButton: { backgroundColor: '#DC2626', padding: 13, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', marginTop: 18 }, emergencyText: { color: '#FFF', fontWeight: '900', marginLeft: 7 },
  historyTitle: { color: '#0A192F', fontSize: 18, fontWeight: '900', marginTop: 28, marginBottom: 8 }, empty: { color: '#64748B', backgroundColor: '#FFF', borderRadius: 14, padding: 15 }, historyItem: { backgroundColor: '#FFF', borderRadius: 14, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 8 }, thumb: { width: 48, height: 48, borderRadius: 9, backgroundColor: '#E0F2FE' }, historyName: { color: '#0A192F', fontWeight: '800' }, historyMeta: { color: '#607D8B', marginTop: 4, fontSize: 12 },
});
