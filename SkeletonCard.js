import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { useAppSettings } from './AppSettingsContext';

// Reusable placeholder for short, local loading states. It runs fully on web
// and native without relying on a CSS-only animation package.
export default function SkeletonCard({ lines = 3, style }) {
  const { colors } = useAppSettings();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.95, duration: 720, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 720, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, { opacity, backgroundColor: colors.surfaceRaised, shadowColor: colors.shadow }, style]} accessibilityLabel="콘텐츠를 불러오는 중입니다">
      <View style={[styles.title, { backgroundColor: colors.skeleton }]} />
      {Array.from({ length: lines }).map((_, index) => (
        <View key={index} style={[styles.line, { backgroundColor: colors.skeleton }, index === lines - 1 && styles.shortLine]} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 16,
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 10px rgba(10, 25, 47, 0.08)' } : {}),
  },
  title: { height: 18, width: '48%', borderRadius: 8, marginBottom: 14 },
  line: { height: 12, width: '100%', borderRadius: 8, marginTop: 9 },
  shortLine: { width: '64%' },
});
