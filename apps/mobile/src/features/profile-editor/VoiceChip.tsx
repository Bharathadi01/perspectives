import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { useAudioPlayer } from '../../components/profile/useAudioPlayer';
import { formatDuration } from '../../lib/labels';
import { theme } from '../../theme';

interface VoiceChipProps {
  path: string;
  durationSec: number | null | undefined;
  /** Whether this clip owns playback. Only one plays at a time across the grid. */
  active: boolean;
  onPlay: () => void;
  /** 'chip' rides on a photo; 'round' leads a voice card's row in the list. */
  variant: 'chip' | 'round';
}

/** Play a card's voice note right from the grid, without opening the card. */
export function VoiceChip({ path, durationSec, active, onPlay, variant }: VoiceChipProps) {
  const player = useAudioPlayer(api.mediaUrl(path));
  const { playing, pause } = player;

  useEffect(() => {
    if (!active && playing) pause();
  }, [active, playing, pause]);

  const total = durationSec ?? 0;
  const elapsed = player.progress * total;
  // A grid tile is a third of the screen wide, so the time is one number: the
  // length before it plays, how far in once it has started. The track shows the rest.
  const time = formatDuration(playing || player.progress > 0 ? elapsed : total);

  const press = () => {
    if (!playing) onPlay();
    void player.toggle();
  };
  const label = playing ? 'Pause the voice note' : `Play the voice note, ${Math.round(total)} seconds`;

  if (variant === 'round') {
    return (
      <Pressable
        onPress={press}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [s.round, pressed && s.pressed]}
      >
        <Ionicons
          name={playing ? 'pause' : 'play'}
          size={theme.iconSize.lg}
          color={theme.colors.onDark}
          style={playing ? undefined : s.nudge}
        />
        {/* How far in, as a bar across the foot of the button. */}
        {player.progress > 0 ? (
          <View style={s.roundTrack}>
            <View style={[s.roundFill, { width: `${Math.round(player.progress * 100)}%` }]} />
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={press}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => [s.chip, pressed && s.pressed]}
    >
      <Ionicons
        name={playing ? 'pause' : 'play'}
        size={theme.iconSize.sm}
        color={theme.colors.onDark}
      />
      <Text style={s.chipTime}>{time}</Text>
      {player.progress > 0 ? (
        <View style={s.chipTrack}>
          <View style={[s.chipFill, { width: `${Math.round(player.progress * 100)}%` }]} />
        </View>
      ) : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  pressed: { opacity: theme.opacity.pressed },
  nudge: { marginLeft: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    minHeight: 28,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.scrimMedia,
    overflow: 'hidden',
  },
  chipTime: {
    ...theme.textStyles.calloutStrong,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.onDark,
    fontVariant: ['tabular-nums'],
  },
  chipTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: theme.colors.onDarkMuted,
  },
  chipFill: { height: 2, backgroundColor: theme.colors.onDark },
  round: {
    width: theme.touchTarget.min,
    height: theme.touchTarget.min,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  roundTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: theme.colors.onDarkMuted,
  },
  roundFill: { height: 4, backgroundColor: theme.colors.onDark },
});
