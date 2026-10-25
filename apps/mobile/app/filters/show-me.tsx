import { RULES, type Gender, type MyProfile } from '@perspective/contracts';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { GenderChips } from '../../src/components/forms/AudienceForm';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { Label, Muted } from '../../src/components/ui/Text';
import { useToast } from '../../src/components/ui/Toast';
import { audienceUpdate } from '../../src/features/filters/audienceUpdate';
import { useMe, useUpdateProfile } from '../../src/features/hooks';
import { errorMessage } from '../../src/lib/errors';
import { PERSPECTIVES_ONLY_HINT, audienceQuestion, perspectivesOnly } from '../../src/lib/labels';
import { theme } from '../../src/theme';

/** Your feed → Show me. Only the genders change; the age range is sent as it is. */
export default function ShowMe() {
  const me = useMe();
  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;
  return <ShowMeForm me={me.data} />;
}

function ShowMeForm({ me }: { me: MyProfile }) {
  const update = useUpdateProfile();
  const toast = useToast();
  const [genders, setGenders] = useState<Gender[]>(me.audience?.genders ?? []);
  const next = audienceUpdate(me.audience, {
    genders,
    minAge: me.audience?.minAge ?? RULES.minAge,
    maxAge: me.audience?.maxAge ?? 35,
  });

  const save = async () => {
    if (!next) return;
    try {
      await update.run({ audience: next });
      toast('Your feed is updated.', 'success');
      router.back();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Show me" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.content}>
        <Label>{audienceQuestion(me.goals)}</Label>
        <GenderChips value={genders} onChange={setGenders} />
        {perspectivesOnly(me.goals) ? <Muted>{PERSPECTIVES_ONLY_HINT}</Muted> : null}
        <Muted>You see people in this group, and they see you only if you are in theirs.</Muted>
        <Button title="Save" onPress={() => void save()} disabled={!next} loading={update.isPending} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: theme.spacing.base, paddingBottom: theme.spacing.xxl, gap: theme.spacing.base },
});
