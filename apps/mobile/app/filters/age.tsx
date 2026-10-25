import { RULES, type MyProfile } from '@perspective/contracts';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { AgeRangeFields } from '../../src/components/forms/AudienceForm';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { Muted } from '../../src/components/ui/Text';
import { useToast } from '../../src/components/ui/Toast';
import { audienceUpdate } from '../../src/features/filters/audienceUpdate';
import { useMe, useUpdateProfile } from '../../src/features/hooks';
import { errorMessage } from '../../src/lib/errors';
import { theme } from '../../src/theme';

/** Your feed → Age range. Only the ages change; the genders are sent as they are. */
export default function AgeRange() {
  const me = useMe();
  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;
  return <AgeRangeForm me={me.data} />;
}

function AgeRangeForm({ me }: { me: MyProfile }) {
  const update = useUpdateProfile();
  const toast = useToast();
  const [range, setRange] = useState({ minAge: me.audience?.minAge ?? RULES.minAge, maxAge: me.audience?.maxAge ?? 35 });
  const next = audienceUpdate(me.audience, { genders: me.audience?.genders ?? [], ...range });

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
      <ScreenHeader title="Age range" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.content}>
        <AgeRangeFields minAge={range.minAge} maxAge={range.maxAge} onChange={setRange} />
        <Muted>Works both ways: you see people in this range, and they see you only if you are in theirs.</Muted>
        <Muted>If very few people fit, we may widen the age range a little and tell you.</Muted>
        <Button title="Save" onPress={() => void save()} disabled={!next} loading={update.isPending} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: theme.spacing.base, paddingBottom: theme.spacing.xxl, gap: theme.spacing.base },
});
