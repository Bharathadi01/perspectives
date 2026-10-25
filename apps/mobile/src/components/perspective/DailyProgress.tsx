import type { DailyStatus } from '@perspective/contracts';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

/**
 * "1 of 3 given today" with dots; unlocks the perspectives you received.
 * `dark` is the black pill beside Explore's filter button; Inbox keeps `brand`.
 */
export function DailyProgress({ daily, tone = 'brand' }: { daily: DailyStatus; tone?: 'brand' | 'dark' }) {
  const { requiredCount, givenCount, unlocked } = daily;
  const dark = tone === 'dark' && !unlocked;
  const label = unlocked
    ? 'Today’s perspectives are unlocked'
    : `${Math.min(givenCount, requiredCount)} of ${requiredCount} given today`;
  return (
    <View
      style={[s.pill, dark && s.pillDark, unlocked && s.unlocked]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: requiredCount, now: Math.min(givenCount, requiredCount) }}
    >
      {!unlocked && requiredCount > 0 ? (
        <View style={s.dots}>
          {Array.from({ length: requiredCount }, (_, i) => (
            <View key={i} style={[s.dot, dark && s.dotDark, i < givenCount && (dark ? s.dotDoneDark : s.dotDone)]} />
          ))}
        </View>
      ) : null}
      <Text style={[s.text, dark && s.textDark, unlocked && s.textUnlocked]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
  },
  // Sits in Explore's top bar beside the filter button, so it centres in that row.
  pillDark: { backgroundColor: theme.colors.ink, alignSelf: 'center' },
  unlocked: { backgroundColor: theme.colors.surfaceMuted },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: theme.colors.brand },
  dotDark: { borderColor: theme.colors.onDark },
  dotDone: { backgroundColor: theme.colors.brand },
  dotDoneDark: { backgroundColor: theme.colors.onDark },
  text: { fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.brand },
  textDark: { color: theme.colors.onDark },
  textUnlocked: { color: theme.colors.success },
});
