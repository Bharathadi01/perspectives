import Ionicons from '@expo/vector-icons/Ionicons';
import { getInterestById, type MyProfile } from '@perspective/contracts';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../api/client';
import { deferPushPrompt, enablePushNow } from '../../../push/push';
import { theme } from '../../../theme';
import { useExplore } from '../../hooks';
import { LogoRings, VerifiedSeal } from '../art';
import { STEP_PROGRESS } from '../flow';
import { Animate, Float, Pop, Rise, Tap, keyframes } from '../motion';
import { finishOnboarding, useStepNav } from '../nav';
import { GUTTER, PillButton, Pulsing, StepScreen, TextButton, ob } from '../ui';
import { profileLine } from './Selfie';

const e = theme.editorial;
const c = e.colors;
const f = e.fonts;

// ---------- 28 · review ----------

export function ReviewStep({ me }: { me: MyProfile }) {
  const { next, goTo } = useStepNav('review');
  const main = [...me.posts].sort((a, b) => a.position - b.position)[0];
  const interests = me.interests.map((id) => getInterestById(id)?.label ?? id);
  return (
    <StepScreen
      progress={STEP_PROGRESS.review}
      title="This already feels like you."
      subtitle="Here’s how people will see you. Tap anything to change it."
      footer={<PillButton label="Looks good" onPress={() => next()} delay={1300} pulseDelay={2000} />}
    >
      <View style={s.reviewPad}>
        <Rise delay={200}>
          <Float duration={5000} delay={1400} distance={6}>
            <View style={s.reviewCard}>
              <Tap onPress={() => goTo('name', { edit: '1' })} accessibilityRole="button" accessibilityLabel={`${me.displayName}, ${profileLine(me)}. Change your basics`} style={s.reviewHead}>
                <View style={s.nameRow}>
                  <Text style={s.reviewName}>{me.displayName}</Text>
                  {me.selfieStatus === 'verified' ? (
                    <Pop delay={900}>
                      <VerifiedSeal size={20} />
                    </Pop>
                  ) : null}
                </View>
                <Text style={s.reviewLine}>{profileLine(me)}</Text>
              </Tap>
              {main ? (
                <Tap onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={`Your main post: ${main.prompt}. Change your posts`} style={s.reviewPost}>
                  <Text style={s.reviewPrompt}>{main.prompt}</Text>
                  <View style={s.reviewPhoto}>
                    {main.mediaUrl ? (
                      <Image source={{ uri: api.mediaUrl(main.mediaUrl) }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
                    ) : null}
                  </View>
                </Tap>
              ) : null}
              {interests.length > 0 ? (
                <Tap onPress={() => goTo('interests', { edit: '1' })} accessibilityRole="button" accessibilityLabel={`Interests: ${interests.join(', ')}. Change your interests`} style={s.reviewChips}>
                  {interests.map((label, i) => (
                    <Pop key={label} delay={1000 + i * 80} duration={450}>
                      <Text style={s.reviewChip}>{label}</Text>
                    </Pop>
                  ))}
                </Tap>
              ) : null}
            </View>
          </Float>
        </Rise>
      </View>
    </StepScreen>
  );
}

// ---------- 29 · how it works ----------

const HOW = [
  { title: 'Give a few each day', body: 'Each day we pick up to 3 people for you. Give each one an honest perspective on one of their posts.' },
  { title: 'Unlock yours', body: 'Finishing today’s set opens the perspectives people gave you. Only you can read them.' },
  { title: 'Connect if you click', body: 'After you give someone a perspective, you can ask to connect. Chat opens when they give one back.' },
];

export function HowItWorksStep() {
  const { next } = useStepNav('how-it-works');
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.screen, { paddingTop: insets.top + 56, paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
      <Rise>
        <Text style={ob.bigTitle} accessibilityRole="header">
          How Perspective works
        </Text>
      </Rise>
      <View style={s.how} accessibilityRole="list">
        {HOW.map((item, i) => (
          <Rise key={item.title} delay={250 + i * 300} duration={600} style={s.howItem}>
            <Pop delay={300 + i * 300} from={0.4} overshoot={1.12}>
              <Animate frames={keyframes.warm()} duration={4500} delay={2000 + i * 1500} iterations="infinite" easing="ease-in-out" style={s.howNumber}>
                <Text style={s.howNumberText}>{i + 1}</Text>
              </Animate>
            </Pop>
            <View style={s.howText}>
              <Text style={s.howTitle}>{item.title}</Text>
              <Text style={s.howBody}>{item.body}</Text>
            </View>
          </Rise>
        ))}
      </View>
      <Rise delay={1200} duration={600}>
        <View style={s.rule}>
          <Ionicons name="shield-outline" size={20} color={c.accent} />
          <Text style={s.ruleText}>Honest, never cruel. A perspective is one person’s view, not a verdict. No body shaming, abuse or sexual content.</Text>
        </View>
      </Rise>
      <View style={s.flex} />
      <PillButton label="Got it" onPress={() => next()} pulseDelay={1800} />
    </View>
  );
}

// ---------- 30 · notifications ----------

const SAMPLE_PUSHES = [
  { text: 'You got a new perspective. Finish today’s set to read it.', tilt: '-2deg', delay: 150 },
  { text: 'Someone wants to connect with you.', tilt: '1.5deg', delay: 550 },
];

export function NotificationsStep() {
  const { next } = useStepNav('notifications');
  const insets = useSafeAreaInsets();
  const [asking, setAsking] = useState(false);
  const turnOn = async () => {
    setAsking(true);
    await enablePushNow();
    setAsking(false);
    next();
  };
  return (
    <View style={[s.screen, s.centered, { paddingTop: insets.top + 76, paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
      <View style={s.pushes} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {SAMPLE_PUSHES.map((p, i) => (
          <View key={p.text} style={{ transform: [{ rotate: p.tilt }] }}>
            <Animate frames={keyframes.drop()} duration={700} delay={p.delay}>
              <Float duration={4000} delay={1200 + i * 400} distance={5}>
                <View style={s.push}>
                  <View style={s.pushIcon}>
                    <LogoRings width={22} stroke={5} onInk />
                  </View>
                  <Text style={s.pushText}>{p.text}</Text>
                </View>
              </Float>
            </Animate>
          </View>
        ))}
      </View>
      <Rise delay={800}>
        <Text style={[ob.bigTitle, s.notifTitle]} accessibilityRole="header">
          Know when a perspective lands
        </Text>
      </Rise>
      <Rise delay={900}>
        <Text style={[ob.bodyMuted, s.notifBody]}>
          We’ll tell you when someone gives you a perspective, wants to connect, or writes to you. A notification never shows what anyone wrote.
        </Text>
      </Rise>
      <View style={s.flex} />
      <Rise delay={1100} duration={600} style={s.stretch}>
        <Pulsing active={!asking} radius={27} delay={1900}>
          <Tap
            onPress={() => void turnOn()}
            disabled={asking}
            accessibilityRole="button"
            accessibilityLabel="Turn on notifications"
            accessibilityState={{ busy: asking }}
            style={s.bellButton}
          >
            <Animate frames={keyframes.ring()} duration={1000} delay={2000} iterations={3} easing="ease-in-out" style={s.bell}>
              <Ionicons name="notifications-outline" size={20} color={c.onInk} />
            </Animate>
            <Text style={s.bellText}>Turn on notifications</Text>
          </Tap>
        </Pulsing>
      </Rise>
      <TextButton
        label="Not now"
        onPress={() => {
          deferPushPrompt();
          next();
        }}
      />
    </View>
  );
}

// ---------- 31 · ready ----------

export function ReadyStep() {
  const insets = useSafeAreaInsets();
  const explore = useExplore();
  const required = explore.data?.daily.requiredCount;
  const empty = required === 0;
  return (
    <View style={[s.screen, s.centered, { paddingTop: insets.top + 96, paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
      <View style={s.fan} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[s.fanSide, s.fanLeft]}>
          <Animate frames={keyframes.slideX(70)} duration={800} delay={200}>
            <Float duration={5000} delay={1200}>
              <View style={[s.fanCard, { backgroundColor: c.line }]} />
            </Float>
          </Animate>
        </View>
        <View style={[s.fanSide, s.fanRight]}>
          <Animate frames={keyframes.slideX(-70)} duration={800} delay={200}>
            <Float duration={5400} delay={1400}>
              <View style={[s.fanCard, { backgroundColor: c.waveRest }]} />
            </Float>
          </Animate>
        </View>
        <Rise delay={100} style={s.fanFront}>
          <LogoRings width={54} stroke={3} />
          {required ? <Text style={s.fanCount}>{`1 of ${required}`}</Text> : null}
        </Rise>
      </View>
      <Rise delay={900}>
        <Text style={[ob.bigTitle, s.readyTitle]} accessibilityRole="header">
          {empty ? 'You’re in' : 'Your first set is waiting'}
        </Text>
      </Rise>
      <Rise delay={1000}>
        <Text style={[ob.bodyMuted, s.readyBody]}>
          {empty
            ? 'There’s nobody in your audience yet. Explore fills up as people join.'
            : 'Give today’s perspectives, then see what people think of yours.'}
        </Text>
      </Rise>
      <View style={s.flex} />
      <PillButton label="Let’s go" onPress={finishOnboarding} delay={1200} pulseDelay={2000} pulses="infinite" />
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: c.paper, paddingHorizontal: theme.spacing.lg + theme.spacing.xs },
  centered: { alignItems: 'center' },
  stretch: { alignSelf: 'stretch' },
  reviewPad: { paddingHorizontal: GUTTER - theme.spacing.sm, paddingTop: 20 },
  reviewCard: {
    backgroundColor: c.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    borderRadius: 26,
    paddingVertical: 20,
    paddingHorizontal: 18,
    gap: 14,
  },
  reviewHead: { gap: theme.spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  reviewName: { fontFamily: f.display, fontSize: 28, color: c.ink },
  reviewLine: { fontFamily: f.body, fontSize: 14, color: c.muted },
  reviewPost: { gap: 14 },
  reviewPrompt: { fontFamily: f.display, fontSize: 19, lineHeight: 25, color: c.ink },
  reviewPhoto: { height: 270, borderRadius: 18, backgroundColor: c.line, overflow: 'hidden' },
  reviewChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reviewChip: {
    height: 30,
    lineHeight: 30,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    backgroundColor: c.paper,
    fontFamily: f.bodyMedium,
    fontSize: 13,
    color: c.ink,
  },
  how: { marginTop: 36, gap: 26 },
  howItem: { flexDirection: 'row', gap: theme.spacing.base },
  howNumber: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' },
  howNumberText: { fontFamily: f.display, fontSize: 19, color: c.onInk },
  howText: { flex: 1, gap: theme.spacing.xs },
  howTitle: { fontFamily: f.bodySemibold, fontSize: 17, color: c.ink },
  howBody: { fontFamily: f.body, fontSize: 15, lineHeight: 22, color: c.muted },
  rule: { marginTop: 30, flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start', paddingVertical: 14, paddingHorizontal: theme.spacing.base, borderRadius: 16, backgroundColor: c.sand },
  ruleText: { flex: 1, fontFamily: f.body, fontSize: 14, lineHeight: 20, color: c.ink },
  pushes: { width: 300, gap: 10 },
  push: {
    backgroundColor: c.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    borderRadius: 18,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  pushIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' },
  pushText: { flex: 1, fontFamily: f.body, fontSize: 13, lineHeight: 18, color: c.ink },
  notifTitle: { marginTop: 44 },
  notifBody: { marginTop: 14, fontSize: 16, lineHeight: 24 },
  bellButton: {
    height: 54,
    borderRadius: theme.radius.pill,
    backgroundColor: c.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  bell: { transformOrigin: 'top' },
  bellText: { fontFamily: f.bodySemibold, fontSize: 16, color: c.onInk },
  fan: { width: 300, height: 250 },
  fanSide: { position: 'absolute', top: 30, width: 128, height: 180 },
  fanLeft: { left: 0, transform: [{ rotate: '-12deg' }] },
  fanRight: { right: 0, transform: [{ rotate: '12deg' }] },
  fanCard: {
    width: 128,
    height: 180,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: c.surface,
    shadowColor: c.ink,
    shadowOpacity: 0.12,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  fanFront: {
    position: 'absolute',
    left: 76,
    top: 0,
    width: 148,
    height: 206,
    borderRadius: 22,
    backgroundColor: c.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    shadowColor: c.ink,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
  },
  fanCount: { fontFamily: f.bodySemibold, fontSize: 13, color: c.muted },
  readyTitle: { marginTop: 40, fontSize: 36, lineHeight: 43, letterSpacing: -0.5 },
  readyBody: { marginTop: 14, fontSize: 16, lineHeight: 24 },
});
