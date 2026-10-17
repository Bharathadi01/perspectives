import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gender, Orientation, RULES } from '@perspective/contracts';
import { GENDER_LABEL, ORIENTATION_LABEL } from '../../lib/labels';
import { useOnboardingStore } from '../../session/onboardingStore';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Label, Muted } from '../ui/Text';
import { TextField } from '../ui/TextField';
import { SelfieStep } from '../forms/SelfieStep';

const PRONOUN_PRESETS = ['she/her', 'he/him', 'they/them', 'she/they', 'he/they'];

export function StepAboutYou({ onNext }: { onNext: () => void }) {
  const {
    displayName,
    gender,
    pronouns,
    heightCm,
    orientation,
    city,
    selfieVerified,
    setField,
  } = useOnboardingStore();

  const heightNum = Number(heightCm);
  const heightValid = Number.isInteger(heightNum) && heightNum >= RULES.heightCmMin && heightNum <= RULES.heightCmMax;
  const nameValid = displayName.trim().length >= 1;
  const cityValid = city.trim().length >= 2;
  const isValid = nameValid && gender !== null && orientation !== null && cityValid && heightValid;

  return (
    <View style={s.container}>
      <TextField
        label="First name"
        value={displayName}
        onChangeText={(v) => setField('displayName', v)}
        maxLength={RULES.displayNameMaxLength}
        placeholder="How people should address you"
        autoComplete="given-name"
      />

      {/* Gender */}
      <View style={s.group}>
        <Label>Gender</Label>
        <View style={s.chipsRow}>
          {Gender.options.map((g) => (
            <Chip
              key={g}
              label={GENDER_LABEL[g]}
              selected={gender === g}
              onPress={() => setField('gender', g)}
            />
          ))}
        </View>
      </View>

      {/* Pronouns (Optional) */}
      <View style={s.group}>
        <View style={s.labelWithHint}>
          <Label>Pronouns</Label>
          <Muted style={s.optionalTag}>Optional</Muted>
        </View>
        <View style={s.chipsRow}>
          {PRONOUN_PRESETS.map((p) => (
            <Chip
              key={p}
              label={p}
              selected={pronouns === p}
              onPress={() => setField('pronouns', pronouns === p ? '' : p)}
            />
          ))}
        </View>
      </View>

      {/* Height */}
      <TextField
        label="Height (cm)"
        value={heightCm}
        onChangeText={(v) => {
          const digitsOnly = v.replace(/[^0-9]/g, '').slice(0, 3);
          setField('heightCm', digitsOnly);
        }}
        keyboardType="number-pad"
        inputMode="numeric"
        autoCorrect={false}
        spellCheck={false}
        placeholder="e.g. 175"
        hint={heightCm.length > 0 && heightCm.length < 3 ? 'Enter your full height in centimeters (e.g. 175)' : undefined}
        error={heightCm.length >= 3 && !heightValid ? `Between ${RULES.heightCmMin} and ${RULES.heightCmMax} cm` : undefined}
      />

      {/* Orientation */}
      <View style={s.group}>
        <Label>Orientation</Label>
        <View style={s.chipsRow}>
          {Orientation.options.map((o) => (
            <Chip
              key={o}
              label={ORIENTATION_LABEL[o]}
              selected={orientation === o}
              onPress={() => setField('orientation', o)}
            />
          ))}
        </View>
      </View>

      {/* City */}
      <TextField
        label="City"
        value={city}
        onChangeText={(v) => setField('city', v)}
        placeholder="e.g. Mumbai, Bangalore"
        hint="Only your broad city is shown, never your precise location."
      />

      {/* Adult Selfie Verification */}
      <View style={s.selfieBox}>
        <View style={s.labelWithHint}>
          <Label>Identity & 18+ Verification</Label>
          {selfieVerified ? (
            <Text style={s.verifiedTag}>✓ Verified</Text>
          ) : (
            <Text style={s.unverifiedTag}>Required</Text>
          )}
        </View>
        <Muted>
          {selfieVerified
            ? 'Your adult selfie is verified. Your photo stays 100% private and is never shown publicly.'
            : 'Take a quick private selfie to verify your adulthood and prevent impersonation.'}
        </Muted>
        {!selfieVerified && (
          <SelfieStep onVerified={() => setField('selfieVerified', true)} />
        )}
      </View>

      <Button
        title="Continue to Preferences"
        onPress={onNext}
        disabled={!isValid || !selfieVerified}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: theme.spacing.lg },
  group: { gap: theme.spacing.xs },
  labelWithHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionalTag: { fontSize: theme.typography.fontSize.xs, color: theme.colors.muted },
  verifiedTag: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.success,
  },
  unverifiedTag: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.brand,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  selfieBox: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
});
