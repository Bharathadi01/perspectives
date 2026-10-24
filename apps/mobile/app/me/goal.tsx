import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { GoalForm } from '../../src/components/forms/GoalForm';
import { Screen } from '../../src/components/ui/Screen';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { useToast } from '../../src/components/ui/Toast';
import { useMe } from '../../src/features/hooks';
import { theme } from '../../src/theme';

/** Settings → Your goal. Private: it only changes who you are matched with. */
export default function Goal() {
  const me = useMe();
  const toast = useToast();

  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Your goal" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <GoalForm
          me={me.data}
          onSaved={() => {
            toast('Goal saved.', 'success');
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
