import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { DeleteAccountSheet } from '../../src/components/DeleteAccountSheet';
import { ListGroup } from '../../src/components/ui/ListGroup';
import { ListRow } from '../../src/components/ui/ListRow';
import { Screen } from '../../src/components/ui/Screen';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { useLogOut, useMe, useNotices } from '../../src/features/hooks';
import { GENDER_LABEL, GOAL_LABEL, audienceQuestion, formatHeight } from '../../src/lib/labels';
import { theme } from '../../src/theme';

/**
 * Everything that is not your profile itself.
 *
 * The first three groups work today; they moved here off the You tab, which now
 * only shows and edits the profile. The groups after them are placeholders:
 * their rows take no press and say "Soon", rather than looking like buttons
 * that are broken.
 */
export default function Settings() {
  const me = useMe();
  const notices = useNotices();
  const logOut = useLogOut();
  const [deleting, setDeleting] = useState(false);

  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;

  const profile = me.data;
  const basics = [
    profile.age ? `${profile.age}` : null,
    profile.gender ? GENDER_LABEL[profile.gender] : null,
    profile.city,
    profile.heightCm ? formatHeight(profile.heightCm) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const goals = profile.goals.length > 0
    ? profile.goals.map((g) => GOAL_LABEL[g].title).join(' and ')
    : 'Choose your goal';

  const audience = profile.audience
    ? `Ages ${profile.audience.minAge}–${profile.audience.maxAge} · ${profile.audience.genders
        .map((g) => GENDER_LABEL[g].toLowerCase())
        .join(', ')}`
    : 'Not set yet';

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Settings" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.content}>
        <ListGroup title="Your profile">
          <ListRow title="The basics" subtitle={basics} onPress={() => router.push('/me/basics')} />
          <ListRow title="Your goal (private)" subtitle={goals} onPress={() => router.push('/me/goal')} />
          <ListRow
            title={audienceQuestion(profile.goals)}
            subtitle={audience}
            onPress={() => router.push('/me/audience')}
          />
        </ListGroup>

        <ListGroup title="Activity">
          <ListRow
            title="Notices"
            badge={notices.data?.unreadCount ?? 0}
            onPress={() => router.push('/me/notices')}
          />
          <ListRow title="Perspectives you gave" onPress={() => router.push('/me/given')} />
        </ListGroup>

        <ListGroup
          title="Privacy & account"
          footer="Your email, exact birthday, exact location and selfie are never shown to anyone."
        >
          <ListRow title="Blocked people" onPress={() => router.push('/me/blocked')} />
          <ListRow
            title="Sign out"
            accessory="none"
            onPress={() => void logOut.run(undefined).then(() => router.replace('/(auth)/welcome'))}
          />
          <ListRow
            title="Delete account"
            accessory="none"
            destructive
            onPress={() => setDeleting(true)}
          />
        </ListGroup>

        <ListGroup title="Notifications">
          <ListRow title="Push notifications" value="Soon" disabled />
          <ListRow title="Email updates" value="Soon" disabled />
          <ListRow title="Quiet hours" value="Soon" disabled />
        </ListGroup>

        <ListGroup title="About" footer="Nothing in this group is built yet.">
          <ListRow title="Terms of Service" value="Soon" disabled />
          <ListRow title="Privacy Policy" value="Soon" disabled />
          <ListRow title="Community Guidelines" value="Soon" disabled />
          <ListRow title="Version" value="0.1.0" disabled />
        </ListGroup>
      </ScrollView>

      <DeleteAccountSheet visible={deleting} onClose={() => setDeleting(false)} />
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
});
