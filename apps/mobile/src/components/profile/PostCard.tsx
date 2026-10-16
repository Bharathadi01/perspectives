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

/** Full-width photo with the prompt over it. */
export function PhotoPostCard({ post, onGive, alreadyGiven }: PostCardProps) {
  return (
    <View style={s.photoCard}>
      <Image
        source={{ uri: api.mediaUrl(post.mediaUrl) }}
        style={s.photo}
        resizeMode="cover"
        accessibilityLabel={`Photo: ${post.prompt}`}
        accessibilityIgnoresInvertColors
      />
      <View style={s.overlay} pointerEvents="none">
        {post.category ? (
          <Text style={s.categoryBadge}>{CATEGORY_CATALOG[post.category]?.label.toUpperCase()}</Text>
        ) : null}
        <Text style={s.overlayText}>{post.prompt}</Text>
      </View>
      {onGive ? <GiveAction onGive={onGive} alreadyGiven={alreadyGiven} prompt={post.prompt} /> : null}
    </View>
  );
}

function Waveform({ seed, progress }: { seed: string; progress: number }) {
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
        <View key={i} style={[s.bar, { height: 6 + b * 26 }, i / bars.length <= progress && s.barPlayed]} />
      ))}
    </View>
  );
}

/** Voice post: prompt, play button and waveform. */
export function AudioPostCard({ post, onGive, alreadyGiven }: PostCardProps) {
  const player = useAudioPlayer(api.mediaUrl(post.mediaUrl));
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
      {player.error ? <Text style={s.error}>{player.error}</Text> : null}
      {onGive ? <GiveAction onGive={onGive} alreadyGiven={alreadyGiven} prompt={post.prompt} /> : null}
    </View>
  );
}

export function PostCard(props: PostCardProps) {
  return props.post.kind === 'photo' ? <PhotoPostCard {...props} /> : <AudioPostCard {...props} />;
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
});
