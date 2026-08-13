import React, { useEffect, useRef } from 'react';
import { Animated, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const icons = ['pulse-outline', 'scan-outline', 'medkit-outline'];

export default function IntroScreen({ navigation }) {
  const { t } = useTranslation();
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start(); }, [fade]);
  const features = t('intro.features', { returnObjects: true });
  return <SafeAreaView style={s.safe}><Animated.View style={[s.container, { opacity: fade }]}><View style={s.hero}><Ionicons name="water" size={68} color="#00B4D8" /><Text style={s.brand}>{t('common.brand')}</Text><Text style={s.tagline}>{t('intro.tagline')}</Text></View><View>{features.map((label, index) => <View style={s.feature} key={label}><Ionicons name={icons[index]} size={25} color="#00B4D8" /><Text style={s.featureText}>{label}</Text></View>)}</View><TouchableOpacity style={s.guest} onPress={() => navigation.replace('AppTabs')}><Text style={s.guestText}>{t('intro.start')}</Text></TouchableOpacity></Animated.View></SafeAreaView>;
}
const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#0A192F' }, container: { flex: 1, padding: 28, justifyContent: 'space-around', maxWidth: 680, width: '100%', alignSelf: 'center' }, hero: { alignItems: 'center' }, brand: { color: '#FFF', fontSize: 38, fontWeight: '900', marginTop: 12 }, tagline: { color: '#A5D8E8', marginTop: 8 }, feature: { backgroundColor: '#112A46', borderRadius: 17, padding: 17, marginTop: 11, flexDirection: 'row', alignItems: 'center', gap: 12 }, featureText: { color: '#FFF', fontWeight: '800' }, guest: { backgroundColor: '#00B4D8', padding: 17, borderRadius: 16, alignItems: 'center' }, guestText: { color: '#0A192F', fontWeight: '900', fontSize: 16 } });
