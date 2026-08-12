import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const VISION_MODELS = ['google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free', 'openrouter/free'];
const DANGER_STYLES = { 안전: { backgroundColor: '#DCFCE7', color: '#15803D' }, 주의: { backgroundColor: '#FEF3C7', color: '#B45309' }, 경계: { backgroundColor: '#FFEDD5', color: '#C2410C' }, 심각: { backgroundColor: '#FEE2E2', color: '#B91C1C' } };
const VALID_DANGER = ['안전', '주의', '경계', '심각'];
const VALID_CONFIDENCE = ['높음', '중간', '낮음'];
const VALID_CATEGORIES = ['해파리', '어류', '산호/말미잘', '불가사리/성게', '갑각류', '연체동물', '해조류', '기타'];

const SPECIES_PROMPT = `사진 속 해양 생물(동물, 해조류/식물 포함)을 폭넓게 분석하는 한국 근해 해양 생물 식별 전문가로 행동해라. 절대로 종을 짐작이나 통계적으로 흔하다는 이유만으로 답하지 마라. 특히 "보름달물해파리"는 가장 흔한 기본값으로 잘못 답해지는 경우가 많으니, 실제로 우산(bell) 안에 네잎클로버 모양의 생식소(고리 4개)가 선명히 보이고 촉수가 짧을 때만 그렇게 답하고, 그렇지 않다면 절대 기본값으로 쓰지 마라. 먼저 사진에서 관찰되는 구체적 시각 증거를 스스로 확인해라: 우산(갓) 형태와 가장자리, 색상과 반투명도, 촉수/구완의 길이·두께·개수, 무늬나 반점, 발광 여부, 촉수 끝 형태, 서식 환경(수심·해역 느낌) 등. 이 관찰 결과를 근거로만 카테고리(해파리, 어류, 산호, 말미잘, 불가사리, 성게, 갑각류(게/새우), 연체동물(조개/문어/오징어), 해조류(미역/다시마/파래) 등)를 정하고, 관찰된 특징과 실제로 일치하는 종(species)까지 최대한 구체적으로 식별해라. 관찰한 특징이 후보 종의 알려진 특징과 명확히 일치하지 않으면 절대 확신하지 말고, name에는 가장 근접한 후보를 쓰되 confidence를 반드시 "낮음" 또는 "중간"으로 낮춰라. confidence를 "높음"으로 쓰는 것은 관찰된 특징이 그 종의 전형적 특징과 뚜렷하게 일치할 때만 허용된다. 종 판별이 애매하면 alternativeNames에 관찰된 특징과 부합하는 혼동 가능한 실제 후보를 최대 2개 넣어라(임의로 아무 종이나 채우지 마라). 학명을 모르면 빈 문자열을 써라. dangerLevel은 카테고리에 맞게 해석해라: 해파리·산호/말미잘 등 자포동물은 쏘임·독성 위험, 해조류는 식용 가능 여부와 부패·오염·독성 조류 주의, 조개·어류 등은 가시·독침·손질 시 주의사항을 기준으로 평가하고, description에는 반드시 이 식별의 근거가 된 구체적 시각적 특징을 먼저 서술한 뒤 설명해라. actionGuide는 카테고리에 맞지 않는 응급처치 대신 일반적인 취급·섭취·관찰 주의 요령을 안내해라. 오직 유효한 JSON 객체만 출력하고 마크다운 코드블록은 사용하지 마라. 정확히 다음 키만 사용해라: {"name":"생물이름","scientificName":"학명","category":"해파리"|"어류"|"산호/말미잘"|"불가사리/성게"|"갑각류"|"연체동물"|"해조류"|"기타","confidence":"높음"|"중간"|"낮음","alternativeNames":["후보1","후보2"],"dangerLevel":"안전"|"주의"|"경계"|"심각","description":"관찰된 시각적 특징과 그에 근거한 설명","actionGuide":"대처 요령"}`;

export default function DictionaryScreen({ navigation }) {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const selectImage = async (source) => {
    try {
      const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { Alert.alert('권한이 필요합니다', source === 'camera' ? '카메라 권한을 허용해 주세요.' : '사진 라이브러리 권한을 허용해 주세요.'); return; }
      const options = { mediaTypes: ['images'], allowsEditing: false, quality: 0.7, base64: true };
      const picked = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (picked.canceled) return;
      const asset = picked.assets?.[0];
      if (!asset?.uri || !asset.base64) throw new Error('선택한 이미지 데이터를 읽지 못했습니다. 다른 사진으로 다시 시도해 주세요.');
      setImageUri(asset.uri); setResult(null); setErrorMessage('');
      await analyzeImage(removeDataUrlPrefix(asset.base64), normalizeMimeType(asset.mimeType));
    } catch (error) { const message = error?.message || '사진을 불러오는 중 오류가 발생했습니다.'; setErrorMessage(message); Alert.alert('사진 처리 실패', message); }
  };

  // VISION_MODELS 순차 폴백 및 오류 처리는 유지합니다.
  const analyzeImage = async (cleanBase64String, mimeType) => {
    const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
    if (!apiKey) { const message = '.env 파일의 EXPO_PUBLIC_OPENROUTER_API_KEY가 인식되지 않았습니다. Expo 서버를 재시작해 주세요.'; setErrorMessage(message); Alert.alert('설정 오류', message); setLoading(false); return; }
    setLoading(true); let lastError = null;
    for (const modelName of VISION_MODELS) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: modelName,
            response_format: { type: 'json_object' },
            max_tokens: 800,
            messages: [{ role: 'user', content: [{ type: 'text', text: SPECIES_PROMPT }, { type: 'image_url', image_url: { url: `data:${mimeType};base64,${cleanBase64String}` } }] }],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`[모델 실패: ${modelName}]`, errorText);
          lastError = response.status === 429
            ? new Error('무료 AI 서버가 지금 많이 붐벼요. 잠시 후 다시 시도해 주세요.')
            : new Error(`모델(${modelName}) 응답 오류: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (!text) { lastError = new Error('AI 응답이 비어 있습니다.'); continue; }

        const parsed = extractJsonObject(text);
        if (!parsed.name || parsed.name === '판별 불가') throw new Error('사진에서 해양 생물을 확실하게 찾지 못했습니다. 생물이 크게 보이도록 다시 촬영해 주세요.');
        if (!VALID_DANGER.includes(parsed.dangerLevel) || !parsed.description || !parsed.actionGuide) throw new Error('AI가 올바른 분석 형식으로 응답하지 않았습니다.');

        const confidence = VALID_CONFIDENCE.includes(parsed.confidence) ? parsed.confidence : '중간';
        const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : '기타';
        const alternativeNames = Array.isArray(parsed.alternativeNames) ? parsed.alternativeNames.filter((name) => typeof name === 'string' && name.trim()).slice(0, 2) : [];

        setResult({ ...parsed, scientificName: parsed.scientificName || '', category, confidence, alternativeNames });
        setLoading(false);
        return;
      } catch (error) {
        console.warn(`[예외 발생 - ${modelName}]`, error.message);
        lastError = error;
      }
    }
    const message = lastError?.message || '네트워크 오류가 발생했습니다. 연결 상태를 확인해 주세요.';
    setErrorMessage(message); Alert.alert('AI 분석 실패', message); setLoading(false);
  };

  return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.container}>
    <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.back}><Ionicons name="arrow-back" size={24} color="#0C4A6E" /></TouchableOpacity>
    <Text style={styles.title}>해양 생물 도감</Text><Text style={styles.subtitle}>사진을 올리면 AI가 해양 생물을 분석해 드려요.</Text>
    {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : <View style={styles.placeholder}><Ionicons name="fish-outline" size={54} color="#7DD3FC" /><Text style={styles.placeholderText}>해양 생물 사진을 선택해 주세요</Text></View>}
    <View style={styles.actions}><ActionButton icon="camera-outline" label="카메라" onPress={() => selectImage('camera')} disabled={loading} /><ActionButton icon="images-outline" label="갤러리" onPress={() => selectImage('library')} disabled={loading} /></View>
    {loading && <View style={[styles.analyzing, styles.cardShadow]}><ActivityIndicator color="#0284C7" size="large" /><Text style={styles.analyzingText}>AI가 이미지를 분석 중입니다...</Text></View>}
    {!!errorMessage && !loading && !result && <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={20} color="#B91C1C" /><Text style={styles.errorText}>{errorMessage}</Text></View>}
    {result && <ResultCard result={result} />}
  </ScrollView></SafeAreaView>;
}

function removeDataUrlPrefix(value) { return String(value).replace(/^data:[^;]+;base64,/i, '').replace(/\s/g, ''); }
function normalizeMimeType(value) { return /^image\/(jpeg|jpg|png|webp|gif)$/i.test(value || '') ? value : 'image/jpeg'; }
function cleanJsonCodeFence(value) { return String(value).replace(/^\s*```json\s*/i, '').replace(/^\s*```\s*/i, '').replace(/\s*```\s*$/, '').trim(); }
function extractJsonObject(value) {
  const withoutFence = cleanJsonCodeFence(value);
  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('AI 응답에서 JSON 형식을 찾지 못했습니다.');
  }
  return JSON.parse(withoutFence.slice(start, end + 1));
}
function ActionButton({ icon, label, onPress, disabled }) { return <TouchableOpacity style={[styles.actionButton, disabled && styles.disabled]} onPress={onPress} disabled={disabled}><Ionicons name={icon} size={23} color="#0369A1" /><Text style={styles.actionText}>{label}</Text></TouchableOpacity>; }
function ResultCard({ result }) { const danger = DANGER_STYLES[result.dangerLevel] || DANGER_STYLES.주의; return <View style={[styles.resultCard, styles.cardShadow]}><View style={styles.resultHead}><View style={styles.nameWrap}><Text style={styles.name}>{result.name}</Text><Text style={styles.scientific}>{result.scientificName}</Text><View style={styles.metaBadges}><View style={styles.categoryBadge}><Text style={styles.categoryText}>{result.category}</Text></View><View style={styles.confidenceBadge}><Text style={styles.confidenceText}>식별 신뢰도: {result.confidence}</Text></View></View>{result.alternativeNames?.length > 0 && <Text style={styles.alternativeNames}>비슷한 종: {result.alternativeNames.join(', ')}</Text>}</View><View style={[styles.danger, { backgroundColor: danger.backgroundColor }]}><Text style={[styles.dangerText, { color: danger.color }]}>{result.dangerLevel}</Text></View></View><Text style={styles.label}>특징 및 안전 정보</Text><Text style={styles.description}>{result.description}</Text><View style={styles.firstAidTitle}><Ionicons name="medical-outline" size={20} color="#DC2626" /><Text style={styles.firstAidHeading}>발견/쏘임 시 대처</Text></View><Text style={styles.description}>{result.actionGuide}</Text></View>; }

const shadow = Platform.OS === 'web' ? { boxShadow: '0 5px 18px rgba(15,23,42,0.10)' } : { shadowColor: '#0F172A', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 };
const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: '#F0F9FF' }, container: { padding: 20, paddingBottom: 40, width: '100%', maxWidth: 680, alignSelf: 'center' }, back: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' }, title: { color: '#0C4A6E', fontSize: 25, fontWeight: '800', marginTop: 18 }, subtitle: { color: '#64748B', marginTop: 7 }, placeholder: { height: 235, backgroundColor: '#E0F2FE', borderRadius: 22, marginTop: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#BAE6FD', borderStyle: 'dashed' }, placeholderText: { color: '#0369A1', fontWeight: '600', marginTop: 10 }, preview: { height: 235, borderRadius: 22, marginTop: 24, width: '100%' }, actions: { flexDirection: 'row', gap: 12, marginTop: 14 }, actionButton: { flex: 1, borderRadius: 15, paddingVertical: 14, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }, disabled: { opacity: 0.55 }, actionText: { color: '#0369A1', fontWeight: '700', marginLeft: 7 }, cardShadow: shadow, analyzing: { backgroundColor: '#FFF', padding: 24, borderRadius: 18, alignItems: 'center', marginTop: 18 }, analyzingText: { color: '#0369A1', fontWeight: '700', marginTop: 12 }, errorBox: { flexDirection: 'row', gap: 9, backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14, marginTop: 18 }, errorText: { flex: 1, color: '#B91C1C', lineHeight: 20 }, resultCard: { backgroundColor: '#FFF', borderRadius: 20, marginTop: 18, padding: 19 }, resultHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, nameWrap: { flex: 1 }, name: { color: '#0F172A', fontSize: 22, fontWeight: '800' }, scientific: { color: '#64748B', fontStyle: 'italic', marginTop: 4 }, metaBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 }, categoryBadge: { alignSelf: 'flex-start', backgroundColor: '#ECFDF5', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 }, categoryText: { color: '#047857', fontSize: 12, fontWeight: '700' }, confidenceBadge: { alignSelf: 'flex-start', backgroundColor: '#E0F2FE', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 }, confidenceText: { color: '#0369A1', fontSize: 12, fontWeight: '700' }, alternativeNames: { color: '#64748B', fontSize: 13, lineHeight: 19, marginTop: 7 }, danger: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14, alignSelf: 'flex-start' }, dangerText: { fontWeight: '800' }, label: { color: '#0F172A', fontWeight: '800', marginTop: 18, marginBottom: 7 }, description: { color: '#475569', lineHeight: 22 }, firstAidTitle: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 9 }, firstAidHeading: { color: '#991B1B', fontSize: 16, fontWeight: '800', marginLeft: 7 } });