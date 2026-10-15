import { Gender, MyProfile, Orientation, RULES } from '@perspective/contracts';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useUpdateProfile } from '../../features/hooks';
import { errorMessage } from '../../lib/errors';
import { GENDER_LABEL, ORIENTATION_LABEL } from '../../lib/labels';
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
      <TextField
        label="Height (cm)"
        value={height}
        onChangeText={(v) => setHeight(v.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        maxLength={3}
        error={height.length > 0 && !heightValid ? `Between ${RULES.heightCmMin} and ${RULES.heightCmMax} cm` : undefined}
      />
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
