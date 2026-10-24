import Ionicons from '@expo/vector-icons/Ionicons';
import type { Post } from '@perspective/contracts';
import React, { useMemo, useState } from 'react';
import {
  AccessibilityActionEvent,
  Animated,
  Image,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { api } from '../../api/client';
import { theme } from '../../theme';
import { GRID, dropTarget, gridGeometry } from './grid';
import { useLiftDrag } from './useLiftDrag';
import { VoiceChip } from './VoiceChip';

interface PhotoGridProps {
  /** Photos only, in profile order. Voice and written cards are listed under the grid. */
  photos: readonly Post[];
  playingId: string | null;
  onPlay: (postId: string) => void;
  onEdit: (post: Post) => void;
  onActions: (post: Post) => void;
  onAdd: () => void;
  /** Places still free. Voice and written cards use places too, so this can be less than the empty tiles. */
  free: number;
  onFull: () => void;
  /** Grid places, not profile positions. */
  onSwap: (from: number, to: number) => void;
  /** The screen must stop scrolling while a card is lifted, or the drag fights the scroll. */
  onDraggingChange: (dragging: boolean) => void;
}

/**
 * Your photos: six places, three to a row in two rows.
 *
 * Only photos live here. A voice or written card has no picture, so a tile for
 * it would be a box with a button or a few squeezed words in it; those cards
 * are listed under the grid instead, where their questions can be read.
 *
 * A card lifts only after you hold it, so a stray finger never starts a drag.
 * Drop a card on another and they swap; the card's menu and the screen
 * reader's actions do the same without dragging.
 */
export function PhotoGrid({
  photos: posts,
  playingId,
  onPlay,
  onEdit,
  onActions,
  onAdd,
  free,
  onFull,
  onSwap,
  onDraggingChange,
}: PhotoGridProps) {
  const window = useWindowDimensions();
  const [width, setWidth] = useState(window.width - theme.spacing.base * 2);
  const geom = useMemo(() => gridGeometry(width), [width]);
  const { lifted, isTarget: targeted, pan, scale, lift, letGo, responderFor } = useLiftDrag({
    targetFor: (from, dx, dy) => dropTarget(geom, from, dx, dy, posts.length),
    onDrop: onSwap,
    onDraggingChange,
  });

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const tileSize = { width: geom.columnWidth, height: geom.tileHeight };

  return (
    <View style={s.grid} onLayout={onLayout}>
      {Array.from({ length: GRID.slots }, (_, index) => {
        const post = posts[index];

        if (!post) {
          const canAdd = index < posts.length + free;
          const next = canAdd && index === posts.length;
          return (
            <Pressable
              key={`empty-${index}`}
              onPress={canAdd ? onAdd : onFull}
              accessibilityRole="button"
              accessibilityLabel={canAdd ? `Empty place ${index + 1}. Add a photo` : 'Taken by a voice or written card'}
              style={({ pressed }) => [s.tile, tileSize, next ? s.addNext : s.addLater, pressed && s.pressed]}
            >
              {canAdd ? (
                <View style={[s.addCircle, next ? s.addCircleNext : s.addCircleLater]}>
                  <Ionicons
                    name="add"
                    size={next ? theme.iconSize.xl : theme.iconSize.lg}
                    color={next ? theme.colors.onDark : theme.colors.muted}
                  />
                </View>
              ) : null}
              {next ? <Text style={s.addLabel}>Add</Text> : null}
            </Pressable>
          );
        }

        const isLifted = lifted === index;
        const isTarget = targeted(index);
        const voicePath = post.audioMediaUrl;

        const actions = [
          ...(index > 0 ? [{ name: 'moveEarlier', label: 'Move earlier' }] : []),
          ...(index < posts.length - 1 ? [{ name: 'moveLater', label: 'Move later' }] : []),
          { name: 'options', label: 'Card options' },
        ];
        const onAction = (e: AccessibilityActionEvent) => {
          if (e.nativeEvent.actionName === 'moveEarlier') onSwap(index, index - 1);
          else if (e.nativeEvent.actionName === 'moveLater') onSwap(index, index + 1);
          else if (e.nativeEvent.actionName === 'options') onActions(post);
        };

        return (
          <Animated.View
            key={post.id}
            {...responderFor(index).panHandlers}
            style={[
              tileSize,
              isLifted && s.liftedCell,
              isLifted && {
                transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }],
              },
            ]}
          >
            <Pressable
              onPress={() => onEdit(post)}
              onLongPress={() => lift(index)}
              delayLongPress={250}
              onPressOut={() => letGo(index)}
              accessibilityRole="button"
              accessibilityLabel={`Photo ${index + 1} of ${posts.length}${index === 0 ? ', leads your profile' : ''}${voicePath ? ', with a voice note' : ''}. ${post.prompt}`}
              accessibilityHint="Double tap to edit. Hold and drag onto another photo to swap."
              accessibilityActions={actions}
              onAccessibilityAction={onAction}
              style={[
                s.tile,
                tileSize,
                isLifted && s.tileLifted,
                isTarget && s.tileTarget,
              ]}
            >
              {post.mediaUrl ? (
                <Image
                  source={{ uri: api.mediaUrl(post.mediaUrl) }}
                  style={StyleSheet.absoluteFill}
                  accessibilityIgnoresInvertColors
                />
              ) : null}

              {index === 0 ? (
                <View style={[s.badge, s.lead]} pointerEvents="none">
                  <Ionicons name="star" size={theme.iconSize.xs} color={theme.colors.onDark} />
                </View>
              ) : null}

              <Pressable
                onPress={() => onActions(post)}
                accessibilityRole="button"
                accessibilityLabel="Card options"
                hitSlop={10}
                style={({ pressed }) => [s.badge, s.menu, pressed && s.pressed]}
              >
                <Ionicons name="ellipsis-horizontal" size={theme.iconSize.sm} color={theme.colors.onDark} />
              </Pressable>

              {voicePath ? (
                <View style={s.voiceOnPhoto} pointerEvents="box-none">
                  <VoiceChip
                    path={voicePath}
                    durationSec={post.audioDurationSec}
                    active={playingId === post.id}
                    onPlay={() => onPlay(post.id)}
                    variant="chip"
                  />
                </View>
              ) : null}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const BADGE = 26;

const s = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: GRID.gap,
    rowGap: GRID.gap,
  },
  pressed: { opacity: theme.opacity.pressed },
  liftedCell: { zIndex: 10 },
  tile: {
    borderRadius: theme.radius.media,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLifted: { ...theme.elevation.float },
  tileTarget: { borderWidth: theme.borderWidth.focus, borderColor: theme.colors.brand },
  badge: {
    position: 'absolute',
    top: theme.spacing.xs + 2,
    width: BADGE,
    height: BADGE,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lead: { left: theme.spacing.xs + 2, backgroundColor: theme.colors.brand },
  menu: { right: theme.spacing.xs + 2, backgroundColor: theme.colors.scrimMedia },
  voiceOnPhoto: {
    position: 'absolute',
    left: theme.spacing.xs + 2,
    bottom: theme.spacing.xs + 2,
  },
  addNext: {
    borderWidth: theme.borderWidth.thick,
    borderStyle: 'dashed',
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
  },
  addLater: {
    borderWidth: theme.borderWidth.thick,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
  },
  addCircle: { borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center' },
  addCircleNext: { width: 44, height: 44, backgroundColor: theme.colors.brand },
  addCircleLater: { width: 32, height: 32, backgroundColor: theme.colors.surfaceMuted },
  addLabel: { ...theme.textStyles.calloutStrong, color: theme.colors.brand },
});
