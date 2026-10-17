import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { DatingIntention, DATING_INTENTION_CONFIG, Gender, RULES } from '@perspective/contracts';
import { GENDER_LABEL } from '../../lib/labels';
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

export function StepAudienceIntentions({ onNext }: { onNext: () => void }) {
  const {
    audienceGenders,
    audienceMinAge,
    audienceMaxAge,
    datingIntention,
    intentionDealbreaker,
    setField,
  } = useOnboardingStore();

  const toggleGender = (g: Gender) => {
    const next = audienceGenders.includes(g)
      ? audienceGenders.filter((x) => x !== g)
      : [...audienceGenders, g];
    if (next.length > 0) setField('audienceGenders', next);
  };

  const isValid = audienceGenders.length > 0 && datingIntention !== null;

  return (
    <View style={s.container}>
      {/* Gender Preferences */}
      <View style={s.group}>
        <Label>I want to meet</Label>
        <Muted>Select everyone you are open to seeing and being seen by.</Muted>
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
      </View>

      {/* Age Range */}
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
      </View>

      {/* Dating Intentions */}
      <View style={s.group}>
        <Label>What is your relationship goal?</Label>
        <Muted>Helps us recommend people who are on the same page.</Muted>
        <View style={s.intentionsList}>
          {DatingIntention.options.map((key) => {
            const config = DATING_INTENTION_CONFIG[key];
            const isSelected = datingIntention === key;
            return (
              <Pressable
                key={key}
                onPress={() => setField('datingIntention', key)}
                style={[s.intentionCard, isSelected && s.intentionCardSelected]}
              >
                <View style={[s.intentionIconBox, isSelected && s.intentionIconBoxSelected]}>
                  <Ionicons
                    name={config.icon as any}
                    size={20}
                    color={isSelected ? theme.colors.surface : theme.colors.brand}
                  />
                </View>
                <View style={s.intentionText}>
                  <Text style={[s.intentionTitle, isSelected && s.intentionTitleSelected]}>
                    {config.label}
                  </Text>
                  <Text style={s.intentionDesc}>{config.description}</Text>
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.brand} />
                ) : (
                  <View style={s.radioCircle} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Dealbreaker Toggle */}
      <View style={s.dealbreakerBox}>
        <View style={s.dealbreakerText}>
          <Text style={s.dealbreakerTitle}>Make intention a hard dealbreaker</Text>
          <Text style={s.dealbreakerDesc}>
            Only recommend people with compatible relationship goals.
          </Text>
        </View>
        <Switch
          value={intentionDealbreaker}
          onValueChange={(val) => setField('intentionDealbreaker', val)}
          trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
          thumbColor={theme.colors.surface}
        />
      </View>

      <Button
        title="Continue to Interests"
        onPress={onNext}
        disabled={!isValid}
      />
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
  intentionsList: { gap: theme.spacing.sm, marginTop: 4 },
  intentionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  intentionCardSelected: {
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.brandSoft,
  },
  intentionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentionIconBoxSelected: {
    backgroundColor: theme.colors.brand,
  },
  intentionText: { flex: 1, gap: 2 },
  intentionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.ink,
  },
  intentionTitleSelected: {
    color: theme.colors.brand,
  },
  intentionDesc: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    lineHeight: theme.typography.fontSize.xs * 1.35,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  dealbreakerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surfaceMuted,
    gap: theme.spacing.md,
  },
  dealbreakerText: { flex: 1, gap: 2 },
  dealbreakerTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.ink,
  },
  dealbreakerDesc: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
  },
});
