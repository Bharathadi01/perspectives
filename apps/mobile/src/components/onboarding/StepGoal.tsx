import Ionicons from '@expo/vector-icons/Ionicons';
import { Goal } from '@perspective/contracts';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useOnboardingStore } from '../../session/onboardingStore';
import { theme } from '../../theme';
import { GoalPicker } from '../forms/GoalPicker';
import { Button } from '../ui/Button';
import { Muted } from '../ui/Text';

/** Step 2: the private goal (decided 2026-10-20). One or both; never shown to anyone. */
export function StepGoal({ onNext }: { onNext: () => void }) {
  const goals = useOnboardingStore((s) => s.goals);
  const setGoals = useOnboardingStore((s) => s.setGoals);

  return (
    <View style={s.container}>
      <GoalPicker value={goals} onChange={(next: Goal[]) => setGoals(next)} />
      <View style={s.privateNote}>
        <Ionicons name="lock-closed-outline" size={16} color={theme.colors.muted} />
        <Muted style={s.privateText}>Only you see this. It is never shown on your profile or to the people you connect with.</Muted>
      </View>
      <Button title="Continue" onPress={onNext} disabled={goals.length === 0} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: theme.spacing.lg },
  privateNote: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' },
  privateText: { flex: 1 },
});
