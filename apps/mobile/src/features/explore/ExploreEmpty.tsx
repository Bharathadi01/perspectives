import Ionicons from '@expo/vector-icons/Ionicons';
import type { DailyStatus } from '@perspective/contracts';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { VerifiedSeal } from '../onboarding/art';
import { Animate, Float, Rise, keyframes } from '../onboarding/motion';
import { PillButton, ob } from '../onboarding/ui';

const e = theme.editorial;

/**
 * What Explore shows when there is no profile to give to (editorial look, 2026-10-31):
 * - `done`: today's set is finished and the inbox is unlocked. Fanned cards, a clay tick that
 *   stamps in, and a way to the inbox.
 * - `nobody`: nobody is in the person's audience right now, with a way to widen it.
 * The wording is unchanged from the earlier plain screen.
 */
export function ExploreEmpty({
  daily,
  bottomSpace,
  onOpenInbox,
  onChangeAudience,
}: {
  daily: DailyStatus;
  bottomSpace: number;
  onOpenInbox: () => void;
  onChangeAudience: () => void;
}) {
  const done = daily.unlocked;
  return (
    <View style={[s.wrap, { paddingBottom: bottomSpace + theme.spacing.lg }]}>
      <View style={s.flex} />
      {done ? <DoneStage daily={daily} /> : <NobodyStage />}
      <Rise delay={done ? 700 : 300}>
        <Text style={[ob.bigTitle, s.title]} accessibilityRole="header">
          {done ? 'You’re done for today' : 'No one to show right now'}
        </Text>
      </Rise>
      <Rise delay={done ? 800 : 400}>
        <Text style={[ob.bodyMuted, s.body]}>
          {done
            ? 'Your perspectives are unlocked. Come back tomorrow for a new set.'
            : 'There’s nobody in your audience yet. Your inbox unlocks once there is, or widen who you see with the filter button.'}
        </Text>
      </Rise>
      <View style={s.flex} />
      <PillButton
        label={done ? 'Open your inbox' : 'Change who you see'}
        icon={done ? 'mail-outline' : 'options-outline'}
        onPress={done ? onOpenInbox : onChangeAudience}
        delay={done ? 1000 : 600}
        pulseDelay={done ? 1800 : 1400}
      />
    </View>
  );
}

/** Three cards fanned out, the front one stamped with the clay tick: the set is done. */
function DoneStage({ daily }: { daily: DailyStatus }) {
  return (
    <View style={s.fan} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[s.fanSide, s.fanLeft]}>
        <Animate frames={keyframes.slideX(50)} duration={800} delay={150}>
          <Float duration={5000} delay={1200} distance={6}>
            <View style={[s.fanCard, { backgroundColor: e.colors.line }]} />
          </Float>
        </Animate>
      </View>
      <View style={[s.fanSide, s.fanRight]}>
        <Animate frames={keyframes.slideX(-50)} duration={800} delay={150}>
          <Float duration={5400} delay={1400} distance={6}>
            <View style={[s.fanCard, { backgroundColor: e.colors.waveRest }]} />
          </Float>
        </Animate>
      </View>
      <Rise delay={50} style={s.front}>
        <Animate frames={keyframes.stamp()} duration={800} delay={450}>
          <VerifiedSeal size={56} />
        </Animate>
        {daily.requiredCount > 0 ? (
          <Text style={s.count}>{`${daily.requiredCount} of ${daily.requiredCount} given`}</Text>
        ) : null}
      </Rise>
    </View>
  );
}

/** A quiet, slowly drifting hourglass: nobody to show yet. */
function NobodyStage() {
  return (
    <View style={s.nobody} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rise>
        <Float duration={4000} delay={800} distance={6}>
          <View style={s.disc}>
            <Ionicons name="hourglass-outline" size={44} color={e.colors.accent} />
          </View>
        </Float>
      </Rise>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flex: 1, alignItems: 'center', paddingHorizontal: theme.spacing.xl },
  title: { marginTop: 36 },
  body: { marginTop: 14, fontSize: 16, lineHeight: 24 },
  fan: { width: 260, height: 210 },
  fanSide: { position: 'absolute', top: 26, width: 110, height: 156 },
  fanLeft: { left: 0, transform: [{ rotate: '-12deg' }] },
  fanRight: { right: 0, transform: [{ rotate: '12deg' }] },
  fanCard: {
    width: 110,
    height: 156,
    borderRadius: 18,
    borderWidth: 4,
    borderColor: e.colors.surface,
    shadowColor: e.colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  front: {
    position: 'absolute',
    left: 66,
    top: 0,
    width: 128,
    height: 178,
    borderRadius: 20,
    backgroundColor: e.colors.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: e.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    shadowColor: e.colors.ink,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  count: { fontFamily: e.fonts.bodySemibold, fontSize: 13, color: e.colors.muted },
  nobody: { height: 180, alignItems: 'center', justifyContent: 'center' },
  disc: { width: 140, height: 140, borderRadius: 70, backgroundColor: e.colors.sand, alignItems: 'center', justifyContent: 'center' },
});
