import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import type { IconName } from './IconButton';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconTone?: 'ink' | 'brand' | 'muted' | 'success' | 'danger';
  /** Right-aligned secondary value, for example a version number. */
  value?: string;
  badge?: number;
  /** Omit to render an inert row: no button role, no chevron. */
  onPress?: () => void;
  /** 'none' for a row that acts in place (Sign out) rather than navigating. */
  accessory?: 'chevron' | 'none';
  destructive?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Injected by ListGroup; callers do not set these. */
  last?: boolean;
}

/**
 * One row of a grouped list. A row without `onPress` is genuinely inert: it
 * carries no button role and draws no chevron, so a placeholder never reads as
 * a control that is broken.
 */
export function ListRow({
  title,
  subtitle,
  icon,
  iconTone = 'muted',
  value,
  badge,
  onPress,
  accessory = 'chevron',
  destructive,
  disabled,
  accessibilityLabel,
  last,
}: ListRowProps) {
  const interactive = !!onPress && !disabled;

  const body = (
    <>
      {icon ? (
        <Ionicons name={icon} size={theme.iconSize.lg} color={theme.colors[iconTone]} style={s.icon} />
      ) : null}
      <View style={s.text}>
        <Text style={[s.title, destructive && s.destructive, disabled && s.dimmed]}>{title}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      {typeof badge === 'number' && badge > 0 ? (
        <View style={s.badge}>
          <Text style={s.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {value ? <Text style={s.value}>{value}</Text> : null}
      {interactive && accessory === 'chevron' ? (
        <Ionicons name="chevron-forward" size={theme.iconSize.lg} color={theme.colors.muted} />
      ) : null}
    </>
  );

  if (!interactive) {
    return <View style={[s.row, last && s.last]}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={({ pressed }) => [s.row, last && s.last, pressed && s.pressed]}
    >
      {body}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: theme.touchTarget.min,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: theme.borderWidth.hairline,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  last: { borderBottomWidth: 0 },
  pressed: { backgroundColor: theme.colors.surfaceMuted },
  icon: { width: theme.iconSize.lg },
  text: { flex: 1, minWidth: 0 },
  title: { ...theme.textStyles.callout, fontSize: theme.typography.fontSize.base, color: theme.colors.ink },
  destructive: { color: theme.colors.danger },
  dimmed: { color: theme.colors.muted },
  subtitle: { ...theme.textStyles.callout, color: theme.colors.muted, marginTop: 1 },
  value: { ...theme.textStyles.callout, color: theme.colors.muted },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 6,
    backgroundColor: theme.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...theme.textStyles.caption,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.onDark,
  },
});
