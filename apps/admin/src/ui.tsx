import { colors, radius, spacing, typography } from '@perspective/design-tokens';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

/** Small building blocks for the admin page, styled only with design tokens. */

export const t = { colors, radius, spacing, typography };

export function Page({ children }: { children: React.ReactNode }) {
  return <View style={s.page}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function H1({ children }: { children: React.ReactNode }) {
  return (
    <Text style={s.h1} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <Text style={s.h2} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={s.muted}>{children}</Text>;
}

export function Body({ children }: { children: React.ReactNode }) {
  return <Text style={s.body}>{children}</Text>;
}

type Tone = 'brand' | 'danger' | 'warning' | 'success' | 'muted';
const TONE: Record<Tone, string> = {
  brand: colors.brand,
  danger: colors.danger,
  warning: colors.warning,
  success: colors.success,
  muted: colors.muted,
};

export function Badge({ label, tone = 'muted' }: { label: string; tone?: Tone }) {
  return (
    <View style={[s.badge, { borderColor: TONE[tone] }]}>
      <Text style={[s.badgeText, { color: TONE[tone] }]}>{label}</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  tone = 'brand',
  variant = 'solid',
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  tone?: Tone;
  variant?: 'solid' | 'outline';
  disabled?: boolean;
  loading?: boolean;
}) {
  const color = TONE[tone];
  const solid = variant === 'solid';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={[s.button, { backgroundColor: solid ? color : 'transparent', borderColor: color }, (disabled || loading) && s.disabled]}
    >
      {loading ? <ActivityIndicator color={solid ? colors.onDark : color} /> : <Text style={[s.buttonText, { color: solid ? colors.onDark : color }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} style={[s.input, props.multiline && s.multiline]} {...props} />
    </View>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return children ? (
    <Text style={s.error} accessibilityRole="alert">
      {children}
    </Text>
  ) : null;
}

export function Loading() {
  return (
    <View style={s.center}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

export function formatWhen(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.base, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.base, gap: spacing.sm },
  h1: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.ink },
  h2: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.ink },
  muted: { fontSize: typography.fontSize.sm, color: colors.muted },
  body: { fontSize: typography.fontSize.base, color: colors.ink },
  badge: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold },
  button: { minHeight: 44, paddingHorizontal: spacing.base, borderRadius: radius.control, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  disabled: { opacity: 0.5 },
  field: { gap: spacing.xs },
  label: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.ink },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.ink,
  },
  multiline: { minHeight: 88, paddingTop: spacing.sm, textAlignVertical: 'top' },
  error: { color: colors.danger, fontSize: typography.fontSize.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
});
