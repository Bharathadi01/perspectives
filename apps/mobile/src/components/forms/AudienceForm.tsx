import Ionicons from '@expo/vector-icons/Ionicons';
import { Gender, MyProfile, RULES } from '@perspective/contracts';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useUpdateProfile } from '../../features/hooks';
import { errorMessage } from '../../lib/errors';
import { GENDER_LABEL } from '../../lib/labels';
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

/** Who may see your profile (and, in v1, whose profiles you see): gender and age range, 18+. */
export function AudienceForm({ me, onSaved, submitTitle = 'Save' }: { me: MyProfile; onSaved: () => void; submitTitle?: string }) {
  const update = useUpdateProfile();
  const toast = useToast();
  const [genders, setGenders] = useState<Gender[]>(me.audience?.genders ?? []);
  const [minAge, setMin] = useState(me.audience?.minAge ?? RULES.minAge);
  const [maxAge, setMax] = useState(me.audience?.maxAge ?? 35);

  const toggle = (g: Gender) => setGenders((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));

  const save = async () => {
    try {
      await update.run({ audience: { genders, minAge, maxAge } });
      onSaved();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <View style={s.form}>
      <Muted>Your profile is shown only to people in this group, and you see people whose group includes you.</Muted>
      <View style={s.group}>
        <Label>Show me to</Label>
        <View style={s.chips}>
          {Gender.options.map((g) => (
            <Chip key={g} label={GENDER_LABEL[g]} selected={genders.includes(g)} onPress={() => toggle(g)} />
          ))}
        </View>
      </View>
      <View style={s.row}>
        <Stepper label="Youngest" value={minAge} min={RULES.minAge} max={maxAge} onChange={setMin} />
        <Stepper label="Oldest" value={maxAge} min={minAge} max={RULES.maxAudienceAge} onChange={setMax} />
      </View>
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
