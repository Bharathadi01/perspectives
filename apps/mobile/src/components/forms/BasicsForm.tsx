import { Gender, MyProfile, Orientation, RULES } from '@perspective/contracts';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useUpdateProfile } from '../../features/hooks';
import { errorMessage } from '../../lib/errors';
import { GENDER_LABEL, ORIENTATION_LABEL, normalizeDigits } from '../../lib/labels';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Label } from '../ui/Text';
import { TextField } from '../ui/TextField';
import { useToast } from '../ui/Toast';

/** Name, gender, height, orientation and city: the basics givers see. */
export function BasicsForm({ me, onSaved, submitTitle = 'Save' }: { me: MyProfile; onSaved: () => void; submitTitle?: string }) {
  const update = useUpdateProfile();
  const toast = useToast();
  const [displayName, setName] = useState(me.displayName ?? '');
  const [gender, setGender] = useState<Gender | null>(me.gender);
  const [height, setHeight] = useState(me.heightCm ? String(me.heightCm) : '');
  const [orientation, setOrientation] = useState<Orientation | null>(me.orientation);
  const [city, setCity] = useState(me.city ?? '');

  const heightNum = Number(height);
  const heightValid = Number.isInteger(heightNum) && heightNum >= RULES.heightCmMin && heightNum <= RULES.heightCmMax;
  const valid = displayName.trim().length > 0 && gender && orientation && city.trim().length >= 2 && heightValid;

  const save = async () => {
    if (!valid || !gender || !orientation) return;
    try {
      await update.run({ displayName: displayName.trim(), gender, heightCm: heightNum, orientation, city: city.trim() });
      onSaved();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <View style={s.form}>
      <TextField label="First name" value={displayName} onChangeText={setName} maxLength={RULES.displayNameMaxLength} autoComplete="given-name" />
      <View style={s.group}>
        <Label>Gender</Label>
        <View style={s.chips}>
          {Gender.options.map((g) => (
            <Chip key={g} label={GENDER_LABEL[g]} selected={gender === g} onPress={() => setGender(g)} />
          ))}
        </View>
      </View>
      <View style={s.group}>
        <TextField
          label="Height (cm)"
          value={height}
          onChangeText={(v) => {
            const digits = normalizeDigits(v).slice(0, 3);
            setHeight(digits);
          }}
          keyboardType="numeric"
          inputMode="numeric"
          autoCorrect={false}
          spellCheck={false}
          placeholder="e.g. 175"
          hint="Standard range: 120 – 230 cm"
        />
        <View style={s.chips}>
          {[160, 165, 170, 175, 180, 185].map((h) => (
            <Chip
              key={h}
              label={`${h} cm`}
              selected={height === String(h)}
              onPress={() => setHeight(String(h))}
            />
          ))}
        </View>
      </View>
      <View style={s.group}>
        <Label>Orientation</Label>
        <View style={s.chips}>
          {Orientation.options.map((o) => (
            <Chip key={o} label={ORIENTATION_LABEL[o]} selected={orientation === o} onPress={() => setOrientation(o)} />
          ))}
        </View>
      </View>
      <TextField label="City" value={city} onChangeText={setCity} hint="Only your city is shown, never your exact location." />
      <Button title={submitTitle} onPress={() => void save()} disabled={!valid} loading={update.isPending} />
    </View>
  );
}

const s = StyleSheet.create({
  form: { gap: theme.spacing.lg },
  group: { gap: theme.spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
});
