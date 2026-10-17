import Ionicons from '@expo/vector-icons/Ionicons';
import { CATEGORY_CATALOG, Post } from '@perspective/contracts';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../../api/client';
import { formatDuration } from '../../lib/labels';
import { theme } from '../../theme';

interface PhotoGridReorderProps {
  photos?: Post[];
  posts?: Post[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAddPhoto?: (isPrimary: boolean) => void;
  onAddSlot?: (slotIdx: number, isPrimary: boolean) => void;
  onEditPrompt: (post: Post) => void;
  onRemovePhoto: (post: Post) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const TOTAL_SLOTS = 6;
const PADDING = theme.spacing.base; // 16
const GAP = 10;
const screenWidth = Dimensions.get('window').width;
const GRID_WIDTH = screenWidth - PADDING * 2;
const ITEM_WIDTH = Math.floor((GRID_WIDTH - GAP * 2) / 3);
const ITEM_HEIGHT = Math.floor(ITEM_WIDTH * 1.32);

export function PhotoGridReorder({
  photos,
  posts,
  onReorder,
  onAddPhoto,
  onAddSlot,
  onEditPrompt,
  onRemovePhoto,
  onDragStart,
  onDragEnd,
}: PhotoGridReorderProps) {
  const items = posts ?? photos ?? [];
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Active photo showing the 2-second switch arrows
  const [activeArrowSlot, setActiveArrowSlot] = useState<number | null>(null);
  const arrowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arrowOpacity = useRef(new Animated.Value(0)).current;

  const pan = useRef(new Animated.ValueXY()).current;
  const draggingIndexRef = useRef<number | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
  const itemsCountRef = useRef(items.length);
  itemsCountRef.current = items.length;

  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  // Show switch arrow marks for 2 seconds and auto-dismiss
  const showArrowsForSlot = (slotIdx: number) => {
    if (arrowTimerRef.current) {
      clearTimeout(arrowTimerRef.current);
    }
    setActiveArrowSlot(slotIdx);
    Animated.timing(arrowOpacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();

    arrowTimerRef.current = setTimeout(() => {
      Animated.timing(arrowOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setActiveArrowSlot(null);
      });
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (arrowTimerRef.current) {
        clearTimeout(arrowTimerRef.current);
      }
    };
  }, []);

  const handleSwapWithPrevious = (idx: number) => {
    if (idx > 0) {
      onReorderRef.current(idx, idx - 1);
      // Keep switch arrows active on the photo at its new left slot for 2 more seconds
      showArrowsForSlot(idx - 1);
    }
  };

  const handleSwapWithNext = (idx: number) => {
    if (idx < items.length - 1) {
      onReorderRef.current(idx, idx + 1);
      // Keep switch arrows active on the photo at its new right slot for 2 more seconds
      showArrowsForSlot(idx + 1);
    }
  };

  // Stable pan responder per item slot for drag-and-drop
  const panResponders = useRef<Record<number, ReturnType<typeof PanResponder.create>>>({}).current;

  const getPanResponder = (slotIndex: number) => {
    if (!panResponders[slotIndex]) {
      panResponders[slotIndex] = PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => {
          return Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10;
        },
        onMoveShouldSetPanResponderCapture: (_, gesture) => {
          return Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10;
        },
        onPanResponderGrant: () => {
          // Clear any active arrow timer while dragging
          if (arrowTimerRef.current) clearTimeout(arrowTimerRef.current);
          setActiveArrowSlot(null);

          draggingIndexRef.current = slotIndex;
          hoverIndexRef.current = slotIndex;
          setDraggingIndex(slotIndex);
          setHoverIndex(slotIndex);
          pan.setValue({ x: 0, y: 0 });
          onDragStart?.();
        },
        onPanResponderMove: (_, gesture) => {
          pan.setValue({ x: gesture.dx, y: gesture.dy });

          const currentCol = slotIndex % 3;
          const currentRow = Math.floor(slotIndex / 3);

          const currentX = currentCol * (ITEM_WIDTH + GAP);
          const currentY = currentRow * (ITEM_HEIGHT + GAP);

          const centerX = currentX + gesture.dx + ITEM_WIDTH / 2;
          const centerY = currentY + gesture.dy + ITEM_HEIGHT / 2;

          const targetCol = Math.min(2, Math.max(0, Math.floor(centerX / (ITEM_WIDTH + GAP))));
          const targetRow = Math.min(1, Math.max(0, Math.floor(centerY / (ITEM_HEIGHT + GAP))));

          const targetSlot = targetRow * 3 + targetCol;
          const validSlot = Math.min(itemsCountRef.current - 1, Math.max(0, targetSlot));

          if (hoverIndexRef.current !== validSlot) {
            hoverIndexRef.current = validSlot;
            setHoverIndex(validSlot);
          }
        },
        onPanResponderRelease: () => {
          const fromIdx = draggingIndexRef.current;
          const toIdx = hoverIndexRef.current;

          if (fromIdx !== null && toIdx !== null && fromIdx !== toIdx) {
            onReorderRef.current(fromIdx, toIdx);
            showArrowsForSlot(toIdx);
          }

          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            tension: 40,
            useNativeDriver: false,
          }).start(() => {
            setDraggingIndex(null);
            setHoverIndex(null);
            draggingIndexRef.current = null;
            hoverIndexRef.current = null;
            onDragEnd?.();
          });
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderTerminate: () => {
          const fromIdx = draggingIndexRef.current;
          const toIdx = hoverIndexRef.current;

          if (fromIdx !== null && toIdx !== null && fromIdx !== toIdx) {
            onReorderRef.current(fromIdx, toIdx);
          }

          setDraggingIndex(null);
          setHoverIndex(null);
          draggingIndexRef.current = null;
          hoverIndexRef.current = null;
          pan.setValue({ x: 0, y: 0 });
          onDragEnd?.();
        },
        onShouldBlockNativeResponder: () => true,
      });
    }
    return panResponders[slotIndex];
  };

  return (
    <View style={s.container}>
      <View style={s.grid}>
        {Array.from({ length: TOTAL_SLOTS }).map((_, slotIdx) => {
          const post = items[slotIdx];
          const isDragging = draggingIndex === slotIdx;
          const isHovered = hoverIndex === slotIdx && draggingIndex !== slotIdx && draggingIndex !== null;
          const isShowingArrows = activeArrowSlot === slotIdx;

          if (post) {
            const responder = getPanResponder(slotIdx);
            const isTopPhoto = slotIdx === 0;

            return (
              <Animated.View
                key={post.id}
                style={[
                  s.itemContainer,
                  isHovered && s.itemHovered,
                  isDragging && [
                    s.itemDragging,
                    {
                      transform: [
                        { translateX: pan.x },
                        { translateY: pan.y },
                        { scale: 1.08 },
                      ],
                    },
                  ],
                ]}
                {...responder.panHandlers}
              >
                {/* 1. Main Card Visuals based on kind */}
                {post.kind === 'photo' ? (
                  <Image
                    source={{ uri: post.mediaUrl ? api.mediaUrl(post.mediaUrl) : '' }}
                    style={s.photo}
                  />
                ) : post.kind === 'audio' ? (
                  <View style={s.audioGridCard}>
                    <View style={s.audioGridTop}>
                      <View style={s.audioPillBadge}>
                        <Ionicons name="mic" size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
                        <Text style={s.audioPillBadgeText}>VOICE</Text>
                      </View>
                      <Text style={s.audioDurationBadge}>
                        {formatDuration(post.audioDurationSec ?? post.durationSec ?? 0)}
                      </Text>
                    </View>

                    <View style={s.audioGridCenterIcon}>
                      <View style={s.audioMicCircle}>
                        <Ionicons name="mic" size={24} color="#FFFFFF" />
                      </View>
                    </View>

                    <Pressable
                      style={s.audioGridFooter}
                      onPress={() => onEditPrompt(post)}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit voice perspective: ${post.prompt}`}
                    >
                      <Text style={s.audioGridPrompt} numberOfLines={3}>
                        "{post.prompt}"
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={s.textGridCard}>
                    <View style={s.textGridTop}>
                      <View style={s.writtenPillBadge}>
                        <Text style={s.writtenPillBadgeText}>
                          {CATEGORY_CATALOG[post.category]?.label.toUpperCase() || 'WRITTEN'}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      style={s.textGridCenter}
                      onPress={() => onEditPrompt(post)}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit written perspective: ${post.prompt}`}
                    >
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={18}
                        color={theme.colors.brand}
                        style={{ marginBottom: 4 }}
                      />
                      <Text style={s.textGridPrompt} numberOfLines={3}>
                        "{post.prompt}"
                      </Text>
                    </Pressable>

                    <View style={s.textGridFooter}>
                      <Text style={s.textGridTag} numberOfLines={1}>
                        {post.focusAreas && post.focusAreas[0] ? `#${post.focusAreas[0]}` : 'Written'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Card Tap Target: triggers the 2-second switch arrows */}
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => showArrowsForSlot(slotIdx)}
                  accessibilityRole="button"
                  accessibilityLabel={`${post.kind === 'photo' ? 'Photo' : post.kind === 'audio' ? 'Voice perspective' : 'Written perspective'} ${slotIdx + 1}${isTopPhoto ? ', Top item' : ''}. Tap to switch or rearrange.`}
                />

                {/* Top Overlay: Mic Indicator & Remove "✕" Button */}
                <View style={s.topControlsBar} pointerEvents="box-none">
                  {post.kind === 'photo' && post.audioMediaUrl ? (
                    <View style={s.micBadge} accessibilityLabel="Voice perspective attached">
                      <Ionicons name="mic" size={11} color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}
                  <Pressable
                    style={s.removeBtn}
                    hitSlop={10}
                    onPress={() => onRemovePhoto(post)}
                    accessibilityRole="button"
                    accessibilityLabel="Remove item"
                  >
                    <Ionicons name="close" size={13} color="#FFFFFF" />
                  </Pressable>
                </View>

                {/* 2-Second Center Switch Arrow Marks */}
                {isShowingArrows ? (
                  <Animated.View
                    style={[s.centerSwitchOverlay, { opacity: arrowOpacity }]}
                    pointerEvents="box-none"
                  >
                    <View style={s.arrowMarksPill}>
                      {slotIdx > 0 ? (
                        <Pressable
                          style={s.arrowButton}
                          hitSlop={8}
                          onPress={() => handleSwapWithPrevious(slotIdx)}
                          accessibilityRole="button"
                          accessibilityLabel="Shift item left"
                        >
                          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                        </Pressable>
                      ) : null}

                      {slotIdx < items.length - 1 ? (
                        <Pressable
                          style={s.arrowButton}
                          hitSlop={8}
                          onPress={() => handleSwapWithNext(slotIdx)}
                          accessibilityRole="button"
                          accessibilityLabel="Shift item right"
                        >
                          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                        </Pressable>
                      ) : null}
                    </View>
                  </Animated.View>
                ) : null}

                {/* Drag Target Highlight Overlay */}
                {isHovered ? (
                  <View style={s.swapOverlay}>
                    <Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />
                    <Text style={s.swapOverlayText}>Swap</Text>
                  </View>
                ) : null}

                {/* Bottom Overlay: Badge + Question Snippet (for photo posts) */}
                {post.kind === 'photo' ? (
                  <View style={s.bottomBadgeContainer} pointerEvents="box-none">
                    <Pressable
                      style={s.promptOverlayCard}
                      onPress={() => onEditPrompt(post)}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit perspective: ${post.prompt}`}
                    >
                      <View style={s.badgePillRow}>
                        {post.audioMediaUrl ? (
                          <View style={[s.pillBadge, s.voiceBadge]}>
                            <Ionicons name="mic" size={10} color="#FFFFFF" style={{ marginRight: 2 }} />
                            <Text style={s.pillBadgeText}>
                              {isTopPhoto ? 'Voice • Top' : 'Voice'}
                            </Text>
                          </View>
                        ) : isTopPhoto ? (
                          <View style={[s.pillBadge, s.topPhotoBadge]}>
                            <Ionicons name="star" size={10} color="#FFFFFF" style={{ marginRight: 2 }} />
                            <Text style={s.topPhotoText}>Top</Text>
                          </View>
                        ) : (
                          <View style={[s.pillBadge, s.promptBadge]}>
                            <Text style={s.pillBadgeText}>Perspective</Text>
                          </View>
                        )}
                      </View>
                      {post.prompt ? (
                        <Text style={s.gridPromptSnippet} numberOfLines={2}>
                          "{post.prompt}"
                        </Text>
                      ) : null}
                    </Pressable>
                  </View>
                ) : null}
              </Animated.View>
            );
          }

          // Empty Slot (Preserved Hinge style)
          return (
            <Pressable
              key={`empty-${slotIdx}`}
              style={[
                s.itemContainer,
                s.emptySlot,
                hoverIndex === slotIdx && draggingIndex !== null && s.emptySlotHovered,
              ]}
              onPress={() => {
                if (onAddSlot) {
                  onAddSlot(slotIdx, slotIdx === 0);
                } else if (onAddPhoto) {
                  onAddPhoto(slotIdx === 0);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`Add to slot ${slotIdx + 1}`}
            >
              <View style={s.addCircle}>
                <Ionicons name="add" size={24} color={theme.colors.muted} />
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={s.hintText}>Tap a card to switch with arrows, or drag to reorder</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    borderRadius: theme.radius.media,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radius.media,
    backgroundColor: theme.colors.surfaceMuted,
  },
  emptySlot: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderRadius: theme.radius.media,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotHovered: {
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.brandSoft,
  },
  addCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topControlsBar: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 10,
  },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(23, 23, 27, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSwitchOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  arrowMarksPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(23, 23, 27, 0.88)',
    borderRadius: 22,
    paddingHorizontal: 6,
    paddingVertical: 5,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  arrowButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(91, 75, 219, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
    borderRadius: theme.radius.media,
  },
  swapOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  bottomBadgeContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  promptOverlayCard: {
    backgroundColor: 'rgba(23, 23, 27, 0.78)',
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderBottomLeftRadius: theme.radius.media,
    borderBottomRightRadius: theme.radius.media,
    gap: 3,
  },
  badgePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridPromptSnippet: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '600',
    lineHeight: 12,
  },
  micBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  voiceBadge: {
    backgroundColor: theme.colors.brand,
  },
  topPhotoBadge: {
    backgroundColor: '#17171B',
  },
  promptBadge: {
    backgroundColor: 'rgba(23, 23, 27, 0.85)',
  },
  addPromptBadge: {
    backgroundColor: 'rgba(91, 75, 219, 0.9)',
  },
  topPhotoText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  pillBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  itemDragging: {
    zIndex: 999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 14,
  },
  itemHovered: {
    borderColor: theme.colors.brand,
    borderWidth: 2.5,
  },
  hintText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  audioGridCard: {
    width: '100%',
    height: '100%',
    backgroundColor: '#26164A',
    borderRadius: theme.radius.media,
    padding: 8,
    justifyContent: 'space-between',
  },
  audioGridTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 26,
  },
  audioPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  audioPillBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  audioDurationBadge: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 9,
    fontWeight: '600',
  },
  audioGridCenterIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  audioMicCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(91, 75, 219, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  audioGridFooter: {
    backgroundColor: 'rgba(15, 10, 35, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  audioGridPrompt: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '600',
    lineHeight: 12.5,
  },
  textGridCard: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.media,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: 8,
    justifyContent: 'space-between',
  },
  textGridTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 26,
  },
  writtenPillBadge: {
    backgroundColor: theme.colors.brandSoft,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  writtenPillBadgeText: {
    color: theme.colors.brand,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textGridCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    marginVertical: 2,
  },
  textGridPrompt: {
    color: theme.colors.ink,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
    textAlign: 'center',
  },
  textGridFooter: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  textGridTag: {
    color: theme.colors.muted,
    fontSize: 8.5,
    fontWeight: '700',
  },
});
