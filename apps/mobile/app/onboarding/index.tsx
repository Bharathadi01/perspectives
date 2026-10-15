import { ProfileRequirement } from '@perspective/contracts';
import { Redirect, router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { AudienceForm } from '../../src/components/forms/AudienceForm';
import { BasicsForm } from '../../src/components/forms/BasicsForm';
import { PostForm } from '../../src/components/forms/PostForm';
import { SelfieStep } from '../../src/components/forms/SelfieStep';
import { Screen } from '../../src/components/ui/Screen';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { Label, Muted, Title } from '../../src/components/ui/Text';
import { useMe } from '../../src/features/hooks';
import { useSession } from '../../src/session/sessionStore';
import { theme } from '../../src/theme';

const STEPS: { key: ProfileRequirement; title: string; subtitle: string }[] = [
  { key: 'basics', title: 'The basics', subtitle: 'Givers see these so their perspective fits who you are.' },
  { key: 'audience', title: 'Who sees you', subtitle: 'Choose who your profile is shown to.' },
  { key: 'selfie', title: 'Verify it’s you', subtitle: 'Only verified adults can use Perspective.' },
  { key: 'primary_photo_post', title: 'Your first post', subtitle: 'A photo and the question you want honest perspectives on.' },
];

/** Profile setup: the profile goes live once every step is done. */
export default function Onboarding() {
  const status = useSession((s) => s.status);
  const me = useMe(status === 'signedIn');

  if (status === 'signedOut') return <Redirect href="/(auth)/welcome" />;
  if (me.isLoading || status === 'loading') return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;
  if (me.data.isLive) return <Redirect href="/(tabs)/explore" />;

  const index = STEPS.findIndex((st) => me.data.missing.includes(st.key));
  const step = STEPS[Math.max(0, index)];
  const next = () => void me.refetch().then((r) => r.data?.isLive && router.replace('/(tabs)/explore'));

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Label>
          Step {STEPS.indexOf(step) + 1} of {STEPS.length}
        </Label>
        <Title>{step.title}</Title>
        <Muted>{step.subtitle}</Muted>
        {step.key === 'basics' && <BasicsForm me={me.data} onSaved={next} submitTitle="Next" />}
        {step.key === 'audience' && <AudienceForm me={me.data} onSaved={next} submitTitle="Next" />}
        {step.key === 'selfie' && <SelfieStep onVerified={next} />}
        {step.key === 'primary_photo_post' && <PostForm photoOnly onCreated={next} />}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: theme.spacing.lg, gap: theme.spacing.base, paddingBottom: theme.spacing.xxl },
});
