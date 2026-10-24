import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  tone?: 'surface' | 'muted' | 'brandSoft';
  padded?: boolean;
  elevation?: keyof typeof theme.elevation | 'none';
  style?: ViewStyle;
}

/** A rounded container. The app's one card shape, so radii stop drifting. */
export function Card({ children, tone = 'surface', padded, elevation = 'card', style }: CardProps) {
  return (
    <View
      style={[
        s.base,
        s[tone],
        padded && s.padded,
        elevation !== 'none' && theme.elevation[elevation],
        style,
      ]}
    >
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    borderRadius: theme.radius.card,
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  surface: { backgroundColor: theme.colors.surface },
  muted: { backgroundColor: theme.colors.surfaceMuted },
  brandSoft: { backgroundColor: theme.colors.brandSoft, borderColor: theme.colors.brandSoft },
  padded: { padding: theme.spacing.base },
});
