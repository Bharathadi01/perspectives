import Ionicons from '@expo/vector-icons/Ionicons';
import type { Post } from '@perspective/contracts';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PaperSheet, SheetAction } from '../../components/editorial/PaperSheet';
import type { IconName } from '../../components/ui/IconButton';
import { theme } from '../../theme';

const e = theme.editorial;

interface CardActionsSheetProps {
  post: Post | null;
  /** Where the card sits, said in the terms of the section it is in. */
  where: string;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  onClose: () => void;
  onMove: (direction: -1 | 1) => void;
  onEdit: () => void;
  onRemove: () => void;
}

/**
 * Everything you can do to one card. Reordering lives here as well as in the
 * drag, because dragging competes with scrolling on a phone and is no use at
 * all with a screen reader. In the editorial paper sheet (2026-10-31), like the
 * safety sheet.
 */
export function CardActionsSheet({
  post,
  where,
  canMoveEarlier,
  canMoveLater,
  onClose,
  onMove,
  onEdit,
  onRemove,
}: CardActionsSheetProps) {
  if (!post) return null;

  const kind = post.kind === 'photo' ? 'photo' : post.kind === 'audio' ? 'voice card' : 'written card';

  return (
    <PaperSheet visible onClose={onClose} title={`Your ${kind}`} subtitle={`${where} · “${post.prompt}”`}>
      <View style={s.block}>
        <Action icon="arrow-back" label="Move earlier" disabled={!canMoveEarlier} onPress={() => onMove(-1)} />
        <Action icon="arrow-forward" label="Move later" disabled={!canMoveLater} onPress={() => onMove(1)} />
        <Action icon="create-outline" label="Edit the question" onPress={onEdit} />
        <Action icon="trash-outline" label="Remove" destructive last onPress={onRemove} />
      </View>
      <SheetAction label="Cancel" onPress={onClose} />
    </PaperSheet>
  );
}

function Action({
  icon,
  label,
  onPress,
  disabled,
  destructive,
  last,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
  last?: boolean;
}) {
  const color = destructive ? e.colors.accentText : e.colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [s.row, !last && s.rowLine, pressed && s.pressed, disabled && s.disabled]}
    >
      <Ionicons name={icon} size={theme.iconSize.lg} color={color} />
      <Text style={[s.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  block: {
    backgroundColor: e.colors.surface,
    borderRadius: 20,
    borderWidth: theme.borderWidth.hairline,
    borderColor: e.colors.line,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 54,
    paddingHorizontal: theme.spacing.base,
  },
  rowLine: { borderBottomWidth: theme.borderWidth.hairline, borderBottomColor: e.colors.line },
  pressed: { opacity: theme.opacity.pressed },
  disabled: { opacity: theme.opacity.disabled },
  label: { flex: 1, fontFamily: e.fonts.bodyMedium, fontSize: 16 },
});
