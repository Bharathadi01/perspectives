import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SelfieStep } from '../../src/components/forms/SelfieStep';
import { Screen } from '../../src/components/ui/Screen';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { Body, Muted } from '../../src/components/ui/Text';
import { useToast } from '../../src/components/ui/Toast';
import { useMe } from '../../src/features/hooks';
import { setBusy } from '../../src/lib/busyFlag';
import { theme } from '../../src/theme';

/**
 * Selfie verification on its own route.
 *
 * It used to be reached by pushing /onboarding with forceStep=selfie, which
 * never worked: that parameter is parsed as a step number, so it came out NaN
 * and the push did nothing. Onboarding has no selfie step to jump to either —
 * the selfie is part of its first step.
 */
export default function Verify() {
  const me = useMe();
  const toast = useToast();

  // Never interrupt someone who is in the middle of taking a selfie.
  useEffect(() => {
    setBusy('selfie-verification', true);
    return () => setBusy('selfie-verification', false);
  }, []);

  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;

  const verified = me.data.selfieStatus === 'verified';

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Verify your selfie" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {verified ? (
          <>
            <Body>You&apos;re verified.</Body>
            <Muted>The check next to your name tells people your photos are really you.</Muted>
          </>
        ) : (
          <SelfieStep
            onVerified={() => {
              toast("You're verified.", 'success');
              void me.refetch().then(() => router.back());
            }}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: theme.spacing.base, paddingBottom: theme.spacing.xxl, gap: theme.spacing.base },
});
