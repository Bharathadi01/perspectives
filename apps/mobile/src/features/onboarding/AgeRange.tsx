import { RULES } from '@perspective/contracts';
import React, { useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { selection } from '../../lib/haptics';
import { theme } from '../../theme';
import { Animate, keyframes } from './motion';
import { ageToFraction, fractionToAge } from './values';

const e = theme.editorial;
const THUMB = 28;
const MIN = RULES.minAge;
const MAX = RULES.maxAudienceAge;

/**
 * The audience age range: two thumbs on one track, 18 to 99. Each thumb is its own adjustable
 * control for screen readers, a year per swipe.
 */
export function AgeRange({
  minAge,
  maxAge,
  onChange,
}: {
  minAge: number;
  maxAge: number;
  onChange: (range: { minAge: number; maxAge: number }) => void;
}) {
  const [width, setWidth] = useState(0);
  const range = useRef({ minAge, maxAge });
  range.current = { minAge, maxAge };

  const onLayout = (ev: LayoutChangeEvent) => setWidth(ev.nativeEvent.layout.width);
  const usable = Math.max(1, width - THUMB);

  const update = (which: 'min' | 'max', age: number) => {
    const { minAge: lo, maxAge: hi } = range.current;
    const next = which === 'min' ? { minAge: Math.min(age, hi), maxAge: hi } : { minAge: lo, maxAge: Math.max(age, lo) };
    if (next.minAge !== lo || next.maxAge !== hi) {
      selection();
      onChange(next);
    }
  };

  const responder = (which: 'min' | 'max') => {
    let startX = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        const age = which === 'min' ? range.current.minAge : range.current.maxAge;
        startX = ageToFraction(age) * usable;
      },
      onPanResponderMove: (_, g) => update(which, fractionToAge((startX + g.dx) / usable)),
    });
  };
  // Rebuilt when the track is measured, so the drag maths uses the real width.
  const minPan = React.useMemo(() => responder('min'), [usable]); // eslint-disable-line react-hooks/exhaustive-deps
  const maxPan = React.useMemo(() => responder('max'), [usable]); // eslint-disable-line react-hooks/exhaustive-deps

  const lo = ageToFraction(minAge) * usable;
  const hi = ageToFraction(maxAge) * usable;

  const a11y = (which: 'min' | 'max') => ({
    accessible: true,
    accessibilityRole: 'adjustable' as const,
    accessibilityLabel: which === 'min' ? 'Youngest' : 'Oldest',
    accessibilityValue: { min: MIN, max: MAX, now: which === 'min' ? minAge : maxAge, text: `${which === 'min' ? minAge : maxAge}` },
    accessibilityActions: [{ name: 'increment' as const }, { name: 'decrement' as const }],
    onAccessibilityAction: (ev: { nativeEvent: { actionName: string } }) => {
      const current = which === 'min' ? minAge : maxAge;
      update(which, Math.min(MAX, Math.max(MIN, current + (ev.nativeEvent.actionName === 'increment' ? 1 : -1))));
    },
  });

  return (
    <View style={s.card}>
      <View style={s.head}>
        <Text style={s.label}>Ages</Text>
        <Text style={s.value}>
          {minAge} – {maxAge}
        </Text>
      </View>
      <View style={s.track} onLayout={onLayout}>
        <View style={s.rail} />
        {width > 0 ? (
          <>
            <Animate
              frames={keyframes.growX()}
              duration={900}
              delay={500}
              style={[s.range, { left: lo + THUMB / 2, width: Math.max(0, hi - lo) }]}
            />
            <View {...minPan.panHandlers} {...a11y('min')} hitSlop={10} style={[s.thumb, { left: lo }]} />
            <View {...maxPan.panHandlers} {...a11y('max')} hitSlop={10} style={[s.thumb, { left: hi }]} />
          </>
        ) : null}
      </View>
      <Text style={s.hint}>If very few people fit, we may widen the ages a little and tell you.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: e.colors.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: e.colors.line,
    borderRadius: 18,
    paddingTop: theme.spacing.base,
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 14,
  },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: { fontFamily: e.fonts.bodySemibold, fontSize: 15, color: e.colors.ink },
  value: { fontFamily: e.fonts.display, fontSize: 22, color: e.colors.ink },
  track: { height: THUMB, justifyContent: 'center' },
  rail: { position: 'absolute', left: THUMB / 2, right: THUMB / 2, height: 4, borderRadius: 2, backgroundColor: e.colors.line },
  range: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: e.colors.ink, transformOrigin: 'left' },
  thumb: {
    position: 'absolute',
    top: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: e.colors.surface,
    borderWidth: 2,
    borderColor: e.colors.ink,
  },
  hint: { fontFamily: e.fonts.body, fontSize: 13, lineHeight: 19, color: e.colors.muted },
});
