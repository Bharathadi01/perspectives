import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../../theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

/** Selectable pill (chips, focus areas, filters). Non-interactive when `onPress` is omitted. */
export function Chip({ label, selected, onPress, disabled }: ChipProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'checkbox' : 'text'}
      accessibilityState={onPress ? { checked: !!selected, disabled: !!disabled } : undefined}
      onPress={onPress}
      disabled={!onPress || disabled}
      style={[s.chip, selected && s.selected, disabled && !selected && s.disabled, onPress && s.tappable]}
    >
      <Text style={[s.text, selected && s.textSelected]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignSelf: 'flex-start',
  },
  tappable: { minHeight: theme.touchTarget.min - 8, justifyContent: 'center' },
  selected: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  disabled: { opacity: 0.4 },
  text: { fontSize: theme.typography.fontSize.sm, color: theme.colors.ink },
  textSelected: { color: theme.colors.onDark, fontWeight: theme.typography.fontWeight.semibold },
});
