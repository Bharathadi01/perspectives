import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import { PhotoGlyph, Star } from '../art';
import { Animate, Float, Pop, Rise, keyframes } from '../motion';
import { useStepNav } from '../nav';
import { PillButton, ob } from '../ui';

const e = theme.editorial;
const c = e.colors;
const f = e.fonts;

/** The illustrations are drawn on the design's 334 × 410 stage and scaled to fit the phone. */
const STAGE_W = 334;
const STAGE_H = 410;

interface ValueScreenProps {
  index: 1 | 2 | 3 | 4;
  title: string;
  body: string;
  /** When the words come in, after the illustration has played. */
  textDelay: number;
  stage: React.ReactNode;
  onContinue: () => void;
}

/** "What you get": one promise of the app, told by a small animation, between onboarding sections. */
function ValueScreen({ index, title, body, textDelay, stage, onContinue }: ValueScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scale = Math.min(1, (width - 56) / STAGE_W, Math.max(0.6, (height - 430) / STAGE_H));
  return (
    <View style={[s.screen, { paddingTop: insets.top + theme.spacing.base, paddingBottom: Math.max(insets.bottom, theme.spacing.base) + theme.spacing.base }]}>
      <View style={s.top}>
        <Text style={ob.overline}>What you get</Text>
        <View style={s.dots} accessible accessibilityLabel={`${index} of 4`}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[s.dot, i === index && s.dotOn]} />
          ))}
        </View>
      </View>
      <View style={[s.stageBox, { height: STAGE_H * scale }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[s.stage, { transform: [{ scale }] }]}>{stage}</View>
      </View>
      <Rise delay={textDelay}>
        <Text style={s.title} accessibilityRole="header">
          {title}
        </Text>
      </Rise>
      <Rise delay={textDelay + 100}>
        <Text style={s.body}>{body}</Text>
      </Rise>
      <View style={s.flex} />
      <PillButton label="Continue" onPress={onContinue} delay={textDelay + 300} pulseDelay={textDelay + 1100} />
    </View>
  );
}

/** A small perspective card placed on the stage, tilted, that pops in and then drifts. */
function Bubble({
  at,
  tilt,
  popDelay,
  floatDuration,
  floatDelay,
  floatDistance = 7,
  children,
}: {
  at: ViewStyle;
  tilt: number;
  popDelay: number;
  floatDuration: number;
  floatDelay: number;
  floatDistance?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={[s.abs, at, { transform: [{ rotate: `${tilt}deg` }] }]}>
      <Pop delay={popDelay} duration={600}>
        <Float duration={floatDuration} delay={floatDelay} distance={floatDistance}>
          {children}
        </Float>
      </Pop>
    </View>
  );
}

function Quote({ label, text, tone }: { label: string; text: string; tone: 'white' | 'ink' | 'sand' }) {
  const ink = tone === 'ink';
  return (
    <View style={[s.quote, tone === 'white' && s.quoteWhite, ink && s.quoteInk, tone === 'sand' && s.quoteSand]}>
      <Text style={[s.quoteLabel, ink && { color: c.onInkMuted }]}>{label}</Text>
      <Text style={[s.quoteText, ink && { color: c.onInk }]}>{text}</Text>
    </View>
  );
}

// ---------- 1 · after the birthday ----------

export function ValuePerspectives() {
  const { next } = useStepNav('value-perspectives');
  return (
    <ValueScreen
      index={1}
      title="Honest takes on how you show up"
      body="Real people write about how you look, dress, sound and come across. One person’s view each time, in their own words."
      textDelay={900}
      onContinue={() => next()}
      stage={
        <>
          <Rise delay={100} style={[s.abs, s.postCard]}>
            <Text style={s.postPrompt}>Does this jacket work on me?</Text>
            <View style={s.postPhoto}>
              <PhotoGlyph />
            </View>
          </Rise>
          <Bubble at={{ left: -4, top: 6, width: 200 }} tilt={-3} popDelay={450} floatDuration={4000} floatDelay={1200}>
            <Quote tone="white" label="Style & outfit" text="“The jacket works. Swap the shoes for something lighter.”" />
          </Bubble>
          <Bubble at={{ right: -6, top: 176, width: 196 }} tilt={2.5} popDelay={800} floatDuration={4600} floatDelay={1600}>
            <Quote tone="ink" label="Voice" text="“You sound warm. Slow down a little at the start.”" />
          </Bubble>
          <Bubble at={{ left: 10, top: 318, width: 214 }} tilt={-1.5} popDelay={1150} floatDuration={5000} floatDelay={2000}>
            <Quote tone="sand" label="Overall vibe" text="“Easy to approach. The smile does a lot of work.”" />
          </Bubble>
        </>
      }
    />
  );
}

// ---------- 2 · after "what people see" ----------

export function ValueWords() {
  const { next } = useStepNav('value-words');
  return (
    <ValueScreen
      index={2}
      title="Words, never scores"
      body="Every perspective is written, so you learn why, not just how many. Only you read the ones about you."
      textDelay={1500}
      onContinue={() => next()}
      stage={
        <View style={s.wordsStage}>
          <Rise delay={100} duration={600} style={s.ratingWrap}>
            <View style={s.rating}>
              <Animate frames={keyframes.dim()} duration={600} delay={1000} style={s.stars}>
                {[0, 1, 2, 3].map((i) => (
                  <Star key={i} color={c.ink} />
                ))}
                <Star color={c.waveRest} />
              </Animate>
              <Animate frames={keyframes.dim()} duration={600} delay={1000}>
                <Text style={s.ratingNumber}>4.2</Text>
              </Animate>
              <Animate frames={keyframes.growX()} duration={500} delay={700} style={s.strike} />
            </View>
          </Rise>
          <Rise delay={1000} duration={500} style={s.centerSelf}>
            <Text style={s.noRatings}>No ratings. No likes. No leaderboards.</Text>
          </Rise>
          <View style={{ transform: [{ rotate: '-1.5deg' }] }}>
            <Rise delay={1300}>
              <Float duration={4500} delay={2200} distance={6}>
                <View style={s.bigQuote}>
                  <Text style={ob.clayLabel}>A perspective · Looks & photos</Text>
                  <Text style={s.bigQuoteText}>
                    “You look most like yourself in the candid one. Lead with that photo, the posed one feels stiff.”
                  </Text>
                  <View style={s.onlyYou}>
                    <Ionicons name="lock-closed-outline" size={14} color={c.muted} />
                    <Text style={s.onlyYouText}>Only you can read this</Text>
                  </View>
                </View>
              </Float>
            </Rise>
          </View>
        </View>
      }
    />
  );
}

// ---------- 3 · after the audience ----------

export function ValueConnect() {
  const { next } = useStepNav('value-connect');
  return (
    <ValueScreen
      index={3}
      title="Connect through what you noticed"
      body="Give someone a perspective, then ask to connect. When they give one back, chat opens. No messages out of nowhere."
      textDelay={2200}
      onContinue={() => next()}
      stage={
        <View style={s.connectStage}>
          <Animate frames={keyframes.growY()} duration={2000} delay={200} easing="ease" style={s.thread} />
          <Pop delay={300} duration={550} style={s.endSelf}>
            <View style={[s.bubble, s.bubbleMine]}>
              <Text style={[s.bubbleLabel, { color: c.onInkMuted }]}>You · on Meera’s post</Text>
              <Text style={[s.bubbleText, { color: c.onInk }]}>“The green suits you. Wear it to the gig.”</Text>
            </View>
          </Pop>
          <Pop delay={900} style={s.endSelf}>
            <View style={s.asked}>
              <Ionicons name="add" size={15} color={c.accentText} />
              <Text style={s.askedText}>Asked to connect</Text>
            </View>
          </Pop>
          <Pop delay={1500} duration={550} style={s.startSelf}>
            <View style={[s.bubble, s.bubbleTheirs]}>
              <Text style={[s.bubbleLabel, { color: c.muted }]}>Meera · gave one back</Text>
              <Text style={s.bubbleText}>“Ha, noted. Your voice post is so calm.”</Text>
            </View>
          </Pop>
          <Pop delay={2000} duration={600} style={[s.centerSelf, s.chatOpenWrap]}>
            <Float duration={3400} delay={2800} distance={5}>
              <View style={s.chatOpen}>
                <Ionicons name="chatbubble-outline" size={18} color={c.surface} />
                <Text style={s.chatOpenText}>Chat is open</Text>
              </View>
            </Float>
          </Pop>
        </View>
      }
    />
  );
}

// ---------- 4 · after the selfie ----------

export function ValueSeen() {
  const { next, me } = useStepNav('value-seen');
  const initial = (me.data?.displayName ?? '').trim().charAt(0).toUpperCase() || 'P';
  return (
    <ValueScreen
      index={4}
      title="Nobody gets left out"
      body="Each day, profiles are shared out so everyone hears from someone. If a few quiet days go by, we put yours in front of more people."
      textDelay={800}
      onContinue={() => next()}
      stage={
        <View style={s.orbitStage}>
          <View style={[s.ring, s.ring300]} />
          <View style={[s.ring, s.ring200]} />
          <Animate frames={keyframes.ripple()} duration={2400} delay={600} iterations="infinite" easing="ease" style={[s.ring, s.ring120]} />
          <Animate frames={keyframes.spin()} duration={26000} iterations="infinite" easing="linear" style={s.orbit300}>
            <Animate frames={keyframes.spin(true)} duration={26000} iterations="infinite" easing="linear" style={[s.planet, { left: 132, top: -18, width: 36, height: 36, backgroundColor: c.line }]} />
            <View style={[s.planet, { right: -10, top: 134, width: 32, height: 32, backgroundColor: c.waveRest }]} />
            <View style={[s.planet, { left: 40, bottom: 6, width: 30, height: 30, backgroundColor: c.ink }]} />
            <View style={[s.planet, { left: -12, top: 96, width: 26, height: 26, backgroundColor: c.line }]} />
          </Animate>
          <Animate frames={keyframes.spin(true)} duration={18000} iterations="infinite" easing="linear" style={s.orbit200}>
            <View style={[s.planet, { right: 8, top: 18, width: 26, height: 26, backgroundColor: c.accent }]} />
            <View style={[s.planet, { left: 6, bottom: 30, width: 24, height: 24, backgroundColor: c.waveRest }]} />
          </Animate>
          <Pop delay={100} duration={600}>
            <View style={s.me}>
              <Text style={s.meInitial}>{initial}</Text>
            </View>
          </Pop>
          <View style={[s.abs, { top: 72, right: 22 }]}>
            <Pop delay={1200}>
              <Float duration={3600} delay={2000} distance={6}>
                <View style={s.newChip}>
                  <View style={s.newDot} />
                  <Text style={s.newChipText}>New perspective</Text>
                </View>
              </Float>
            </Pop>
          </View>
        </View>
      }
    />
  );
}

const shadow = (opacity: number, radius: number, y: number) => ({
  shadowColor: c.ink,
  shadowOpacity: opacity,
  shadowRadius: radius,
  shadowOffset: { width: 0, height: y },
  elevation: Math.round(radius / 3),
});

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: c.paper, paddingHorizontal: theme.spacing.lg + theme.spacing.xs },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.waveRest },
  dotOn: { width: 18, backgroundColor: c.accent },
  stageBox: { marginTop: 14, alignItems: 'center', justifyContent: 'flex-start' },
  stage: { width: STAGE_W, height: STAGE_H, transformOrigin: 'top' },
  title: {
    marginTop: 18,
    textAlign: 'center',
    fontFamily: f.display,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.4,
    color: c.ink,
  },
  body: { marginTop: theme.spacing.md, textAlign: 'center', fontFamily: f.body, fontSize: 15, lineHeight: 22, color: c.muted },
  abs: { position: 'absolute' },
  centerSelf: { alignSelf: 'center' },
  endSelf: { alignSelf: 'flex-end' },
  startSelf: { alignSelf: 'flex-start' },

  postCard: {
    left: 72,
    top: 64,
    width: 190,
    backgroundColor: c.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    borderRadius: 22,
    padding: 14,
    gap: 10,
    ...shadow(0.08, 15, 10),
  },
  postPrompt: { fontFamily: f.display, fontSize: 16, lineHeight: 21, color: c.ink },
  postPhoto: { height: 170, borderRadius: 14, backgroundColor: c.line, alignItems: 'center', justifyContent: 'center' },
  quote: { borderRadius: 18, paddingVertical: theme.spacing.md, paddingHorizontal: 14, gap: theme.spacing.xs },
  quoteWhite: { backgroundColor: c.surface, borderWidth: theme.borderWidth.hairline, borderColor: c.line, ...shadow(0.1, 11, 8) },
  quoteInk: { backgroundColor: c.ink, ...shadow(0.18, 11, 8) },
  quoteSand: { backgroundColor: c.sand, ...shadow(0.08, 11, 8) },
  quoteLabel: { fontFamily: f.bodyBold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: c.accentText },
  quoteText: { fontFamily: f.body, fontSize: 13, lineHeight: 18, color: c.ink },

  wordsStage: { flex: 1, justifyContent: 'center', gap: 22 },
  ratingWrap: { alignSelf: 'center' },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: c.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  stars: { flexDirection: 'row', gap: theme.spacing.xs },
  ratingNumber: { fontFamily: f.bodySemibold, fontSize: 18, color: c.ink },
  strike: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    top: '50%',
    height: 3,
    marginTop: -1.5,
    borderRadius: 2,
    backgroundColor: c.accent,
    transformOrigin: 'left',
  },
  noRatings: { fontFamily: f.bodySemibold, fontSize: 13, color: c.muted },
  bigQuote: {
    backgroundColor: c.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    borderRadius: 22,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: theme.spacing.base,
    gap: theme.spacing.md,
    ...shadow(0.1, 17, 14),
  },
  bigQuoteText: { fontFamily: f.displayItalic, fontSize: 20, lineHeight: 27, color: c.ink },
  onlyYou: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlyYouText: { fontFamily: f.body, fontSize: 12, color: c.muted },

  connectStage: { flex: 1, justifyContent: 'center', gap: 14 },
  thread: {
    position: 'absolute',
    left: STAGE_W / 2 - 1,
    top: 70,
    bottom: 90,
    width: 2,
    backgroundColor: c.line,
    transformOrigin: 'top',
  },
  bubble: { maxWidth: 240, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.base, gap: 3 },
  bubbleMine: { backgroundColor: c.ink, borderRadius: 20, borderBottomRightRadius: 6 },
  bubbleTheirs: {
    backgroundColor: c.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
  },
  bubbleLabel: { fontFamily: f.bodySemibold, fontSize: 11 },
  bubbleText: { fontFamily: f.body, fontSize: 14, lineHeight: 20, color: c.ink },
  asked: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    borderWidth: theme.borderWidth.thick,
    borderColor: c.accent,
    backgroundColor: c.paper,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  askedText: { fontFamily: f.bodySemibold, fontSize: 13, color: c.accentText },
  chatOpenWrap: { marginTop: theme.spacing.sm },
  chatOpen: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: theme.radius.pill,
    // The darker clay keeps white text above 4.5:1.
    backgroundColor: c.accentText,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    ...shadow(0.3, 12, 10),
    shadowColor: c.accent,
  },
  chatOpenText: { fontFamily: f.bodySemibold, fontSize: 15, color: c.surface },

  orbitStage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderRadius: 999 },
  ring300: { width: 300, height: 300, borderWidth: 1, borderStyle: 'dashed', borderColor: c.waveRest },
  ring200: { width: 200, height: 200, borderWidth: 1, borderColor: c.line },
  ring120: { width: 120, height: 120, borderWidth: 2, borderColor: c.accent },
  orbit300: { position: 'absolute', width: 300, height: 300 },
  orbit200: { position: 'absolute', width: 200, height: 200 },
  planet: { position: 'absolute', borderRadius: 999, borderWidth: 3, borderColor: c.paper },
  me: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: c.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(0.25, 15, 12),
  },
  meInitial: { fontFamily: f.display, fontSize: 38, color: c.onInk },
  newChip: {
    height: 34,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: c.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...shadow(0.1, 8, 6),
  },
  newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent },
  newChipText: { fontFamily: f.bodySemibold, fontSize: 12, color: c.ink },
});
