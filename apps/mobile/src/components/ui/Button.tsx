import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { theme } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, accessibilityLabel, style }: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [s.base, s[variant], inactive && s.inactive, pressed && s.pressed, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? theme.colors.onDark : theme.colors.ink} />
      ) : (
        <Text style={[s.text, variant === 'primary' || variant === 'danger' ? s.textOnDark : s.textInk]}>{title}</Text>
      )}
    </Pressable>
  );
}

export const PrimaryButton = (p: Omit<ButtonProps, 'variant'>) => <Button {...p} variant="primary" />;
export const SecondaryButton = (p: Omit<ButtonProps, 'variant'>) => <Button {...p} variant="secondary" />;

const s = StyleSheet.create({
  base: {
    minHeight: theme.touchTarget.min,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: theme.colors.ink },
  secondary: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  danger: { backgroundColor: theme.colors.danger },
  ghost: { backgroundColor: 'transparent' },
  inactive: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  text: { fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold },
  textOnDark: { color: theme.colors.onDark },
  textInk: { color: theme.colors.ink },
});
