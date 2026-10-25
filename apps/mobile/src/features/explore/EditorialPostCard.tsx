import { CATEGORY_CATALOG, type Post } from '@perspective/contracts';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { api } from '../../api/client';
import { Waveform } from '../../components/profile/PostCard';
import { useAudioPlayer } from '../../components/profile/useAudioPlayer';
import { formatDuration } from '../../lib/labels';
import { theme } from '../../theme';
import { ChatCircleIcon, CheckIcon, PauseIcon, PlayIcon } from '../../components/ui/icons';

const e = theme.editorial;

interface Props {
  post: Post;
  onGive?: () => void;
  alreadyGiven?: boolean;
}

/** "Give a perspective" as a labelled pill; "Given" once answered. */
function GivePill({ onGive, alreadyGiven, prompt, style }: { onGive: () => void; alreadyGiven?: boolean; prompt: string; style?: ViewStyle }) {
  return (
    <Pressable
      onPress={onGive}
      disabled={alreadyGiven}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!alreadyGiven }}
      accessibilityLabel={alreadyGiven ? `You already gave a perspective on: ${prompt}` : `Give a perspective on: ${prompt}`}
      style={({ pressed }) => [s.pill, alreadyGiven && s.pillDone, pressed && s.pressed, style]}
    >
      {alreadyGiven ? <CheckIcon size={17} color={e.colors.ink} /> : <ChatCircleIcon size={18} color={e.colors.onInk} />}
      <Text style={[s.pillText, alreadyGiven && s.pillTextDone]}>{alreadyGiven ? 'Given' : 'Give a perspective'}</Text>
    </Pressable>
  );
}

/** Category overline and the question in italic display type. */
function Caption({ post, quoted }: { post: Post; quoted?: boolean }) {
  const category = CATEGORY_CATALOG[post.category]?.label;
  return (
    <View style={s.caption}>
      {category ? <Text style={s.overline}>{category.toUpperCase()}</Text> : null}
      <Text style={s.question}>{quoted ? `“${post.prompt}”` : post.prompt}</Text>
    </View>
  );
}

function VoiceRow({ uri, seed, durationSec }: { uri: string; seed: string; durationSec: number | null | undefined }) {
  const player = useAudioPlayer(uri);
  return (
    <View>
      <View style={s.voiceRow}>
        <Pressable
          onPress={() => void player.toggle()}
          accessibilityRole="button"
          accessibilityLabel={player.playing ? 'Pause voice clip' : `Play voice clip, ${Math.round(durationSec ?? 0)} seconds`}
          style={({ pressed }) => [s.play, pressed && s.pressed]}
        >
          {/* Filled glyphs read better inside the small round button than outlines. */}
          {player.playing ? <PauseIcon size={20} weight="fill" color={e.colors.onInk} /> : <PlayIcon size={20} weight="fill" color={e.colors.onInk} />}
        </Pressable>
        <Waveform seed={seed} progress={player.progress} colors={{ played: e.colors.wavePlayed, rest: e.colors.waveRest }} />
        <Text style={s.duration}>{formatDuration(durationSec ?? 0)}</Text>
      </View>
      {player.error ? <Text style={s.error}>{player.error}</Text> : null}
    </View>
  );
}

/**
 * Explore's post card in the editorial look (chosen 2026-10-25): the question sits above the photo
 * like a headline (moved above on 2026-10-25), and the photo carries a labelled give button.
 */
export function EditorialPostCard({ post, onGive, alreadyGiven }: Props) {
  if (post.kind === 'photo') {
    return (
      <View style={s.stack}>
        <Caption post={post} />
        <View style={s.photoWrap}>
          <Image
            source={{ uri: post.mediaUrl ? api.mediaUrl(post.mediaUrl) : '' }}
            style={s.photo}
            resizeMode="cover"
            accessibilityLabel={`Photo: ${post.prompt}`}
            accessibilityIgnoresInvertColors
          />
          {onGive ? <GivePill onGive={onGive} alreadyGiven={alreadyGiven} prompt={post.prompt} style={s.pillOnPhoto} /> : null}
        </View>
        {post.audioMediaUrl ? (
          <VoiceRow uri={api.mediaUrl(post.audioMediaUrl)} seed={post.id} durationSec={post.audioDurationSec ?? post.durationSec} />
        ) : null}
      </View>
    );
  }

  return (
    <View style={[s.card, s.stack]}>
      <Caption post={post} quoted={post.kind !== 'audio'} />
      {post.kind === 'audio' ? (
        <VoiceRow uri={post.mediaUrl ? api.mediaUrl(post.mediaUrl) : ''} seed={post.id} durationSec={post.durationSec} />
      ) : post.focusAreas && post.focusAreas.length > 0 ? (
        <View style={s.chips}>
          {post.focusAreas.map((f) => (
            <Text key={f} style={s.focus}>
              #{f}
            </Text>
          ))}
        </View>
      ) : null}
      {onGive ? <GivePill onGive={onGive} alreadyGiven={alreadyGiven} prompt={post.prompt} style={s.pillInCard} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  stack: { gap: theme.spacing.md },
  photoWrap: { borderRadius: 20, overflow: 'hidden', backgroundColor: e.colors.line },
  photo: { width: '100%', aspectRatio: 4 / 5 },
  card: {
    backgroundColor: e.colors.surface,
    borderRadius: 20,
    borderWidth: theme.borderWidth.hairline,
    borderColor: e.colors.line,
    padding: theme.spacing.base,
  },
  caption: { gap: theme.spacing.xs },
  overline: { fontFamily: e.fonts.bodySemibold, fontSize: 11, letterSpacing: 1.1, color: e.colors.muted },
  question: { fontFamily: e.fonts.displayItalic, fontSize: 23, lineHeight: 29, color: e.colors.ink },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.touchTarget.min - 4,
    paddingHorizontal: theme.spacing.base,
    borderRadius: theme.radius.pill,
    backgroundColor: e.colors.ink,
  },
  pillDone: { backgroundColor: e.colors.paper, borderWidth: theme.borderWidth.hairline, borderColor: e.colors.line },
  pillOnPhoto: { position: 'absolute', right: 14, bottom: 14 },
  pillInCard: { alignSelf: 'flex-start' },
  pillText: { fontFamily: e.fonts.bodySemibold, fontSize: 14, color: e.colors.onInk },
  pillTextDone: { color: e.colors.ink },
  pressed: { opacity: theme.opacity.pressed },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  play: {
    width: theme.touchTarget.min,
    height: theme.touchTarget.min,
    borderRadius: theme.touchTarget.min / 2,
    backgroundColor: e.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duration: { fontFamily: e.fonts.body, fontSize: 12, color: e.colors.muted, minWidth: 30 },
  error: { fontFamily: e.fonts.body, fontSize: 12, color: theme.colors.danger, marginTop: theme.spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  focus: { fontFamily: e.fonts.bodyMedium, fontSize: 13, color: e.colors.muted },
});
