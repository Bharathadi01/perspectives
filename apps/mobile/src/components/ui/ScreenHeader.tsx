import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

interface ScreenHeaderProps {
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: React.ReactNode;
}

/** Back arrow, title, optional trailing control. Replaces four hand-rolled copies. */
export function ScreenHeader({ title, onBack, backLabel = 'Back', right }: ScreenHeaderProps) {
  return (
    <View style={s.header}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          style={({ pressed }) => [s.back, pressed && s.pressed]}
        >
          <Ionicons name="chevron-back" size={theme.iconSize.xl} color={theme.colors.ink} />
        </Pressable>
      ) : null}
      {title ? (
        <Text style={s.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
      ) : null}
      <View style={s.spacer} />
      {right}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingLeft: theme.spacing.sm,
    paddingRight: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
  },
  back: {
    width: theme.touchTarget.min,
    height: theme.touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: theme.opacity.pressed },
  title: { ...theme.textStyles.title, color: theme.colors.ink, flexShrink: 1 },
  spacer: { flex: 1 },
});
