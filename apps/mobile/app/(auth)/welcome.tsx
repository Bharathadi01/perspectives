import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { LogoRings } from '../../src/features/onboarding/art';
import { Animate, Float, Rise, keyframes, useMotionAllowed } from '../../src/features/onboarding/motion';
import { PillButton, TextButton } from '../../src/features/onboarding/ui';
import { theme } from '../../src/theme';

const e = theme.editorial;
const c = e.colors;
const f = e.fonts;

/** Sample perspectives on the welcome card, one at a time. Examples, not real people's words. */
const QUOTES = [
  { label: 'On your outfit', text: '“The green jacket is doing a lot of work. Wear it more.”' },
  { label: 'On your voice', text: '“Calm and warm. You’d be easy to talk to for hours.”' },
  { label: 'On your photos', text: '“Lead with the laughing one. It feels most like you.”' },
];
const LOOP = 9000;

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const motion = useMotionAllowed();
  return (
    <View style={[s.screen, { paddingTop: insets.top + 48, paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
      <Rise style={s.head}>
        <LogoRings width={44} stroke={3.5} />
        <Text style={s.word} accessibilityRole="header">
          Perspective
        </Text>
        <Text style={s.tagline}>See yourself through other people’s eyes.</Text>
      </Rise>

      <View style={s.stack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[s.abs, s.back1]}>
          <Rise delay={200}>
            <Float duration={5000} delay={1000} distance={8}>
              <View style={[s.backCard, { backgroundColor: c.sand }]} />
            </Float>
          </Rise>
        </View>
        <View style={[s.abs, s.back2]}>
          <Rise delay={300}>
            <Float duration={5600} delay={1300} distance={8}>
              <View style={[s.backCard, { backgroundColor: c.line }]} />
            </Float>
          </Rise>
        </View>
        <View style={[s.abs, s.front]}>
          <Rise delay={400}>
            <Float duration={4600} delay={1100} distance={8}>
              <View style={s.frontCard}>
                <View style={s.bar}>
                  <Animate frames={keyframes.barFill()} duration={LOOP / 3} delay={1000} iterations="infinite" easing="linear" style={s.barFill} />
                </View>
                {/* Under reduced motion only the first quote shows; otherwise they take turns. */}
                {(motion ? QUOTES : QUOTES.slice(0, 1)).map((q, i) => (
                  <Animate
                    key={q.label}
                    frames={keyframes.cycle()}
                    duration={LOOP}
                    delay={1000 + i * (LOOP / 3)}
                    iterations="infinite"
                    easing="linear"
                    style={s.quote}
                  >
                    <Text style={s.quoteLabel}>{q.label}</Text>
                    <Text style={s.quoteText}>{q.text}</Text>
                  </Animate>
                ))}
                <View style={s.from}>
                  <Svg width={15} height={15} viewBox="0 0 24 24">
                    <Circle cx={12} cy={12} r={10} fill={c.accent} />
                    <Path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke={c.onInk} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text style={s.fromText}>From a verified person · only you can read it</Text>
                </View>
              </View>
            </Float>
          </Rise>
        </View>
      </View>

      <Rise delay={600} style={s.actions}>
        <Text style={s.legal}>Honest perspectives from selfie-verified adults. 18+ only.</Text>
        <PillButton label="Create account" wide onPress={() => router.push('/(auth)/email')} />
        <TextButton label="I already have an account" onPress={() => router.push('/(auth)/login')} />
      </Rise>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper, paddingHorizontal: theme.spacing.lg + theme.spacing.xs },
  head: { alignItems: 'center', gap: theme.spacing.md },
  word: { fontFamily: f.display, fontSize: 42, lineHeight: 46, letterSpacing: -0.6, color: c.ink },
  tagline: { fontFamily: f.body, fontSize: 16, lineHeight: 23, color: c.muted, textAlign: 'center' },
  stack: { flex: 1, marginTop: 36, minHeight: 240 },
  abs: { position: 'absolute' },
  back1: { left: 30, right: 14, top: 8, transform: [{ rotate: '-5deg' }] },
  back2: { left: 4, right: 20, top: 20, transform: [{ rotate: '3deg' }] },
  front: { left: 8, right: 8, top: 34, transform: [{ rotate: '-1deg' }] },
  backCard: { height: 176, borderRadius: 22 },
  frontCard: {
    height: 196,
    borderRadius: 22,
    backgroundColor: c.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    overflow: 'hidden',
    shadowColor: c.ink,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 18 },
    elevation: 6,
  },
  bar: { position: 'absolute', left: 20, right: 20, top: 18, height: 3, borderRadius: 2, backgroundColor: c.sand, overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: c.accent, transformOrigin: 'left' },
  quote: { position: 'absolute', left: 22, right: 22, top: 36, gap: 10 },
  quoteLabel: { fontFamily: f.bodyBold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: c.accentText },
  quoteText: { fontFamily: f.displayItalic, fontSize: 20, lineHeight: 27, color: c.ink },
  from: { position: 'absolute', left: 22, bottom: theme.spacing.base, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  fromText: { fontFamily: f.body, fontSize: 12, color: c.muted },
  actions: { gap: theme.spacing.md },
  legal: { marginBottom: theme.spacing.xs, textAlign: 'center', fontFamily: f.body, fontSize: 13, lineHeight: 19, color: c.muted },
});
