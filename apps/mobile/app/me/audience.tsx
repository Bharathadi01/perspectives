import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { AudienceForm } from '../../src/components/forms/AudienceForm';
import { Screen } from '../../src/components/ui/Screen';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { useToast } from '../../src/components/ui/Toast';
import { useMe } from '../../src/features/hooks';
import { theme } from '../../src/theme';

/** Settings → who you want in your feed. Works both ways: you both have to be in range. */
export default function Audience() {
  const me = useMe();
  const toast = useToast();

  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Your feed" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <AudienceForm
          me={me.data}
          onSaved={() => {
            toast('Audience preferences updated.', 'success');
            router.back();
          }}
        />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: theme.spacing.base, paddingBottom: theme.spacing.xxl, gap: theme.spacing.base },
});
