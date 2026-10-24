import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { selection } from '../../lib/haptics';
import { useReduceMotion } from '../../lib/useReduceMotion';
import { theme } from '../../theme';
import { easing } from '../../theme/motion';

const TRACK_PADDING = 3;

export interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

/**
 * Switches between two views of the same thing. Apple's guidance is that a
 * segmented control changes what you are looking at and never performs an
 * action, so nothing here adds, removes or edits.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  accessibilityLabel,
  style,
}: SegmentedControlProps<T>) {
  const [trackWidth, setTrackWidth] = useState(0);
  const reduceMotion = useReduceMotion();
  const index = Math.max(0, segments.findIndex((s) => s.value === value));
  const slide = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: index,
      duration: reduceMotion ? theme.motion.reduced.duration.fast : theme.motion.duration.base,
      easing: easing.inOut,
      useNativeDriver: true,
    }).start();
  }, [index, reduceMotion, slide]);

  const segmentWidth = trackWidth > 0 ? (trackWidth - TRACK_PADDING * 2) / segments.length : 0;
  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View
      style={[s.track, style]}
      onLayout={onLayout}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            s.thumb,
            {
              width: segmentWidth,
              transform: [
                {
                  translateX: slide.interpolate({
                    inputRange: segments.map((_, i) => i),
                    outputRange: segments.map((_, i) => i * segmentWidth),
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}

      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            style={s.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={segment.label}
            onPress={() => {
              if (selected) return;
              selection();
              onChange(segment.value);
            }}
          >
            <Text style={[s.label, selected && s.labelSelected]}>{segment.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    padding: TRACK_PADDING,
  },
  thumb: {
    position: 'absolute',
    top: TRACK_PADDING,
    left: TRACK_PADDING,
    bottom: TRACK_PADDING,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    ...theme.elevation.raised,
  },
  // 44 rather than 48: each half sits inside a track that is already taller than the minimum.
  segment: {
    flex: 1,
    minHeight: theme.touchTarget.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...theme.textStyles.calloutStrong,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.muted,
  },
  labelSelected: {
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.ink,
  },
});
