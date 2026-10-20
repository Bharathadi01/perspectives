import { DELETE_ACCOUNT_PHRASE } from '@perspective/contracts';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { useDeleteAccount } from '../features/hooks';
import { errorMessage } from '../lib/errors';
import { Button } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { TextField } from './ui/TextField';
import { useToast } from './ui/Toast';

/** In-app account deletion: the password again plus a typed phrase. Also offered on the ban screen. */
export function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const del = useDeleteAccount();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [phrase, setPhrase] = useState('');

  const confirmDelete = async () => {
    try {
      await del.run(password);
      router.replace('/(auth)/welcome');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Delete your account?"
      subtitle="This permanently deletes your profile, posts, perspectives, connections and messages. It can’t be undone."
    >
      <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      <TextField label={`Type ${DELETE_ACCOUNT_PHRASE}`} value={phrase} onChangeText={setPhrase} autoCapitalize="characters" />
      <Button
        title="Delete my account"
        variant="danger"
        disabled={phrase !== DELETE_ACCOUNT_PHRASE || password.length === 0}
        loading={del.isPending}
        onPress={() => void confirmDelete()}
      />
      <Button title="Cancel" variant="secondary" onPress={onClose} />
    </Sheet>
  );
}
