import { Goal, MyProfile } from '@perspective/contracts';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useUpdateProfile } from '../../features/hooks';
import { errorMessage } from '../../lib/errors';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { Muted } from '../ui/Text';
import { useToast } from '../ui/Toast';
import { GoalPicker } from './GoalPicker';

/** Change the private goal from Edit profile. */
export function GoalForm({ me, onSaved }: { me: MyProfile; onSaved: () => void }) {
  const update = useUpdateProfile();
  const toast = useToast();
  const [goals, setGoals] = useState<Goal[]>(me.goals);

  const save = async () => {
    try {
      await update.run({ goals });
      onSaved();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <View style={s.form}>
      <GoalPicker value={goals} onChange={setGoals} />
      <Muted>Only you see this. It is never shown on your profile or to the people you connect with.</Muted>
      <Button title="Save" onPress={() => void save()} disabled={goals.length === 0} loading={update.isPending} />
    </View>
  );
}

const s = StyleSheet.create({
  form: { gap: theme.spacing.lg },
});
