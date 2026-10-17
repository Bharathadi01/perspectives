import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  LifestylePace,
  LIFESTYLE_PACE_LABELS,
  SocialPreference,
  SOCIAL_PREFERENCE_LABELS,
} from '@perspective/contracts';
import { useOnboardingStore } from '../../session/onboardingStore';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { Label, Muted } from '../ui/Text';

export function StepWhatMatters({ onNext }: { onNext: () => void }) {
  const { lifestylePace, socialPreference, setField } = useOnboardingStore();

  return (
    <View style={s.container}>
      {/* Daily Rhythm / Pace */}
      <View style={s.group}>
        <View style={s.labelRow}>
          <Label>Daily Rhythm & Pace</Label>
          <Muted style={s.optionalTag}>Optional</Muted>
        </View>
        <Muted>How your days typically flow.</Muted>
        <View style={s.optionsList}>
          {LifestylePace.options.map((key) => {
            const item = LIFESTYLE_PACE_LABELS[key];
            const isSelected = lifestylePace === key;
            return (
              <Pressable
                key={key}
                onPress={() => setField('lifestylePace', isSelected ? null : key)}
                style={[s.optionCard, isSelected && s.optionCardSelected]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={isSelected ? theme.colors.surface : theme.colors.brand}
                />
                <Text style={[s.optionText, isSelected && s.optionTextSelected]}>{item.label}</Text>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.surface} />
                ) : (
                  <View style={s.radio} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Social Energy */}
      <View style={s.group}>
        <View style={s.labelRow}>
          <Label>Social Energy & Battery</Label>
          <Muted style={s.optionalTag}>Optional</Muted>
        </View>
        <Muted>How you prefer to spend your social battery.</Muted>
        <View style={s.optionsList}>
          {SocialPreference.options.map((key) => {
            const item = SOCIAL_PREFERENCE_LABELS[key];
            const isSelected = socialPreference === key;
            return (
              <Pressable
                key={key}
                onPress={() => setField('socialPreference', isSelected ? null : key)}
                style={[s.optionCard, isSelected && s.optionCardSelected]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={isSelected ? theme.colors.surface : theme.colors.brand}
                />
                <Text style={[s.optionText, isSelected && s.optionTextSelected]}>{item.label}</Text>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.surface} />
                ) : (
                  <View style={s.radio} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={s.actions}>
        <Button title="Continue to Personality" onPress={onNext} />
        <Button title="Skip for now" variant="ghost" onPress={onNext} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: theme.spacing.lg },
  group: { gap: theme.spacing.xs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionalTag: { fontSize: theme.typography.fontSize.xs, color: theme.colors.muted },
  optionsList: { gap: theme.spacing.sm, marginTop: 4 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  optionCardSelected: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  optionText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.ink,
  },
  optionTextSelected: {
    color: theme.colors.surface,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  actions: { gap: theme.spacing.xs, marginTop: theme.spacing.sm },
});
