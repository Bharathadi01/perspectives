import Ionicons from '@expo/vector-icons/Ionicons';
import { CATEGORY_CATALOG, type Post } from '@perspective/contracts';
import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { formatDuration } from '../../lib/labels';
import { theme } from '../../theme';
import { IconButton } from '../ui/IconButton';
import { useAudioPlayer } from './useAudioPlayer';

interface PostCardProps {
  post: Post;
  /** Shown as the round action on the card. Omit for read-only (your own profile). */
  onGive?: () => void;
  alreadyGiven?: boolean;
}

function GiveAction({ onGive, alreadyGiven, prompt }: { onGive: () => void; alreadyGiven?: boolean; prompt: string }) {
  return (
    <IconButton
      icon={alreadyGiven ? 'checkmark' : 'chatbubble-ellipses-outline'}
      tone={alreadyGiven ? 'dark' : 'light'}
      size="small"
      disabled={alreadyGiven}
      onPress={onGive}
      accessibilityLabel={alreadyGiven ? `You already gave a perspective on: ${prompt}` : `Give perspective on: ${prompt}`}
      style={s.action}
    />
  );
}

/** Full-width photo with prompt or interactive voice player caption beneath it. */
export function PhotoPostCard({ post, onGive, alreadyGiven }: PostCardProps) {
  const hasVoice = !!post.audioMediaUrl;
  const player = useAudioPlayer(post.audioMediaUrl ? api.mediaUrl(post.audioMediaUrl) : '');

  return (
    <View style={s.photoCard}>
      <Image
        source={{ uri: post.mediaUrl ? api.mediaUrl(post.mediaUrl) : '' }}
        style={s.photo}
        resizeMode="cover"
        accessibilityLabel={`Photo: ${post.prompt}`}
        accessibilityIgnoresInvertColors
      />
      {hasVoice ? (
        <View style={s.voiceCaption}>
          <View style={s.voiceCaptionHeader}>
            <View style={s.voiceBadgePill}>
              <Ionicons name="mic" size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
              <Text style={s.voiceBadgeText}>VOICE PERSPECTIVE</Text>
            </View>
            <Text style={s.voiceCaptionDuration}>
              {formatDuration(post.audioDurationSec ?? post.durationSec ?? 0)}
            </Text>
          </View>

          <Text style={s.voiceCaptionPrompt}>"{post.prompt}"</Text>

          <View style={s.voicePlayerRow}>
            <IconButton
              icon={player.playing ? 'pause' : 'play'}
              tone="brand"
              size="small"
              onPress={() => void player.toggle()}
              accessibilityLabel={player.playing ? 'Pause voice perspective' : 'Play voice perspective'}
            />
            <Waveform seed={post.id} progress={player.progress} />
            <Text style={s.duration}>{formatDuration(post.audioDurationSec ?? post.durationSec)}</Text>
            {onGive ? (
              <IconButton
                icon={alreadyGiven ? 'checkmark' : 'chatbubble-ellipses-outline'}
                tone={alreadyGiven ? 'dark' : 'brand'}
                size="small"
                disabled={alreadyGiven}
                onPress={onGive}
                accessibilityLabel={alreadyGiven ? `You already gave a perspective on: ${post.prompt}` : `Give perspective on: ${post.prompt}`}
              />
            ) : null}
          </View>
          {player.error ? <Text style={s.error}>{player.error}</Text> : null}
        </View>
      ) : (
        <>
          <View style={s.overlay} pointerEvents="none">
            {post.category ? (
              <Text style={s.categoryBadge}>{CATEGORY_CATALOG[post.category]?.label.toUpperCase()}</Text>
            ) : null}
            <Text style={s.overlayText}>{post.prompt}</Text>
          </View>
          {onGive ? <GiveAction onGive={onGive} alreadyGiven={alreadyGiven} prompt={post.prompt} /> : null}
        </>
      )}
    </View>
  );
}

/** Bars for a voice clip; `colors` lets the editorial Explore card use its own palette. */
export function Waveform({ seed, progress, colors }: { seed: string; progress: number; colors?: { played: string; rest: string } }) {
  const bars = useMemo(() => {
    let h = 0;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return Array.from({ length: 36 }, (_, i) => {
      h = (h * 1103515245 + 12345) >>> 0;
      const wave = Math.sin(i / 3) * 0.3 + 0.55;
      return Math.max(0.15, Math.min(1, wave + ((h % 100) / 100 - 0.5) * 0.6));
    });
  }, [seed]);
  return (
    <View style={s.wave} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {bars.map((b, i) => (
        <View
          key={i}
          style={[
            s.bar,
            { height: 6 + b * 26 },
            colors && { backgroundColor: colors.rest },
            i / bars.length <= progress && (colors ? { backgroundColor: colors.played } : s.barPlayed),
          ]}
        />
      ))}
    </View>
  );
}

/** Voice post: prompt, play button and waveform. */
export function AudioPostCard({ post, onGive, alreadyGiven }: PostCardProps) {
  const player = useAudioPlayer(post.mediaUrl ? api.mediaUrl(post.mediaUrl) : '');
  return (
    <View style={s.audioCard}>
      <Text style={s.audioPrompt}>{post.prompt}</Text>
      <View style={s.audioRow}>
        <IconButton
          icon={player.playing ? 'pause' : 'play'}
          tone="brand"
          size="small"
          onPress={() => void player.toggle()}
          accessibilityLabel={player.playing ? 'Pause voice post' : `Play voice post, ${Math.round(post.durationSec ?? 0)} seconds`}
        />
        <Waveform seed={post.id} progress={player.progress} />
        <Text style={s.duration}>{formatDuration(post.durationSec)}</Text>
      </View>
      {onGive ? <GiveAction onGive={onGive} alreadyGiven={alreadyGiven} prompt={post.prompt} /> : null}
    </View>
  );
}

/** Standalone written perspective card without a photo. */
export function TextPostCard({ post, onGive, alreadyGiven }: PostCardProps) {
  return (
    <View style={s.textCard}>
      <View style={s.textCardHeader}>
        <View style={s.writtenBadgePill}>
          <Text style={s.writtenBadgeText}>
            {CATEGORY_CATALOG[post.category]?.label.toUpperCase() || 'WRITTEN PERSPECTIVE'}
          </Text>
        </View>
      </View>

      <Text style={s.textCardPrompt}>"{post.prompt}"</Text>

      {post.focusAreas && post.focusAreas.length > 0 && (
        <View style={s.focusChipsRow}>
          {post.focusAreas.map((f) => (
            <View key={f} style={s.focusChip}>
              <Text style={s.focusChipText}>#{f}</Text>
            </View>
          ))}
        </View>
      )}

      {onGive ? <GiveAction onGive={onGive} alreadyGiven={alreadyGiven} prompt={post.prompt} /> : null}
    </View>
  );
}

export function PostCard(props: PostCardProps) {
  if (props.post.kind === 'photo') return <PhotoPostCard {...props} />;
  if (props.post.kind === 'audio') return <AudioPostCard {...props} />;
  return <TextPostCard {...props} />;
}

const s = StyleSheet.create({
  photoCard: { borderRadius: theme.radius.media, overflow: 'hidden', backgroundColor: theme.colors.surfaceMuted },
  photo: { width: '100%', aspectRatio: 4 / 5 },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.base,
    paddingRight: 72,
    backgroundColor: theme.colors.photoScrim,
  },
  overlayText: {
    color: theme.colors.onDark,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  categoryBadge: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  action: { position: 'absolute', right: theme.spacing.md, bottom: theme.spacing.md },
  audioCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.media,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl + theme.spacing.sm,
    gap: theme.spacing.base,
  },
  audioPrompt: { fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.ink },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 36 },
  bar: { width: 3, borderRadius: 2, backgroundColor: theme.colors.brandSoft },
  barPlayed: { backgroundColor: theme.colors.brand },
  duration: { fontSize: theme.typography.fontSize.xs, color: theme.colors.muted, minWidth: 30 },
  error: { fontSize: theme.typography.fontSize.xs, color: theme.colors.danger },
  voiceCaption: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.base,
    paddingBottom: theme.spacing.base,
    gap: theme.spacing.xs,
    borderBottomLeftRadius: theme.radius.media,
    borderBottomRightRadius: theme.radius.media,
  },
  voiceCaptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  voiceBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  voiceBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  voiceCaptionDuration: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
  },
  voiceCaptionPrompt: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.ink,
    marginVertical: 2,
  },
  voicePlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginTop: 2,
  },
  textCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.media,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl + theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  textCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  writtenBadgePill: {
    backgroundColor: theme.colors.brandSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  writtenBadgeText: {
    color: theme.colors.brand,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textCardPrompt: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.ink,
    lineHeight: 26,
  },
  focusChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  focusChip: {
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  focusChipText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    fontWeight: '600',
  },
});
