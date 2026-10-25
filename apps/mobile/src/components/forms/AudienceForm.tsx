import Ionicons from '@expo/vector-icons/Ionicons';
import { Gender, MyProfile, RULES } from '@perspective/contracts';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { audienceUpdate } from '../../features/filters/audienceUpdate';
import { useUpdateProfile } from '../../features/hooks';
import { errorMessage } from '../../lib/errors';
import { GENDER_LABEL, PERSPECTIVES_ONLY_HINT, audienceQuestion, perspectivesOnly } from '../../lib/labels';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Label, Muted } from '../ui/Text';
import { useToast } from '../ui/Toast';

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <View style={s.stepper} accessible accessibilityRole="adjustable" accessibilityLabel={`${label} ${value}`}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.min(max, Math.max(min, value + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}
    >
      <Label>{label}</Label>
      <View style={s.stepRow}>
        <Pressable accessibilityLabel={`Decrease ${label}`} onPress={() => onChange(Math.max(min, value - 1))} style={s.stepBtn}>
          <Ionicons name="remove" size={20} color={theme.colors.ink} />
        </Pressable>
        <Text style={s.value}>{value}</Text>
        <Pressable accessibilityLabel={`Increase ${label}`} onPress={() => onChange(Math.min(max, value + 1))} style={s.stepBtn}>
          <Ionicons name="add" size={20} color={theme.colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

/** The gender chips of the audience: who you see, and who may see you. */
export function GenderChips({ value, onChange }: { value: Gender[]; onChange: (next: Gender[]) => void }) {
  const toggle = (g: Gender) => onChange(value.includes(g) ? value.filter((x) => x !== g) : [...value, g]);
  return (
    <View style={s.chips}>
      {Gender.options.map((g) => (
        <Chip key={g} label={GENDER_LABEL[g]} selected={value.includes(g)} onPress={() => toggle(g)} />
      ))}
    </View>
  );
}

/** Youngest and oldest of the audience, within the server's bounds. */
export function AgeRangeFields({ minAge, maxAge, onChange }: { minAge: number; maxAge: number; onChange: (range: { minAge: number; maxAge: number }) => void }) {
  return (
    <View style={s.row}>
      <Stepper label="Youngest" value={minAge} min={RULES.minAge} max={maxAge} onChange={(v) => onChange({ minAge: v, maxAge })} />
      <Stepper label="Oldest" value={maxAge} min={minAge} max={RULES.maxAudienceAge} onChange={(v) => onChange({ minAge, maxAge: v })} />
    </View>
  );
}

/**
 * The one audience setting (decided 2026-10-20): whose profiles you see and who sees yours, worded
 * by the goal. The age range shown is the one in use, which may have been widened automatically.
 */
export function AudienceForm({ me, onSaved, submitTitle = 'Save' }: { me: MyProfile; onSaved: () => void; submitTitle?: string }) {
  const update = useUpdateProfile();
  const toast = useToast();
  const [genders, setGenders] = useState<Gender[]>(me.audience?.genders ?? []);
  const [range, setRange] = useState({ minAge: me.audience?.minAge ?? RULES.minAge, maxAge: me.audience?.maxAge ?? 35 });

  const save = async () => {
    const audience = audienceUpdate(me.audience, { genders, ...range });
    try {
      // Unchanged: nothing to send, so today's set is not rebuilt for nothing.
      if (audience) await update.run({ audience });
      onSaved();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <View style={s.form}>
      <Muted>You see people in this group, and they see you only if you are in theirs.</Muted>
      <View style={s.group}>
        <Label>{audienceQuestion(me.goals)}</Label>
        <GenderChips value={genders} onChange={setGenders} />
        {perspectivesOnly(me.goals) ? <Muted>{PERSPECTIVES_ONLY_HINT}</Muted> : null}
      </View>
      <AgeRangeFields minAge={range.minAge} maxAge={range.maxAge} onChange={setRange} />
      <Button title={submitTitle} onPress={() => void save()} disabled={genders.length === 0} loading={update.isPending} />
    </View>
  );
}

const s = StyleSheet.create({
  form: { gap: theme.spacing.lg },
  group: { gap: theme.spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  row: { flexDirection: 'row', gap: theme.spacing.base },
  stepper: { flex: 1, gap: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.control, padding: theme.spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: theme.touchTarget.min,
    height: theme.touchTarget.min,
    borderRadius: theme.touchTarget.min / 2,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.ink },
});
