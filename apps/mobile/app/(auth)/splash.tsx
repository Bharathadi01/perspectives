import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LogoRing } from '../../src/features/onboarding/art';
import { Animate, Rise, keyframes, useMotionAllowed } from '../../src/features/onboarding/motion';
import { theme } from '../../src/theme';

const e = theme.editorial;
/** The mark at splash size: each ring 43 pt, overlapping like the logo. */
const RING = 43;

/** The first thing a signed-out person sees: the two rings slide together, then Welcome. */
export default function Splash() {
  const motion = useMotionAllowed();
  useEffect(() => {
    const t = setTimeout(() => router.replace('/(auth)/welcome'), motion ? 2400 : 1200);
    return () => clearTimeout(t);
  }, [motion]);

  return (
    <Pressable
      style={s.screen}
      onPress={() => router.replace('/(auth)/welcome')}
      accessibilityRole="button"
      accessibilityLabel="Open Perspective"
    >
      <Animate frames={keyframes.breathe()} duration={3000} delay={1400} iterations="infinite" easing="ease-in-out" style={s.mark}>
        <Animate frames={keyframes.slideX(-22)} duration={900} delay={100} style={[s.ring, { left: 5 }]}>
          <LogoRing size={RING} stroke={3} color={e.colors.ink} />
        </Animate>
        <Animate frames={keyframes.slideX(22)} duration={900} delay={100} style={[s.ring, { left: 28 }]}>
          <LogoRing size={RING} stroke={3} color={e.colors.accent} />
        </Animate>
      </Animate>
      <Rise delay={600} distance={12} duration={800}>
        <Text style={s.word}>Perspective</Text>
      </Rise>
      <Rise delay={850} distance={12} duration={800}>
        <Text style={s.tagline}>See yourself through other people’s eyes.</Text>
      </Rise>
      <View />
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: e.colors.paper, alignItems: 'center', justifyContent: 'center', gap: 20 },
  mark: { width: 76, height: 48 },
  ring: { position: 'absolute', top: 2.5 },
  word: { fontFamily: e.fonts.display, fontSize: 42, letterSpacing: -0.5, color: e.colors.ink },
  tagline: { fontFamily: e.fonts.body, fontSize: 15, color: e.colors.muted, textAlign: 'center' },
});
