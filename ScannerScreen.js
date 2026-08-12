import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const MODEL = 'google/gemma-4-31b-it:free';
const PROMPT = '사진 속 해양 생물을 판별해. 오직 JSON으로 응답: {"name":"이름","dangerLevel":"안전|관심|주의|경보","description":"특징과 유해성","actionGuide":"취급 또는 응급 대처"}. 독성, 가시, 쏘임 위험이 있으면 dangerLevel을 주의 또는 경보로 설정해.';

export default function ScannerScreen({ navigation }) {
  const [imageUri, setImageUri] = useState(null); const [loading, setLoading] = useState(false); const [result, setResult] = useState(null);
  const pick = async (camera) => {
    const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('권한이 필요합니다', '사진 접근 권한을 허용해 주세요.');
    const response = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 });
    if (response.canceled) return; const asset = response.assets?.[0]; if (!asset?.base64) return Alert.alert('오류', '이미지를 읽지 못했습니다.');
    setImageUri(asset.uri); setResult(null); await analyze(asset.base64.replace(/^data:[^;]+;base64,/i, ''), asset.mimeType || 'image/jpeg');
  };
  const analyze = async (base64, mimeType) => {
    const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
    if (!apiKey) return Alert.alert('설정 오류', 'EXPO_PUBLIC_OPENROUTER_API_KEY를 설정하고 Expo를 재시작해 주세요.');
    setLoading(true);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: MODEL, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT }, { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }] }] }) });
      if (!response.ok) throw new Error(await response.text()); const data = await response.json(); const text = data?.choices?.[0]?.message?.content || ''; const parsed = JSON.parse(text.replace(/^\s*```json\s*/i, '').replace(/\s*```\s*$/, '')); if (!parsed.name) throw new Error('식별 결과가 없습니다.'); setResult(parsed);
    } catch (error) { Alert.alert('분석 실패', '이미지 분석에 실패했습니다. 다시 시도해 주세요.'); console.warn(error); } finally { setLoading(false); }
  };
  const hazardous = result && ['주의', '경보', '심각'].includes(result.dangerLevel);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container}><TouchableOpacity onPress={() => navigation?.goBack()}><Ionicons name="arrow-back" size={25} color="#0C4A6E" /></TouchableOpacity><Text style={styles.title}>AI 생물 스캐너</Text><Text style={styles.subtitle}>사진 속 해양 생물의 위험성을 빠르게 확인하세요.</Text>{imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : <View style={styles.placeholder}><Ionicons name="scan-outline" size={54} color="#7DD3FC" /></View>}<View style={styles.actions}><Button icon="camera-outline" text="촬영" onPress={() => pick(true)} /><Button icon="images-outline" text="갤러리" onPress={() => pick(false)} /></View>{loading && <View style={styles.card}><ActivityIndicator color="#0284C7" /><Text style={styles.loading}>AI가 생물을 분석 중입니다...</Text></View>}{result && <View style={[styles.card, hazardous && styles.warning]}><Text style={styles.name}>{result.name}</Text><Text style={styles.level}>위험도: {result.dangerLevel || '확인 필요'}</Text><Text style={styles.body}>{result.description}</Text><Text style={styles.body}>{result.actionGuide}</Text>{hazardous && <TouchableOpacity style={styles.emergency} onPress={() => navigation?.navigate('Emergency')}><Ionicons name="medkit-outline" size={19} color="#FFF" /><Text style={styles.emergencyText}>응급 대처 가이드 보기</Text></TouchableOpacity>}</View>}</ScrollView></SafeAreaView>;
}
function Button({ icon, text, onPress }) { return <TouchableOpacity style={styles.button} onPress={onPress}><Ionicons name={icon} size={22} color="#0369A1" /><Text style={styles.buttonText}>{text}</Text></TouchableOpacity>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#F0F9FF' }, container: { padding: 20, paddingBottom: 40, maxWidth: 680, width: '100%', alignSelf: 'center' }, title: { fontSize: 25, fontWeight: '800', color: '#0C4A6E', marginTop: 18 }, subtitle: { color: '#64748B', marginTop: 7 }, placeholder: { height: 240, borderRadius: 22, backgroundColor: '#E0F2FE', marginTop: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: '#BAE6FD' }, image: { height: 240, borderRadius: 22, marginTop: 24 }, actions: { flexDirection: 'row', gap: 12, marginTop: 14 }, button: { flex: 1, padding: 15, borderRadius: 15, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }, buttonText: { color: '#0369A1', fontWeight: '800', marginLeft: 7 }, card: { backgroundColor: '#FFF', borderRadius: 18, padding: 18, marginTop: 18 }, warning: { borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }, loading: { color: '#0369A1', fontWeight: '700', textAlign: 'center', marginTop: 12 }, name: { color: '#0F172A', fontWeight: '800', fontSize: 21 }, level: { color: '#B45309', fontWeight: '800', marginTop: 8 }, body: { color: '#475569', lineHeight: 21, marginTop: 11 }, emergency: { backgroundColor: '#DC2626', padding: 13, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', marginTop: 18 }, emergencyText: { color: '#FFF', fontWeight: '800', marginLeft: 7 } });
