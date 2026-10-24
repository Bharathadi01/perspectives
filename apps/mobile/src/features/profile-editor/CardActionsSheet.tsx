import Ionicons from '@expo/vector-icons/Ionicons';
import type { Post } from '@perspective/contracts';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Sheet } from '../../components/ui/Sheet';
import type { IconName } from '../../components/ui/IconButton';
import { theme } from '../../theme';

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
 * all with a screen reader.
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
    <Sheet visible onClose={onClose} title={`Your ${kind}`} subtitle={`${where} · “${post.prompt}”`}>
      <Action icon="arrow-back" label="Move earlier" disabled={!canMoveEarlier} onPress={() => onMove(-1)} />
      <Action icon="arrow-forward" label="Move later" disabled={!canMoveLater} onPress={() => onMove(1)} />
      <Action icon="create-outline" label="Edit the question" onPress={onEdit} />
      <Action icon="trash-outline" label="Remove" destructive onPress={onRemove} />
    </Sheet>
  );
}

function Action({
  icon,
  label,
  onPress,
  disabled,
  destructive,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [s.action, pressed && s.pressed, disabled && s.disabled]}
    >
      <Ionicons
        name={icon}
        size={theme.iconSize.lg}
        color={destructive ? theme.colors.danger : theme.colors.ink}
      />
      <Text style={[s.label, destructive && s.destructive]}>{label}</Text>
      <View style={s.spacer} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: theme.touchTarget.min,
    paddingHorizontal: theme.spacing.xs,
  },
  pressed: { opacity: theme.opacity.pressed },
  disabled: { opacity: theme.opacity.disabled },
  label: { ...theme.textStyles.body, color: theme.colors.ink },
  destructive: { color: theme.colors.danger },
  spacer: { flex: 1 },
});
