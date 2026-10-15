import { DELETE_ACCOUNT_PHRASE, MyProfile, PublicProfile } from '@perspective/contracts';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ProfileView } from '../../src/components/profile/ProfileView';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { Sheet } from '../../src/components/ui/Sheet';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { Label, Muted, Title } from '../../src/components/ui/Text';
import { TextField } from '../../src/components/ui/TextField';
import { useToast } from '../../src/components/ui/Toast';
import { useDeleteAccount, useLogOut, useMe } from '../../src/features/hooks';
import { errorMessage } from '../../src/lib/errors';
import { theme } from '../../src/theme';

/** How others see you. Only a live profile has every basic set. */
function asPublic(me: MyProfile): PublicProfile | null {
  if (!me.displayName || !me.gender || !me.heightCm || !me.orientation || !me.city) return null;
  return {
    id: me.id,
    displayName: me.displayName,
    age: me.age,
    gender: me.gender,
    heightCm: me.heightCm,
    orientation: me.orientation,
    city: me.city,
    verified: me.selfieStatus === 'verified',
    posts: me.posts,
  };
}

export default function You() {
  const me = useMe();
  const logOut = useLogOut();
  const del = useDeleteAccount();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [phrase, setPhrase] = useState('');

  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;
  const profile = asPublic(me.data);

  const confirmDelete = async () => {
    try {
      await del.run(password);
      router.replace('/(auth)/welcome');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.content}>
        <Title>You</Title>
        <Muted>This is how your profile looks to others.</Muted>
        {profile ? <ProfileView profile={profile} /> : null}

        <View style={s.section}>
          <Label>Profile</Label>
          <Button title="Edit basics" variant="secondary" onPress={() => router.push({ pathname: '/me/edit', params: { section: 'basics' } })} />
          <Button title="Who sees you" variant="secondary" onPress={() => router.push({ pathname: '/me/edit', params: { section: 'audience' } })} />
          <Button title="Perspectives you gave" variant="secondary" onPress={() => router.push('/me/given')} />
        </View>

        <View style={s.section}>
          <Label>Privacy & account</Label>
          <Muted>Your email, exact birthday, exact location and selfie are never shown to anyone.</Muted>
          <Button title="Sign out" variant="secondary" onPress={() => void logOut.run(undefined).then(() => router.replace('/(auth)/welcome'))} />
          <Button title="Delete account" variant="ghost" onPress={() => setDeleting(true)} />
        </View>
      </ScrollView>

      <Sheet
        visible={deleting}
        onClose={() => setDeleting(false)}
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
        <Button title="Cancel" variant="secondary" onPress={() => setDeleting(false)} />
      </Sheet>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: theme.spacing.base, gap: theme.spacing.base, paddingBottom: theme.spacing.xxl },
  section: { gap: theme.spacing.sm, marginTop: theme.spacing.lg },
});
