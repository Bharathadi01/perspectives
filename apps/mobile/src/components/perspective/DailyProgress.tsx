import type { DailyStatus } from '@perspective/contracts';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

/** "1 of 3 given today" with dots; unlocks the perspectives you received. */
export function DailyProgress({ daily }: { daily: DailyStatus }) {
  const { requiredCount, givenCount, unlocked } = daily;
  const label = unlocked
    ? 'Today’s perspectives are unlocked'
    : `${Math.min(givenCount, requiredCount)} of ${requiredCount} given today`;
  return (
    <View
      style={[s.pill, unlocked && s.unlocked]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: requiredCount, now: Math.min(givenCount, requiredCount) }}
    >
      {!unlocked && requiredCount > 0 ? (
        <View style={s.dots}>
          {Array.from({ length: requiredCount }, (_, i) => (
            <View key={i} style={[s.dot, i < givenCount && s.dotDone]} />
          ))}
        </View>
      ) : null}
      <Text style={[s.text, unlocked && s.textUnlocked]}>{label}</Text>
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
  unlocked: { backgroundColor: theme.colors.surfaceMuted },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: theme.colors.brand },
  dotDone: { backgroundColor: theme.colors.brand },
  text: { fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.brand },
  textUnlocked: { color: theme.colors.success },
});
