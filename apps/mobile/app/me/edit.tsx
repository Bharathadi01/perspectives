import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { Muted, Title } from '../../src/components/ui/Text';
import { useToast } from '../../src/components/ui/Toast';
import { useMe } from '../../src/features/hooks';
import { ProfileEditor } from '../../src/features/profile-editor/ProfileEditor';
import { theme } from '../../src/theme';

type Section = 'basics' | 'goal' | 'audience' | 'all';

/**
 * The editor moved onto the You tab. This route stays for two reasons:
 * older links to its sections, and the hand-off at the end of onboarding.
 *
 * That hand-off cannot go to the tab. A profile is not live until it has a
 * first photo, and the tab layout sends anyone who is not live back to
 * onboarding — so pointing onboarding at the tab would bounce the person
 * between the two forever. The editor is hosted here instead, outside the
 * tabs, until the first photo exists.
 */
export default function Edit() {
  const { section, from } = useLocalSearchParams<{ section?: Section; from?: string }>();
  const me = useMe();
  const toast = useToast();

  if (section === 'basics') return <Redirect href="/me/basics" />;
  if (section === 'goal') return <Redirect href="/me/goal" />;
  if (section === 'audience') return <Redirect href="/me/audience" />;

  if (from !== 'onboarding') {
    return <Redirect href={{ pathname: '/(tabs)/you', params: { mode: 'edit' } }} />;
  }

  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;

  const hasPhoto = me.data.posts.some((post) => post.kind === 'photo');

  const finish = () => {
    if (!hasPhoto) {
      toast('Add at least one photo with a question.', 'error');
      return;
    }
    void me.refetch().then(() => router.replace('/(tabs)/explore'));
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.header}>
        <Title>Add your first photo</Title>
        <Muted>A photo with a question is what people respond to. You can add more later.</Muted>
      </View>

      <ProfileEditor me={me.data} onRefetch={() => me.refetch()} />

      <View style={s.footer}>
        <Button title="Finish" onPress={finish} disabled={!hasPhoto} />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: theme.spacing.base, paddingTop: theme.spacing.sm, gap: theme.spacing.xs },
  footer: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.md,
    borderTopWidth: theme.borderWidth.hairline,
    borderTopColor: theme.colors.border,
  },
});
