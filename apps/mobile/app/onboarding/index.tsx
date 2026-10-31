import { Redirect } from 'expo-router';
import React from 'react';
import { PaperLoading, PaperState } from '../../src/components/editorial/PaperState';
import { useMe } from '../../src/features/hooks';
import { resumeStep } from '../../src/features/onboarding/flow';
import { errorMessage } from '../../src/lib/errors';
import { useSession } from '../../src/session/sessionStore';

/**
 * Picks up an unfinished profile at the first answer it still needs. A brand-new account starts
 * at the first "What you get" screen right after sign-up (app/(auth)/birthday), not here.
 */
export default function OnboardingResume() {
  const status = useSession((s) => s.status);
  const me = useMe(status === 'signedIn');

  if (status === 'signedOut') return <Redirect href="/(auth)/welcome" />;
  if (status === 'loading' || me.isLoading) return <PaperLoading />;
  if (me.isError || !me.data) {
    return <PaperState title="That didn’t load" body={errorMessage(me.error)} action="Try again" onAction={() => void me.refetch()} />;
  }
  const step = resumeStep(me.data);
  if (!step) return <Redirect href="/(tabs)/explore" />;
  return <Redirect href={{ pathname: '/onboarding/[step]', params: { step } }} />;
}
