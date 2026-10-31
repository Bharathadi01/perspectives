import React, { useEffect } from 'react';
import Animated, { Easing, cancelAnimation, useAnimatedProps, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { theme } from '../../theme';
import { useMotionAllowed } from './motion';

const e = theme.editorial;

/** Perspective's mark: two overlapping rings, ink and clay. Our own drawing. `onInk` for dark tiles. */
export function LogoRings({ width = 44, stroke = 3.5, onInk }: { width?: number; stroke?: number; onInk?: boolean }) {
  return (
    <Svg width={width} height={(width * 40) / 64} viewBox="0 0 64 40" fill="none">
      <Circle cx={22} cy={20} r={16} stroke={onInk ? e.colors.onInk : e.colors.ink} strokeWidth={stroke} />
      <Circle cx={42} cy={20} r={16} stroke={e.colors.accent} strokeWidth={stroke} />
    </Svg>
  );
}

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

/**
 * A dashed clay oval whose dashes march round it, like a camera finding a face. The oval itself
 * stays put, so it always lines up with the face guide inside it.
 */
export function MarchingOval({
  width,
  height,
  stroke = 3,
  dash,
  gap,
  duration,
}: {
  width: number;
  height: number;
  stroke?: number;
  dash: number;
  gap: number;
  /** Milliseconds for one full lap of four dashes. */
  duration: number;
}) {
  const allowed = useMotionAllowed();
  const offset = useSharedValue(0);
  useEffect(() => {
    if (!allowed) {
      cancelAnimation(offset);
      offset.value = 0;
      return;
    }
    offset.value = withRepeat(withTiming(-(dash + gap) * 4, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(offset);
  }, [allowed, dash, gap, duration, offset]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <AnimatedEllipse
        cx={width / 2}
        cy={height / 2}
        rx={width / 2 - stroke}
        ry={height / 2 - stroke}
        stroke={e.colors.accent}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${gap}`}
        strokeLinecap="round"
        animatedProps={animatedProps}
      />
    </Svg>
  );
}

/** One ring of the mark, for the splash where the two slide together. */
export function LogoRing({ size, stroke, color }: { size: number; stroke: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Circle cx={18} cy={18} r={16} stroke={color} strokeWidth={stroke} />
    </Svg>
  );
}

/** The clay seal with a tick that marks a selfie-verified person. */
export function VerifiedSeal({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 1.8l2.5 1.9 3.1-.2.9 3 2.6 1.7-1 3 1 3-2.6 1.7-.9 3-3.1-.2L12 22.2l-2.5-1.9-3.1.2-.9-3-2.6-1.7 1-3-1-3 2.6-1.7.9-3 3.1.2z"
        fill={e.colors.accent}
      />
      <Path d="M8 12.2l2.7 2.7L16.2 9" fill="none" stroke={e.colors.onInk} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** A plain picture glyph for empty photo slots. */
export function PhotoGlyph({ size = 30, color = e.colors.muted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={4} width={18} height={16} rx={2} />
      <Circle cx={9} cy={10} r={2} />
      <Path d="M21 16l-5-5-9 9" />
    </Svg>
  );
}

/** A five-point star, for the "no ratings" illustration. */
export function Star({ size = 22, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z" />
    </Svg>
  );
}

/** The four-point spark beside writing hints. */
export function Spark({ size = 18, color = e.colors.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l2.2 6.5L21 11l-6.8 2.3L12 20l-2.2-6.7L3 11l6.8-2.5z" />
    </Svg>
  );
}
