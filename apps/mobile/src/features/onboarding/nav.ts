import { router, useLocalSearchParams } from 'expo-router';
import { useMe } from '../hooks';
import { flowState, nextStep, type StepId } from './flow';

export function stepHref(step: StepId, params: Record<string, string> = {}) {
  return { pathname: '/onboarding/[step]' as const, params: { step, ...params } };
}

/** Leaves onboarding for Explore, with the one-time "how today's set works" note. */
export function finishOnboarding(): void {
  if (router.canDismiss()) router.dismissAll();
  router.replace({ pathname: '/(tabs)/explore', params: { welcome: '1' } });
}

/**
 * Moving between steps. A step opened from the review screen (`edit=1`) returns there when done
 * instead of carrying on through the flow.
 */
export function useStepNav(step: StepId) {
  const params = useLocalSearchParams<{ edit?: string; extra?: string }>();
  const me = useMe();
  const editing = params.edit === '1';

  const next = (options: { replace?: boolean } = {}) => {
    if (editing) {
      router.back();
      return;
    }
    const target = me.data ? nextStep(step, flowState(me.data)) : nextStep(step, { selfieVerified: false, hasPrimaryPhotoPost: false });
    if (target === 'explore') {
      finishOnboarding();
      return;
    }
    if (options.replace) router.replace(stepHref(target));
    else router.push(stepHref(target));
  };

  const goTo = (target: StepId, extra: Record<string, string> = {}) => router.push(stepHref(target, extra));

  return { next, goTo, editing, extra: params.extra === '1', me };
}
