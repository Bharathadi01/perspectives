import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { useAudioPlayer } from '../../components/profile/useAudioPlayer';
import { formatDuration } from '../../lib/labels';
import { theme } from '../../theme';

interface VoiceStripProps {
  /** Storage path of the clip, as it comes on the post. */
  path: string;
  durationSec: number | null | undefined;
  /** Whether this strip owns playback right now. Only one clip plays at a time. */
  active: boolean;
  onPlay: () => void;
  /** 'inset' sits under a photo; 'plain' sits inside a compact card; 'bare' has no padding of its own. */
  variant?: 'inset' | 'plain' | 'bare';
}

/**
 * A voice note you can play without opening the card.
 *
 * Play is the one control; the bar and the time are what you read. There is no
 * waveform, because the app keeps no audio levels — bars drawn without them
 * would be decoration pretending to be the recording.
 */
export function VoiceStrip({ path, durationSec, active, onPlay, variant = 'inset' }: VoiceStripProps) {
  const player = useAudioPlayer(api.mediaUrl(path));

  // Another clip started: this one stops, so two voices never talk over each other.
  const { playing, pause } = player;
  useEffect(() => {
    if (!active && playing) pause();
  }, [active, playing, pause]);

  const total = durationSec ?? 0;
  const elapsed = player.progress * total;
  const started = player.playing || player.progress > 0;
  const time = started ? `${formatDuration(elapsed)} / ${formatDuration(total)}` : formatDuration(total);

  return (
    <View style={[s.strip, variant === 'inset' && s.inset, variant === 'plain' && s.plain]}>
      <Pressable
        onPress={() => {
          if (!player.playing) onPlay();
          void player.toggle();
        }}
        accessibilityRole="button"
        accessibilityLabel={player.playing ? 'Pause the voice note' : `Play the voice note, ${Math.round(total)} seconds`}
        hitSlop={8}
        style={({ pressed }) => [s.play, pressed && s.pressed]}
      >
        <Ionicons
          name={player.playing ? 'pause' : 'play'}
          size={theme.iconSize.md}
          color={theme.colors.onDark}
          style={player.playing ? undefined : s.playNudge}
        />
      </Pressable>

      <View
        style={s.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: Math.round(total), now: Math.round(elapsed) }}
      >
        <View style={[s.fill, { width: `${Math.round(player.progress * 100)}%` }]} />
      </View>

      <Text style={s.time}>{time}</Text>
      {player.error ? (
        <Ionicons name="alert-circle-outline" size={theme.iconSize.base} color={theme.colors.danger} />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  inset: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.brandSoft,
  },
  plain: { paddingTop: theme.spacing.sm },
  play: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The play triangle is optically left-heavy; a one-point nudge centres it.
  playNudge: { marginLeft: 2 },
  pressed: { opacity: theme.opacity.pressed },
  track: {
    flex: 1,
    height: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  fill: { height: 4, borderRadius: theme.radius.pill, backgroundColor: theme.colors.brand },
  time: {
    ...theme.textStyles.callout,
    color: theme.colors.ink,
    fontVariant: ['tabular-nums'],
    minWidth: 36,
    textAlign: 'right',
  },
});
