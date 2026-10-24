import Ionicons from '@expo/vector-icons/Ionicons';
import type { Post } from '@perspective/contracts';
import React, { useRef } from 'react';
import { AccessibilityActionEvent, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDuration } from '../../lib/labels';
import { theme } from '../../theme';
import { rowDropTarget, type RowFrame } from './grid';
import { photosBefore } from './reorder';
import { useLiftDrag } from './useLiftDrag';
import { VoiceChip } from './VoiceChip';

interface PromptListProps {
  /** Every card in profile order; only the voice and written ones are listed. */
  posts: readonly Post[];
  playingId: string | null;
  onPlay: (postId: string) => void;
  onEdit: (post: Post) => void;
  onActions: (post: Post) => void;
  onAdd: (kind: 'audio' | 'text') => void;
  canAdd: boolean;
  /** List places, not profile positions. */
  onSwap: (from: number, to: number) => void;
  onDraggingChange: (dragging: boolean) => void;
}

/**
 * Voice and written cards, one row each, under the photos.
 *
 * Each row shows the question at reading size and where the card appears on
 * the profile ("after photo 2"), since that is the one thing the photo grid
 * cannot show about them. Hold a row and drag it onto another to swap them,
 * the same way the photos work.
 */
export function PromptList({
  posts,
  playingId,
  onPlay,
  onEdit,
  onActions,
  onAdd,
  canAdd,
  onSwap,
  onDraggingChange,
}: PromptListProps) {
  const rows = posts.flatMap((post, index) => (post.kind === 'photo' ? [] : [{ post, index }]));
  // Rows differ in height, so each one reports where it is.
  const frames = useRef<(RowFrame | undefined)[]>([]).current;
  const { lifted, isTarget, pan, scale, lift, letGo, responderFor } = useLiftDrag({
    targetFor: (from, _dx, dy) => rowDropTarget(frames.slice(0, rows.length), from, dy),
    onDrop: onSwap,
    onDraggingChange,
  });

  return (
    <View style={s.list}>
      {rows.map(({ post, index }, place) => {
        const voice = post.kind === 'audio';
        const after = photosBefore(posts, index);
        const meta = [
          voice ? `Voice · ${formatDuration(post.durationSec ?? 0)}` : 'Written',
          `After photo ${after}`,
        ].join('  ·  ');
        const isLifted = lifted === place;

        const actions = [
          ...(place > 0 ? [{ name: 'moveEarlier', label: 'Move earlier' }] : []),
          ...(place < rows.length - 1 ? [{ name: 'moveLater', label: 'Move later' }] : []),
          { name: 'options', label: 'Card options' },
        ];
        const onAction = (e: AccessibilityActionEvent) => {
          if (e.nativeEvent.actionName === 'moveEarlier') onSwap(place, place - 1);
          else if (e.nativeEvent.actionName === 'moveLater') onSwap(place, place + 1);
          else onActions(post);
        };

        return (
          <Animated.View
            key={post.id}
            {...responderFor(place).panHandlers}
            onLayout={(e) => {
              const { y, height } = e.nativeEvent.layout;
              frames[place] = { y, height };
            }}
            style={[
              isLifted && s.liftedRow,
              // Rows only travel up and down.
              isLifted && { transform: [{ translateY: pan.y }, { scale }] },
            ]}
          >
            <Pressable
              onPress={() => onEdit(post)}
              onLongPress={() => lift(place)}
              delayLongPress={250}
              onPressOut={() => letGo(place)}
              accessibilityRole="button"
              accessibilityLabel={`${voice ? 'Voice card' : 'Written card'}, after photo ${after}. ${post.prompt}`}
              accessibilityHint="Double tap to edit. Hold and drag onto another to swap."
              accessibilityActions={actions}
              onAccessibilityAction={onAction}
              style={({ pressed }) => [
                s.row,
                pressed && !isLifted && s.pressed,
                isLifted && s.rowLifted,
                isTarget(place) && s.rowTarget,
              ]}
            >
              {voice && post.mediaUrl ? (
                <VoiceChip
                  path={post.mediaUrl}
                  durationSec={post.durationSec}
                  active={playingId === post.id}
                  onPlay={() => onPlay(post.id)}
                  variant="round"
                />
              ) : (
                <View style={s.glyph}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={theme.iconSize.lg}
                    color={theme.colors.brand}
                  />
                </View>
              )}

              <View style={s.body}>
                <Text style={s.question} numberOfLines={2}>
                  {post.prompt}
                </Text>
                <Text style={s.meta}>{meta}</Text>
              </View>

              <Pressable
                onPress={() => onActions(post)}
                accessibilityRole="button"
                accessibilityLabel="Card options"
                hitSlop={8}
                style={({ pressed }) => [s.menu, pressed && s.pressed]}
              >
                <Ionicons name="ellipsis-horizontal" size={theme.iconSize.base} color={theme.colors.muted} />
              </Pressable>
            </Pressable>
          </Animated.View>
        );
      })}

      {rows.length > 1 ? <Text style={s.hint}>Hold and drag to reorder.</Text> : null}

      {canAdd ? (
        <View style={s.adds}>
          <AddButton icon="mic-outline" label="Voice note" onPress={() => onAdd('audio')} />
          <AddButton icon="chatbubble-ellipses-outline" label="Written" onPress={() => onAdd('text')} />
        </View>
      ) : null}
    </View>
  );
}

function AddButton({
  icon,
  label,
  onPress,
}: {
  icon: 'mic-outline' | 'chatbubble-ellipses-outline';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Add a ${label.toLowerCase()} card`}
      style={({ pressed }) => [s.add, pressed && s.pressed]}
    >
      <Ionicons name="add" size={theme.iconSize.md} color={theme.colors.brand} />
      <Ionicons name={icon} size={theme.iconSize.md} color={theme.colors.brand} />
      <Text style={s.addText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  list: { gap: theme.spacing.sm },
  pressed: { opacity: theme.opacity.pressed },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 72,
    paddingVertical: theme.spacing.md,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
  },
  liftedRow: { zIndex: 10 },
  rowLifted: { ...theme.elevation.float },
  rowTarget: {
    borderWidth: theme.borderWidth.focus,
    borderColor: theme.colors.brand,
  },
  glyph: {
    width: theme.touchTarget.min,
    height: theme.touchTarget.min,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  question: { ...theme.textStyles.bodyStrong, color: theme.colors.ink },
  meta: { ...theme.textStyles.caption, color: theme.colors.muted },
  menu: {
    width: theme.touchTarget.comfortable,
    height: theme.touchTarget.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { ...theme.textStyles.callout, color: theme.colors.muted },
  adds: { flexDirection: 'row', gap: theme.spacing.sm },
  add: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    minHeight: theme.touchTarget.min,
    borderWidth: theme.borderWidth.thick,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
  },
  addText: { ...theme.textStyles.calloutStrong, color: theme.colors.brand },
});
