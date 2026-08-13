import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from './AppSettingsContext';

export default function HeaderControls() {
  const { isDark, toggleTheme, language, setLanguage, colors, t } = useAppSettings();
  return <View style={styles.row}>
    <TouchableOpacity onPress={toggleTheme} style={[styles.button, { backgroundColor: colors.soft, borderColor: colors.border }]} accessibilityLabel={t('common.darkMode')}>
      <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={colors.icon} />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => setLanguage(language === 'ko' ? 'en' : 'ko')} style={[styles.button, { backgroundColor: colors.soft, borderColor: colors.border }]} accessibilityLabel={t('common.language')}>
      <Text style={[styles.text, { color: colors.icon }]}>{language === 'ko' ? 'KOR' : 'ENG'}</Text>
    </TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 7 }, button: { height: 34, minWidth: 42, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }, text: { fontWeight: '900', fontSize: 11 } });
