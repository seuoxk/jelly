import React, { useState } from 'react';
import { Alert, Linking, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HeaderControls from './HeaderControls';
import { useAppSettings } from './AppSettingsContext';

const GUIDES = {
  jellyfish: [
    { title: '1단계 · 바닷물로 세척', icon: 'water-outline', body: '즉시 물 밖으로 나온 뒤, 상처 부위를 깨끗한 바닷물로 충분히 씻으세요. 수돗물·민물·알코올은 독침 발사를 자극할 수 있어 피해야 합니다.' },
    { title: '2단계 · 촉수와 침 제거', icon: 'cut-outline', body: '장갑이나 비닐을 사용하고, 카드 가장자리 또는 핀셋으로 촉수를 옆으로 조심스럽게 걷어내세요. 맨손으로 문지르거나 긁지 마세요.' },
    { title: '3단계 · 온찜질과 관찰', icon: 'thermometer-outline', body: '가능하면 40~45°C의 따뜻한 물로 20분 정도 온찜질하세요. 호흡 곤란, 전신 두드러기, 심한 통증이 있으면 즉시 119에 신고하세요.' },
  ],
  spine: [
    { title: '1단계 · 안전한 곳으로 이동', icon: 'walk-outline', body: '성게·가시고기 등에 찔렸다면 추가 접촉을 피하고, 물 밖의 안전한 장소로 이동하세요.' },
    { title: '2단계 · 보이는 가시만 제거', icon: 'medical-outline', body: '피부 밖으로 나온 가시만 소독한 핀셋으로 조심스럽게 제거하세요. 깊이 박힌 가시를 억지로 파내지 마세요.' },
    { title: '3단계 · 온찜질 후 진료', icon: 'thermometer-outline', body: '따뜻한 물에 30~90분 담가 통증을 줄이고 상처를 깨끗이 덮으세요. 통증이 지속되거나 감염이 의심되면 진료를 받으세요.' },
  ],
};

export default function EmergencyScreen({ navigation }) {
  const { colors, t } = useAppSettings();
  const [kind, setKind] = useState('jellyfish');
  const [activeStep, setActiveStep] = useState(0);
  const [quickOpen, setQuickOpen] = useState(false);
  // Text comes from the active i18next locale; icons stay local presentation data.
  const translatedSteps = t(`emergency.stepsData.${kind}`, { returnObjects: true });
  const steps = Array.isArray(translatedSteps) ? translatedSteps.map((step, index) => ({ ...step, icon: GUIDES[kind][index]?.icon || 'medical-outline' })) : GUIDES[kind];
  const selectKind = (next) => { setKind(next); setActiveStep(0); };
  const goHome = () => navigation?.navigate?.('Main');
  const goBack = () => navigation?.canGoBack?.() ? navigation.goBack() : goHome();
  const call119 = async () => {
    try { await Linking.openURL('tel:119'); }
    catch (_) { Alert.alert(t('emergency.callTitle'), t('emergency.callFailed')); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.textButton} onPress={goBack}><Ionicons name="chevron-back" size={20} color={colors.accentStrong} /><Text style={[styles.textButtonLabel, { color: colors.accentStrong }]}>{t('common.back')}</Text></TouchableOpacity>
          <View style={styles.navRight}><HeaderControls /><TouchableOpacity style={[styles.home, { backgroundColor: colors.soft }]} onPress={goHome}><Ionicons name="home-outline" size={16} color={colors.accentStrong} /><Text style={[styles.homeText, { color: colors.accentStrong }]}>{t('common.home')}</Text></TouchableOpacity></View>
        </View>

        <View style={styles.hero}>
          <Ionicons name="medkit" size={39} color={colors.danger} />
          <Text style={[styles.title, { color: colors.text }]}>{t('emergency.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{t('emergency.subtitle')}</Text>
        </View>

        <View style={[styles.segmented, { backgroundColor: colors.soft }]}>
          <TouchableOpacity style={[styles.segment, kind === 'jellyfish' && styles.segmentActive, kind === 'jellyfish' && { backgroundColor: colors.surfaceRaised }]} onPress={() => selectKind('jellyfish')}><Text style={[styles.segmentText, { color: colors.muted }, kind === 'jellyfish' && { color: colors.accentStrong }]}>{t('emergency.jellyfish')}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.segment, kind === 'spine' && styles.segmentActive, kind === 'spine' && { backgroundColor: colors.surfaceRaised }]} onPress={() => selectKind('spine')}><Text style={[styles.segmentText, { color: colors.muted }, kind === 'spine' && { color: colors.accentStrong }]}>{t('emergency.spine')}</Text></TouchableOpacity>
        </View>

        <View style={[styles.timelineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.heading, { color: colors.text }]}>{t('emergency.steps')}</Text>
          {steps.map((step, index) => {
            const selected = activeStep === index;
            return <TouchableOpacity key={step.title} activeOpacity={0.85} onPress={() => setActiveStep(index)} style={[styles.step, selected && { backgroundColor: colors.soft }]}>
              <View style={[styles.timeline, { borderLeftColor: index === steps.length - 1 ? 'transparent' : colors.border }]}><View style={[styles.number, { backgroundColor: colors.soft }, selected && { backgroundColor: colors.accent }]}><Text style={[styles.numberText, { color: colors.accentStrong }, selected && { color: colors.onAccent }]}>{index + 1}</Text></View></View>
              <View style={styles.stepCopy}><Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>{selected && <Text style={[styles.stepBody, { color: colors.muted }]}>{step.body}</Text>}</View>
              <Ionicons name={selected ? 'chevron-up' : 'chevron-down'} size={18} color={colors.accent} />
            </TouchableOpacity>;
          })}
        </View>

        <TouchableOpacity style={[styles.quickButton, { backgroundColor: colors.soft }]} onPress={() => setQuickOpen(true)}><Ionicons name="flash-outline" size={20} color={colors.accentStrong} /><Text style={[styles.quickText, { color: colors.accentStrong }]}>{t('emergency.quick')}</Text></TouchableOpacity>
        <View style={[styles.warning, { backgroundColor: colors.dangerSoft }]}><Ionicons name="warning-outline" size={21} color={colors.danger} /><Text style={[styles.warningText, { color: colors.dangerText }]}>{t('emergency.emergencySignal')}</Text></View>
        <TouchableOpacity style={[styles.callButton, { backgroundColor: colors.danger }]} onPress={call119}><Ionicons name="call" size={23} color={colors.onAccent} /><Text style={[styles.callText, { color: colors.onAccent }]}>{t('emergency.call119')}</Text></TouchableOpacity>
      </ScrollView>

      <Modal visible={quickOpen} transparent animationType="fade" onRequestClose={() => setQuickOpen(false)}>
        <View style={[styles.backdrop, { backgroundColor: colors.backdrop }]}><View style={[styles.modal, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHead}><Text style={[styles.modalTitle, { color: colors.text }]}>{t('emergency.quickTitle')}</Text><TouchableOpacity onPress={() => setQuickOpen(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity></View>
          {steps.map((step, index) => <Text key={step.title} style={[styles.modalStep, { color: colors.muted }]}>{index + 1}. {step.body}</Text>)}
          <TouchableOpacity style={[styles.modalCall, { backgroundColor: colors.danger }]} onPress={call119}><Text style={[styles.modalCallText, { color: colors.onAccent }]}>{t('emergency.call119')}</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, container: { padding: 20, paddingBottom: 40, width: '100%', alignSelf: 'center' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, navRight: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  textButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 }, textButtonLabel: { color: '#075985', fontWeight: '800' },
  home: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2FE', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 13 }, homeText: { color: '#075985', fontWeight: '800', marginLeft: 4, fontSize: 12 },
  hero: { alignItems: 'center', marginTop: 20 }, title: { fontSize: 27, fontWeight: '900', marginTop: 10 }, subtitle: { textAlign: 'center', lineHeight: 20, marginTop: 7 },
  segmented: { flexDirection: 'row', backgroundColor: '#DDF3F8', borderRadius: 14, padding: 4, marginTop: 23 }, segment: { flex: 1, borderRadius: 11, paddingVertical: 11, alignItems: 'center' }, segmentActive: { backgroundColor: '#FFF', ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(10,25,47,0.12)' } : {}) }, segmentText: { color: '#52707A', fontWeight: '800' }, segmentTextActive: { color: '#075985' },
  timelineCard: { borderWidth: 1, borderRadius: 20, padding: 17, marginTop: 14, ...(Platform.OS === 'web' ? { boxShadow: '0 4px 16px rgba(10,25,47,0.11)' } : {}) }, heading: { fontSize: 18, fontWeight: '900', marginBottom: 5 },
  step: { flexDirection: 'row', paddingVertical: 13, borderRadius: 14, paddingHorizontal: 6 }, stepActive: { backgroundColor: '#ECFEFF' }, timeline: { width: 34, alignItems: 'center', borderLeftWidth: 2, borderLeftColor: '#BAE6FD', marginLeft: 9 }, timelineLast: { borderLeftColor: 'transparent' }, number: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' }, numberActive: { backgroundColor: '#00B4D8' }, numberText: { color: '#075985', fontWeight: '900' }, numberTextActive: { color: '#FFF' }, stepCopy: { flex: 1, marginLeft: 8, paddingRight: 8 }, stepTitle: { fontWeight: '900', lineHeight: 22 }, stepBody: { lineHeight: 20, marginTop: 7 },
  quickButton: { flexDirection: 'row', justifyContent: 'center', gap: 8, alignItems: 'center', backgroundColor: '#E0F2FE', padding: 14, borderRadius: 14, marginTop: 16 }, quickText: { color: '#075985', fontWeight: '900' },
  warning: { backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14, flexDirection: 'row', marginTop: 14 }, warningText: { flex: 1, color: '#991B1B', lineHeight: 20, marginLeft: 9 }, callButton: { backgroundColor: '#FF4D4D', padding: 18, borderRadius: 18, marginTop: 16, flexDirection: 'row', justifyContent: 'center' }, callText: { color: '#FFF', fontSize: 17, fontWeight: '900', marginLeft: 9 },
  backdrop: { flex: 1, backgroundColor: 'rgba(10,25,47,0.58)', justifyContent: 'center', padding: 24 }, modal: { borderRadius: 20, padding: 21 }, modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, modalTitle: { fontSize: 20, fontWeight: '900' }, modalStep: { lineHeight: 22, marginTop: 14 }, modalCall: { backgroundColor: '#FF4D4D', borderRadius: 13, padding: 14, alignItems: 'center', marginTop: 20 }, modalCallText: { color: '#FFF', fontWeight: '900' },
});
