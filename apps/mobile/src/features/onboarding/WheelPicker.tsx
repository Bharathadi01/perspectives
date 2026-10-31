import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { selection } from '../../lib/haptics';
import { theme } from '../../theme';

const e = theme.editorial;
const ROW = 46;
const VISIBLE = 5;
const PAD = ROW * Math.floor(VISIBLE / 2);

interface WheelPickerProps {
  items: readonly number[];
  value: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  /** Read after the value by screen readers and shown beside the chosen row ("feet"). */
  unit?: string;
  label: string;
}

/**
 * A scroll wheel like the phone's own: rows snap to the middle, fade and shrink away from it.
 * Rows can also be tapped, and screen readers adjust it by swiping up or down.
 */
export function WheelPicker({ items, value, onChange, format, unit, label }: WheelPickerProps) {
  const ref = useAnimatedRef<Animated.ScrollView>();
  const index = Math.max(0, items.indexOf(value));
  const y = useSharedValue(index * ROW);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ items, value, onChange });
  latest.current = { items, value, onChange };

  const jump = useCallback(
    (i: number, animated: boolean) => {
      scheduleOnUI(() => {
        'worklet';
        scrollTo(ref, 0, i * ROW, animated);
      });
    },
    [ref],
  );

  // Line up with the value on arrival and whenever the choices change (feet ↔ centimetres).
  useEffect(() => {
    const t = setTimeout(() => jump(index, false), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const settle = useCallback((offset: number) => {
    const { items: list, value: current, onChange: change } = latest.current;
    const i = Math.min(list.length - 1, Math.max(0, Math.round(offset / ROW)));
    if (list[i] !== current) {
      selection();
      change(list[i]);
    }
  }, []);

  // Settles once scrolling has been quiet for a moment: works the same with momentum, a slow
  // drag, a mouse wheel on the web, or a programmatic scroll.
  const onScrollJS = useCallback(
    (offset: number) => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => settle(offset), 120);
    },
    [settle],
  );
  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  const handler = useAnimatedScrollHandler({
    onScroll: (ev) => {
      y.value = ev.contentOffset.y;
      scheduleOnRN(onScrollJS, ev.contentOffset.y);
    },
  });

  const step = (delta: number) => {
    const i = Math.min(items.length - 1, Math.max(0, index + delta));
    if (i === index) return;
    selection();
    onChange(items[i]);
    jump(i, true);
  };

  return (
    <View
      style={s.wrap}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: `${format(value)}${unit ? ` ${unit}` : ''}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(ev) => step(ev.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      <View style={s.highlight} pointerEvents="none">
        {unit ? <Text style={s.unit}>{unit}</Text> : null}
      </View>
      <Animated.ScrollView
        ref={ref}
        style={s.scroller}
        onScroll={handler}
        scrollEventThrottle={16}
        snapToInterval={ROW}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        nestedScrollEnabled
      >
        {items.map((item, i) => (
          <Row
            key={item}
            i={i}
            y={y}
            label={format(item)}
            hasUnit={!!unit}
            onPress={() => {
              jump(i, true);
            }}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

function Row({ i, y, label, hasUnit, onPress }: { i: number; y: SharedValue<number>; label: string; hasUnit: boolean; onPress: () => void }) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(y.value / ROW - i);
    return {
      opacity: interpolate(d, [0, 1, 2], [1, 0.62, 0.35], 'clamp'),
      transform: [{ scale: interpolate(d, [0, 1, 2], [1, 0.7, 0.62], 'clamp') }],
    };
  });
  return (
    <Pressable onPress={onPress} importantForAccessibility="no" accessibilityElementsHidden>
      <Animated.View style={[s.row, style]}>
        <Text style={[s.rowText, hasUnit && s.rowTextWithUnit]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { height: ROW * VISIBLE, flex: 1 },
  // The window is exactly five rows; without its own size the list grows to full length on the web.
  scroller: { height: ROW * VISIBLE, flexGrow: 0 },
  content: { paddingVertical: PAD },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PAD - 6,
    height: ROW + 12,
    borderRadius: 18,
    backgroundColor: e.colors.surface,
    shadowColor: e.colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    justifyContent: 'center',
  },
  unit: {
    position: 'absolute',
    left: '50%',
    marginLeft: 26,
    fontFamily: e.fonts.body,
    fontSize: 15,
    color: e.colors.muted,
  },
  row: { height: ROW, alignItems: 'center', justifyContent: 'center' },
  rowText: { fontFamily: e.fonts.bodyMedium, fontSize: 30, color: e.colors.ink },
  rowTextWithUnit: { marginRight: 28 },
});
