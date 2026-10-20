import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gender, RULES } from '@perspective/contracts';
import { GENDER_LABEL, PERSPECTIVES_ONLY_HINT, audienceQuestion, perspectivesOnly } from '../../lib/labels';
import { useOnboardingStore } from '../../session/onboardingStore';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Label, Muted } from '../ui/Text';

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={s.stepper}>
      <Label>{label}</Label>
      <View style={s.stepRow}>
        <Pressable
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => onChange(Math.max(min, value - 1))}
          style={s.stepBtn}
        >
          <Ionicons name="remove" size={20} color={theme.colors.ink} />
        </Pressable>
        <Text style={s.value}>{value}</Text>
        <Pressable
          accessibilityLabel={`Increase ${label}`}
          onPress={() => onChange(Math.min(max, value + 1))}
          style={s.stepBtn}
        >
          <Ionicons name="add" size={20} color={theme.colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

/** Step 3: the one audience setting, used both ways, worded by the goal (decided 2026-10-20). */
export function StepAudience({ onNext }: { onNext: () => void }) {
  const { goals, audienceGenders, audienceMinAge, audienceMaxAge, setField } = useOnboardingStore();

  const toggleGender = (g: Gender) => {
    const next = audienceGenders.includes(g)
      ? audienceGenders.filter((x) => x !== g)
      : [...audienceGenders, g];
    if (next.length > 0) {
      setField('audienceGenders', next);
      setField('audienceTouched', true);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.group}>
        <Label>{audienceQuestion(goals)}</Label>
        <Muted>You see people in this group, and they see you only if you are in theirs.</Muted>
        <View style={s.chipsRow}>
          {Gender.options.map((g) => (
            <Chip
              key={g}
              label={GENDER_LABEL[g]}
              selected={audienceGenders.includes(g)}
              onPress={() => toggleGender(g)}
            />
          ))}
        </View>
        {perspectivesOnly(goals) ? <Muted style={s.hint}>{PERSPECTIVES_ONLY_HINT}</Muted> : null}
      </View>

      <View style={s.group}>
        <Label>Age range</Label>
        <View style={s.stepperRow}>
          <Stepper
            label="Youngest"
            value={audienceMinAge}
            min={RULES.minAge}
            max={audienceMaxAge}
            onChange={(v) => setField('audienceMinAge', v)}
          />
          <Stepper
            label="Oldest"
            value={audienceMaxAge}
            min={audienceMinAge}
            max={RULES.maxAudienceAge}
            onChange={(v) => setField('audienceMaxAge', v)}
          />
        </View>
        <Muted style={s.hint}>If very few people fit, we may widen the age range a little and tell you.</Muted>
      </View>

      <Button title="Continue to Interests" onPress={onNext} disabled={audienceGenders.length === 0} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: theme.spacing.lg },
  group: { gap: theme.spacing.xs },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: 4 },
  stepperRow: { flexDirection: 'row', gap: theme.spacing.base, marginTop: 4 },
  stepper: {
    flex: 1,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.control,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: theme.touchTarget.min,
    height: theme.touchTarget.min,
    borderRadius: theme.touchTarget.min / 2,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.ink,
  },
  hint: { fontStyle: 'italic' },
});
