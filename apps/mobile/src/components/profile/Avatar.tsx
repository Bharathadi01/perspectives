import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { theme } from '../../theme';

export function Avatar({ name, url, size = 44 }: { name: string; url: string | null; size?: number }) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (url) {
    return <Image source={{ uri: api.mediaUrl(url) }} style={[s.base, style]} accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={[s.base, s.fallback, style]}>
      <Text style={s.initial}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export function VerifiedBadge({ size = 18 }: { size?: number }) {
  return (
    <Ionicons
      name="checkmark-circle"
      size={size}
      color={theme.colors.brand}
      accessibilityLabel="Selfie verified"
      accessibilityRole="image"
    />
  );
}

const s = StyleSheet.create({
  base: { backgroundColor: theme.colors.surfaceMuted },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontWeight: theme.typography.fontWeight.bold, color: theme.colors.muted, fontSize: theme.typography.fontSize.md },
});
