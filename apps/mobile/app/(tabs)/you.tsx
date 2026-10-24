import { MyProfile, PublicProfile } from '@perspective/contracts';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { DeleteAccountSheet } from '../../src/components/DeleteAccountSheet';
import { ProfileView } from '../../src/components/profile/ProfileView';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { Label, Muted, Title } from '../../src/components/ui/Text';
import { useLogOut, useMe, useNotices } from '../../src/features/hooks';
import { audienceQuestion } from '../../src/lib/labels';
import { theme } from '../../src/theme';

/** How others see you. Only a live profile has every basic set. */
function asPublic(me: MyProfile): PublicProfile | null {
  if (!me.displayName || !me.gender || !me.heightCm || !me.city) return null;
  return {
    id: me.id,
    displayName: me.displayName,
    pronouns: me.pronouns,
    age: me.age,
    gender: me.gender,
    heightCm: me.heightCm,
    city: me.city,
    verified: me.selfieStatus === 'verified',
    interests: me.interests ?? [],
    lifestylePace: me.lifestylePace,
    socialPreference: me.socialPreference,
    personalityPrompts: me.personalityPrompts ?? [],
    posts: me.posts,
  };
}

export default function You() {
  const me = useMe();
  const notices = useNotices();
  const logOut = useLogOut();
  const [deleting, setDeleting] = useState(false);

  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;
  const profile = asPublic(me.data);
  const unread = notices.data?.unreadCount ?? 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.content}>
        <Title>You</Title>
        <Muted>This is how your profile looks to others.</Muted>
        {profile ? <ProfileView profile={profile} /> : null}

        <View style={s.section}>
          <Label>Profile</Label>
          <Button title="Edit Profile & Live Preview" onPress={() => router.push('/me/edit')} />
          <Button title="Edit basics" variant="secondary" onPress={() => router.push({ pathname: '/me/edit', params: { section: 'basics' } })} />
          <Button title="Your goal (private)" variant="secondary" onPress={() => router.push({ pathname: '/me/edit', params: { section: 'goal' } })} />
          <Button title={audienceQuestion(me.data.goals)} variant="secondary" onPress={() => router.push({ pathname: '/me/edit', params: { section: 'audience' } })} />
          <Button
            title={unread > 0 ? `Notices (${unread} new)` : 'Notices'}
            variant="secondary"
            accessibilityLabel={unread > 0 ? `Notices, ${unread} new` : 'Notices'}
            onPress={() => router.push('/me/notices')}
          />
          <Button title="Perspectives you gave" variant="secondary" onPress={() => router.push('/me/given')} />
        </View>

        <View style={s.section}>
          <Label>Privacy & account</Label>
          <Muted>Your email, exact birthday, exact location and selfie are never shown to anyone.</Muted>
          <Button title="Blocked people" variant="secondary" onPress={() => router.push('/me/blocked')} />
          <Button title="Sign out" variant="secondary" onPress={() => void logOut.run(undefined).then(() => router.replace('/(auth)/welcome'))} />
          <Button title="Delete account" variant="ghost" onPress={() => setDeleting(true)} />
        </View>
      </ScrollView>

      <DeleteAccountSheet visible={deleting} onClose={() => setDeleting(false)} />
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: theme.spacing.base, gap: theme.spacing.base, paddingBottom: theme.spacing.xxl },
  section: { gap: theme.spacing.sm, marginTop: theme.spacing.lg },
});
