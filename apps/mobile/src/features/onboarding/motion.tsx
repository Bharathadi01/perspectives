import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Animated, { css, cubicBezier, type CSSAnimationKeyframes } from 'react-native-reanimated';
import { useReduceMotion } from '../../lib/useReduceMotion';
import { theme } from '../../theme';

/**
 * The onboarding motion kit, ported from the design canvas (2026-10-31): titles rise, chips pop,
 * cards float, the next button pulses. Built on Reanimated's CSS animations, so each one is the
 * same keyframes and curve as the canvas. Every piece goes still when the phone asks for reduced
 * motion; the views stay mounted either way, so a focused field never loses its keyboard.
 */

/** The canvas curve: a quick start that settles softly. */
export const EASE_OUT = cubicBezier(0.2, 0.8, 0.2, 1);

type Frames = ReturnType<typeof css.keyframes>;
const cache = new Map<string, Frames>();
function frames(key: string, make: () => CSSAnimationKeyframes<ViewStyle>): Frames {
  let found = cache.get(key);
  if (!found) {
    found = css.keyframes(make());
    cache.set(key, found);
  }
  return found;
}

export const keyframes = {
  rise: (distance = 16) =>
    frames(`rise${distance}`, () => ({
      from: { opacity: 0, transform: [{ translateY: distance }] },
      to: { opacity: 1, transform: [{ translateY: 0 }] },
    })),
  pop: (overshoot = 1.06, from = 0.6) =>
    frames(`pop${overshoot}-${from}`, () => ({
      '0%': { opacity: 0, transform: [{ scale: from }] },
      '70%': { opacity: 1, transform: [{ scale: overshoot }] },
      '100%': { opacity: 1, transform: [{ scale: 1 }] },
    })),
  float: (distance = 7) =>
    frames(`float${distance}`, () => ({
      '0%': { transform: [{ translateY: 0 }] },
      '50%': { transform: [{ translateY: -distance }] },
      '100%': { transform: [{ translateY: 0 }] },
    })),
  slideX: (distance: number) =>
    frames(`slideX${distance}`, () => ({
      from: { opacity: 0, transform: [{ translateX: distance }] },
      to: { opacity: 1, transform: [{ translateX: 0 }] },
    })),
  drop: (distance = 40) =>
    frames(`drop${distance}`, () => ({
      '0%': { opacity: 0, transform: [{ translateY: -distance }] },
      '60%': { opacity: 1, transform: [{ translateY: 4 }] },
      '100%': { opacity: 1, transform: [{ translateY: 0 }] },
    })),
  /** Fills along X from `from` (a fraction of the full width) to all of it. */
  growX: (from = 0) => {
    const start = Math.round(from * 100) / 100;
    return frames(`growX${start}`, () => ({ from: { transform: [{ scaleX: start }] }, to: { transform: [{ scaleX: 1 }] } }));
  },
  growY: () =>
    frames('growY', () => ({ from: { transform: [{ scaleY: 0 }] }, to: { transform: [{ scaleY: 1 }] } })),
  fade: () => frames('fade', () => ({ from: { opacity: 0 }, to: { opacity: 1 } })),
  dim: (to = 0.28) => frames(`dim${to}`, () => ({ from: { opacity: 1 }, to: { opacity: to } })),
  spin: (reverse = false) =>
    frames(`spin${reverse}`, () => ({
      from: { transform: [{ rotate: '0deg' }] },
      to: { transform: [{ rotate: reverse ? '-360deg' : '360deg' }] },
    })),
  breathe: () =>
    frames('breathe', () => ({
      '0%': { transform: [{ scale: 1 }] },
      '50%': { transform: [{ scale: 1.04 }] },
      '100%': { transform: [{ scale: 1 }] },
    })),
  /** Grows by the same few points on every side, whatever the shape (like a CSS box-shadow). */
  pulse: (scaleX: number, scaleY: number) =>
    frames(`pulse${scaleX.toFixed(3)}x${scaleY.toFixed(3)}`, () => ({
      from: { opacity: 1, transform: [{ scaleX: 1 }, { scaleY: 1 }] },
      to: { opacity: 0, transform: [{ scaleX }, { scaleY }] },
    })),
  /** A ring that spreads out from the centre and fades (Nobody gets left out). */
  ripple: () =>
    frames('ripple', () => ({
      from: { opacity: 0.7, transform: [{ scale: 0.5 }] },
      to: { opacity: 0, transform: [{ scale: 1.5 }] },
    })),
  shake: (deg = 10) =>
    frames(`shake${deg}`, () => ({
      '0%': { transform: [{ rotate: '0deg' }] },
      '25%': { transform: [{ rotate: `${-deg}deg` }] },
      '75%': { transform: [{ rotate: `${deg}deg` }] },
      '100%': { transform: [{ rotate: '0deg' }] },
    })),
  ring: () =>
    frames('ringBell', () => ({
      '0%': { transform: [{ rotate: '0deg' }] },
      '20%': { transform: [{ rotate: '14deg' }] },
      '40%': { transform: [{ rotate: '-12deg' }] },
      '60%': { transform: [{ rotate: '8deg' }] },
      '80%': { transform: [{ rotate: '-4deg' }] },
      '100%': { transform: [{ rotate: '0deg' }] },
    })),
  stamp: () =>
    frames('stamp', () => ({
      '0%': { opacity: 0, transform: [{ scale: 2.2 }, { rotate: '-25deg' }] },
      '60%': { opacity: 1, transform: [{ scale: 0.92 }, { rotate: '4deg' }] },
      '100%': { opacity: 1, transform: [{ scale: 1 }, { rotate: '0deg' }] },
    })),
  bar: () => frames('bar', () => ({ from: { transform: [{ scaleY: 0.3 }] }, to: { transform: [{ scaleY: 1 }] } })),
  sheet: () =>
    frames('sheet', () => ({ from: { transform: [{ translateY: 600 }] }, to: { transform: [{ translateY: 0 }] } })),
  /** The quote cards on Welcome: in, hold for a third of the loop, out. */
  cycle: () =>
    frames('cycle', () => ({
      '0%': { opacity: 0, transform: [{ translateY: 10 }] },
      '4%': { opacity: 1, transform: [{ translateY: 0 }] },
      '30%': { opacity: 1, transform: [{ translateY: 0 }] },
      '34%': { opacity: 0, transform: [{ translateY: -10 }] },
      '100%': { opacity: 0, transform: [{ translateY: -10 }] },
    })),
  /** The thin bar that fills while one quote is showing. */
  barFill: () =>
    frames('barFill', () => ({
      '0%': { transform: [{ scaleX: 0 }] },
      '33.3%': { transform: [{ scaleX: 1 }] },
      '100%': { transform: [{ scaleX: 1 }] },
    })),
  /** The selfie scan line, top to bottom and back. */
  scan: (travel: number) =>
    frames(`scan${travel}`, () => ({
      '0%': { transform: [{ translateY: 0 }] },
      '50%': { transform: [{ translateY: travel }] },
      '100%': { transform: [{ translateY: 0 }] },
    })),
  /** A band of light crossing a placeholder from left to right. */
  sweep: (travel: number) =>
    frames(`sweep${travel}`, () => ({
      from: { transform: [{ translateX: 0 }, { skewX: '-12deg' }] },
      to: { transform: [{ translateX: travel }, { skewX: '-12deg' }] },
    })),
  /** A dashed edge that breathes between ink-brown and clay. */
  edgeBreathe: () =>
    frames('edgeBreathe', () => ({
      '0%': { borderColor: theme.editorial.colors.muted },
      '50%': { borderColor: theme.editorial.colors.accent },
      '100%': { borderColor: theme.editorial.colors.muted },
    })),
  /** A step number that warms to clay for a moment, one after another (How it works). */
  warm: () =>
    frames('warm', () => ({
      '0%': { backgroundColor: theme.editorial.colors.ink },
      '30%': { backgroundColor: theme.editorial.colors.ink },
      '40%': { backgroundColor: theme.editorial.colors.accent },
      '60%': { backgroundColor: theme.editorial.colors.accent },
      '70%': { backgroundColor: theme.editorial.colors.ink },
      '100%': { backgroundColor: theme.editorial.colors.ink },
    })),
  twinkle: () =>
    frames('twinkle', () => ({
      '0%': { opacity: 1, transform: [{ scale: 1 }] },
      '50%': { opacity: 0.7, transform: [{ scale: 1.25 }] },
      '100%': { opacity: 1, transform: [{ scale: 1 }] },
    })),
} as const;

/** False while the phone asks for reduced motion. */
export function useMotionAllowed(): boolean {
  return !useReduceMotion();
}

type Easing = 'ease' | 'linear' | 'ease-in-out' | typeof EASE_OUT;

export interface AnimateProps extends ViewProps {
  frames: Frames;
  /** Milliseconds. */
  duration: number;
  delay?: number;
  iterations?: number | 'infinite';
  easing?: Easing;
  direction?: 'normal' | 'alternate';
  style?: StyleProp<ViewStyle>;
}

/** One keyframe animation on a view; the base for every piece below. */
export function Animate({
  frames: name,
  duration,
  delay = 0,
  iterations = 1,
  easing = EASE_OUT,
  direction = 'normal',
  style,
  children,
  ...rest
}: AnimateProps) {
  const allowed = useMotionAllowed();
  return (
    <Animated.View
      {...rest}
      style={[
        style,
        allowed
          ? {
              animationName: name,
              animationDuration: duration,
              animationDelay: delay,
              animationIterationCount: iterations,
              animationTimingFunction: easing,
              animationDirection: direction,
              animationFillMode: 'both',
            }
          : { animationName: 'none' },
      ]}
    >
      {children}
    </Animated.View>
  );
}

type Wrapper = Omit<AnimateProps, 'frames' | 'duration'> & { duration?: number };

/** Fades up into place: titles, fields, cards. */
export function Rise({ distance = 16, duration = 700, ...rest }: Wrapper & { distance?: number }) {
  return <Animate frames={keyframes.rise(distance)} duration={duration} {...rest} />;
}

/** Grows in with a small overshoot: chips, badges, buttons. */
export function Pop({ overshoot = 1.06, from = 0.6, duration = 500, ...rest }: Wrapper & { overshoot?: number; from?: number }) {
  return <Animate frames={keyframes.pop(overshoot, from)} duration={duration} {...rest} />;
}

/** Drifts up and down forever. Wrap it inside a Rise or Pop, never on the same view. */
export function Float({ distance = 7, duration = 5000, delay = 1000, ...rest }: Wrapper & { distance?: number }) {
  return (
    <Animate
      frames={keyframes.float(distance)}
      duration={duration}
      delay={delay}
      iterations="infinite"
      easing="ease-in-out"
      {...rest}
    />
  );
}

/**
 * A soft clay ring that swells out of a button and fades: "this is the next tap". Put it first
 * inside the button's wrapper, which must be the button's size.
 */
export function PulseRing({
  width,
  height,
  radius,
  delay = 1300,
  iterations = 2,
  spread = 16,
  duration = 1600,
}: {
  /** The button's size, so the ring spreads `spread` points on every side. */
  width: number;
  height: number;
  radius: number;
  delay?: number;
  iterations?: number | 'infinite';
  spread?: number;
  duration?: number;
}) {
  if (width <= 0 || height <= 0) return null;
  return (
    <Animate
      pointerEvents="none"
      frames={keyframes.pulse(1 + (2 * spread) / width, 1 + (2 * spread) / height)}
      duration={duration}
      delay={delay}
      iterations={iterations}
      easing="ease"
      style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: theme.editorial.colors.accentGlow, opacity: 0 }]}
    />
  );
}

/** Text that types itself in, a letter at a time; whole at once under reduced motion. */
export function useTypewriter(text: string, { delay = 400, duration = 1400 }: { delay?: number; duration?: number } = {}): string {
  const allowed = useMotionAllowed();
  const [shown, setShown] = useState(allowed ? 0 : text.length);
  useEffect(() => {
    if (!allowed) {
      setShown(text.length);
      return;
    }
    setShown(0);
    const step = Math.max(16, duration / Math.max(1, text.length));
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = setTimeout(() => {
      timer = setInterval(() => {
        setShown((n) => {
          if (n >= text.length) {
            if (timer) clearInterval(timer);
            return n;
          }
          return n + 1;
        });
      }, step);
    }, delay);
    return () => {
      clearTimeout(start);
      if (timer) clearInterval(timer);
    };
  }, [text, allowed, delay, duration]);
  return text.slice(0, shown);
}

export interface TapProps extends Omit<PressableProps, 'style' | 'children'> {
  /** The visible shape: it shrinks a little while pressed. */
  style?: StyleProp<ViewStyle>;
  /** Placement of the touch area (margins, alignSelf, flex). */
  containerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children?: React.ReactNode;
}

/** A Pressable whose content dips to 97% while held, like the canvas buttons. */
export function Tap({ style, containerStyle, scaleTo = theme.scale.pressed, children, onPressIn, onPressOut, ...rest }: TapProps) {
  const allowed = useMotionAllowed();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      {...rest}
      style={containerStyle}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: pressed ? scaleTo : 1 }],
            // Colours ease too, so a chip or row fills in rather than flipping.
            transitionProperty: ['transform', 'backgroundColor', 'borderColor'],
            transitionDuration: allowed ? [150, 200, 200] : 0,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
