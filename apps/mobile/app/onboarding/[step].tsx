import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { PaperLoading, PaperState } from '../../src/components/editorial/PaperState';
import { useMe } from '../../src/features/hooks';
import { isStepId } from '../../src/features/onboarding/flow';
import { STEP_SCREENS } from '../../src/features/onboarding/steps';
import { errorMessage } from '../../src/lib/errors';
import { useSession } from '../../src/session/sessionStore';

/** One onboarding step, by id (`/onboarding/name`, `/onboarding/goal`, …). */
export default function OnboardingStep() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const status = useSession((s) => s.status);
  const me = useMe(status === 'signedIn');

  if (status === 'signedOut') return <Redirect href="/(auth)/welcome" />;
  if (!isStepId(step)) return <Redirect href="/onboarding" />;
  if (status === 'loading' || me.isLoading) return <PaperLoading />;
  if (me.isError || !me.data) {
    return <PaperState title="That didn’t load" body={errorMessage(me.error)} action="Try again" onAction={() => void me.refetch()} />;
  }
  const Screen = STEP_SCREENS[step];
  return <Screen me={me.data} />;
}
