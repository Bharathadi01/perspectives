import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface IconButtonProps {
  icon: IconName;
  /** Draws a different icon set in place of `icon` (Explore uses Phosphor). */
  renderIcon?: (p: { size: number; color: string }) => React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  size?: 'large' | 'small';
  tone?: 'light' | 'brand' | 'dark';
  disabled?: boolean;
  style?: ViewStyle;
}

/** Round floating action (skip, give perspective). */
export function IconButton({ icon, renderIcon, onPress, accessibilityLabel, size = 'large', tone = 'light', disabled, style }: IconButtonProps) {
  const d = theme.iconButton[size];
  const color = tone === 'light' ? theme.colors.ink : theme.colors.onDark;
  const glyph = size === 'large' ? 26 : 20;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={size === 'small' ? 4 : 0}
      style={({ pressed }) => [
        s.base,
        { width: d, height: d, borderRadius: d / 2 },
        s[tone],
        disabled && s.disabled,
        pressed && s.pressed,
        style,
      ]}
    >
      {renderIcon ? renderIcon({ size: glyph, color }) : <Ionicons name={icon} size={glyph} color={color} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  light: { backgroundColor: theme.colors.surface },
  brand: { backgroundColor: theme.colors.brand },
  dark: { backgroundColor: theme.colors.ink },
  disabled: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.96 }] },
});
