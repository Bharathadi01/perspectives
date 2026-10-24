import { useRef, useState } from 'react';
import { Animated, LayoutAnimation, PanResponder, PanResponderInstance } from 'react-native';
import { selection, tap } from '../../lib/haptics';
import { useReduceMotion } from '../../lib/useReduceMotion';
import { theme } from '../../theme';

interface LiftDragOptions {
  /** Which item a drag from `from` by (dx, dy) is over, or null for none. */
  targetFor: (from: number, dx: number, dy: number) => number | null;
  /** Dropped on another item. */
  onDrop: (from: number, to: number) => void;
  /** The screen must stop scrolling while an item is lifted, or the drag fights the scroll. */
  onDraggingChange: (dragging: boolean) => void;
}

/**
 * Hold an item to lift it, drag it onto another, let go to drop.
 *
 * An item lifts only after a hold, so a stray finger never starts a drag and
 * the page still scrolls. Shared by the photo grid and the voice and written list.
 */
export function useLiftDrag(options: LiftDragOptions) {
  const reduceMotion = useReduceMotion();

  const [lifted, setLifted] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const liftedRef = useRef<number | null>(null);
  const targetRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Handlers read the latest options through a ref, because each PanResponder is created once per item.
  const latest = useRef({ ...options, reduceMotion });
  latest.current = { ...options, reduceMotion };

  const settle = (commit: boolean) => {
    const from = liftedRef.current;
    const to = targetRef.current;
    const { onDrop, onDraggingChange, reduceMotion: still } = latest.current;

    const reset = () => {
      liftedRef.current = null;
      targetRef.current = null;
      draggingRef.current = false;
      setLifted(null);
      setTarget(null);
      onDraggingChange(false);
    };

    if (still) scale.setValue(1);
    else Animated.spring(scale, { toValue: 1, ...theme.motion.spring.snappy, useNativeDriver: false }).start();

    if (commit && from !== null && to !== null && from !== to) {
      pan.setValue({ x: 0, y: 0 });
      if (!still) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      reset();
      onDrop(from, to);
      return;
    }

    if (still) {
      pan.setValue({ x: 0, y: 0 });
      reset();
    } else {
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        ...theme.motion.spring.snappy,
        useNativeDriver: false,
      }).start(reset);
    }
  };

  const lift = (index: number) => {
    liftedRef.current = index;
    targetRef.current = index;
    draggingRef.current = false;
    pan.setValue({ x: 0, y: 0 });
    setLifted(index);
    setTarget(index);
    latest.current.onDraggingChange(true);
    tap();
    if (latest.current.reduceMotion) scale.setValue(theme.scale.lifted);
    else Animated.spring(scale, { toValue: theme.scale.lifted, ...theme.motion.spring.snappy, useNativeDriver: false }).start();
  };

  /** For the item's onPressOut: held, then let go without moving, puts it back down. */
  const letGo = (index: number) => {
    setTimeout(() => {
      if (liftedRef.current === index && !draggingRef.current) settle(false);
    }, 0);
  };

  const responders = useRef<Record<number, PanResponderInstance>>({}).current;
  const responderFor = (index: number) => {
    if (!responders[index]) {
      const armed = () => liftedRef.current === index;
      responders[index] = PanResponder.create({
        onMoveShouldSetPanResponderCapture: armed,
        onMoveShouldSetPanResponder: armed,
        onPanResponderGrant: () => {
          draggingRef.current = true;
        },
        onPanResponderMove: (_, g) => {
          pan.setValue({ x: g.dx, y: g.dy });
          const next = latest.current.targetFor(index, g.dx, g.dy);
          if (next !== targetRef.current) {
            targetRef.current = next;
            setTarget(next);
            if (next !== null && next !== index) selection();
          }
        },
        onPanResponderRelease: () => settle(true),
        onPanResponderTerminate: () => settle(false),
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      });
    }
    return responders[index];
  };

  /** Whether `index` is the item a lifted item would be dropped on. */
  const isTarget = (index: number) => target === index && lifted !== null && lifted !== index;

  return { lifted, isTarget, pan, scale, lift, letGo, responderFor };
}
