import Ionicons from '@expo/vector-icons/Ionicons';
import { RULES } from '@perspective/contracts';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { IconButton } from '../../components/ui/IconButton';
import { useAudioPlayer } from '../../components/profile/useAudioPlayer';
import type { PickedMedia, Recording } from '../../lib/media';
import { theme } from '../../theme';

const RING = 200;
const RADIUS = 92;

interface StepVoiceProps {
  /** The card so far, so it is clear the voice note joins it rather than replacing it. */
  photo?: PickedMedia | null;
  prompt: string;
  recording: Recording | null;
  isRecording: boolean;
  elapsed: number;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

export function StepVoice({
  photo,
  prompt,
  recording,
  isRecording,
  elapsed,
  error,
  onStart,
  onStop,
  onReset,
}: StepVoiceProps) {
  const player = useAudioPlayer(recording?.uri ?? '');
  const left = Math.max(0, Math.ceil(RULES.audioMaxSeconds - elapsed));
  const fraction = Math.min(1, elapsed / RULES.audioMaxSeconds);
  const circumference = 2 * Math.PI * RADIUS;

  return (
    <>
      {photo || prompt ? (
        <View style={s.preview}>
          <View style={s.previewTop}>
            {photo ? (
              <Image source={{ uri: photo.uri }} style={s.thumb} accessibilityIgnoresInvertColors />
            ) : null}
            <Text style={s.previewPrompt} numberOfLines={3}>
              {`“${prompt}”`}
            </Text>
          </View>
          <View style={s.previewFoot}>
            <Ionicons name="mic-outline" size={theme.iconSize.base} color={theme.editorial.colors.accent} />
            <Text style={s.previewFootText}>
              {recording ? 'Your voice is on this card' : 'Your voice will be added here'}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={s.stage}>
        {isRecording ? (
          <>
            <View style={s.ring}>
              <View style={[s.ringTrack, { borderColor: theme.editorial.colors.line }]} />
              <View
                style={[
                  s.ringFill,
                  {
                    borderColor: theme.editorial.colors.accent,
                    // A quarter-turn per quarter elapsed keeps this honest without SVG.
                    transform: [{ rotate: `${fraction * 360}deg` }],
                  },
                ]}
              />
              <Pressable
                onPress={onStop}
                accessibilityRole="button"
                accessibilityLabel="Stop recording"
                style={({ pressed }) => [s.stop, pressed && s.pressed]}
              >
                <View style={s.stopSquare} />
              </Pressable>
            </View>
            <Text style={s.timer}>{`0:${String(Math.floor(elapsed)).padStart(2, '0')}`}</Text>
            <View style={s.liveRow}>
              <View style={s.liveDot} />
              <Text style={s.hint}>{`${left} seconds left`}</Text>
            </View>
          </>
        ) : recording ? (
          <View style={s.playback}>
            <IconButton
              icon={player.playing ? 'pause' : 'play'}
              onPress={() => void player.toggle()}
              accessibilityLabel={player.playing ? 'Pause' : 'Play your voice note'}
              size="small"
              tone="brand"
            />
            <View style={s.track}>
              <View style={[s.trackFill, { width: `${Math.round(player.progress * 100)}%` }]} />
            </View>
            <Text style={s.duration}>{`${recording.durationSec.toFixed(0)}s`}</Text>
          </View>
        ) : (
          <>
            <Pressable
              onPress={onStart}
              accessibilityRole="button"
              accessibilityLabel="Start recording"
              style={({ pressed }) => [s.mic, pressed && s.pressed]}
            >
              <Ionicons name="mic" size={theme.iconSize.display - 8} color={theme.editorial.colors.onInk} />
            </Pressable>
            <Text style={s.micLabel}>Tap to record</Text>
            <Text style={s.hint}>{`Up to ${RULES.audioMaxSeconds} seconds`}</Text>
          </>
        )}
      </View>

      {recording && !isRecording ? (
        <Pressable
          onPress={() => {
            player.pause();
            onReset();
          }}
          accessibilityRole="button"
          accessibilityLabel="Record it again"
          style={({ pressed }) => [s.redo, pressed && s.pressed]}
        >
          <Ionicons name="refresh" size={theme.iconSize.base} color={theme.editorial.colors.ink} />
          <Text style={s.redoText}>Record it again</Text>
        </Pressable>
      ) : null}

      {error ? <Text style={s.error}>{error}</Text> : null}
    </>
  );
}

const s = StyleSheet.create({
  preview: {
    backgroundColor: theme.editorial.colors.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.editorial.colors.line,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
  },
  previewTop: { flexDirection: 'row', gap: theme.spacing.md, padding: theme.spacing.md, alignItems: 'center' },
  thumb: { width: 58, height: 72, borderRadius: theme.radius.sm, backgroundColor: theme.editorial.colors.sand },
  previewPrompt: { ...theme.editorialText.callout, color: theme.editorial.colors.ink, flex: 1 },
  previewFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.editorial.colors.sand,
  },
  previewFootText: { ...theme.editorialText.calloutStrong, color: theme.editorial.colors.ink },
  stage: { alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.xl },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ringTrack: { ...StyleSheet.absoluteFill, borderRadius: RING / 2, borderWidth: 6 },
  ringFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: RING / 2,
    borderWidth: 6,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  stop: {
    width: 104,
    height: 104,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.editorial.colors.accentText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSquare: { width: 34, height: 34, borderRadius: theme.radius.sm, backgroundColor: theme.editorial.colors.onInk },
  pressed: { opacity: theme.opacity.pressed },
  timer: {
    ...theme.editorialText.display,
    color: theme.editorial.colors.ink,
    fontVariant: ['tabular-nums'],
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  liveDot: { width: 9, height: 9, borderRadius: theme.radius.pill, backgroundColor: theme.editorial.colors.accentText },
  mic: {
    width: 104,
    height: 104,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.editorial.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.elevation.float,
  },
  micLabel: { ...theme.editorialText.bodyStrong, color: theme.editorial.colors.ink },
  hint: { ...theme.editorialText.callout, color: theme.editorial.colors.muted },
  playback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    width: '100%',
    padding: theme.spacing.base,
    backgroundColor: theme.editorial.colors.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.editorial.colors.line,
    borderRadius: theme.radius.card,
  },
  track: { flex: 1, height: 6, borderRadius: theme.radius.pill, backgroundColor: theme.editorial.colors.sand },
  trackFill: { height: 6, borderRadius: theme.radius.pill, backgroundColor: theme.editorial.colors.accent },
  duration: { ...theme.editorialText.callout, color: theme.editorial.colors.muted, minWidth: 32, textAlign: 'right' },
  redo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.touchTarget.min,
  },
  redoText: { ...theme.editorialText.calloutStrong, fontSize: theme.typography.fontSize.base, color: theme.editorial.colors.ink },
  error: { ...theme.editorialText.callout, color: theme.editorial.colors.accentText, textAlign: 'center' },
});
