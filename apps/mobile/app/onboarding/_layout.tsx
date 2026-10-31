import { Stack } from 'expo-router';
import React from 'react';
import { NO_BACK_STEPS, VALUE_STEPS, isStepId } from '../../src/features/onboarding/flow';
import { theme } from '../../src/theme';

/**
 * The onboarding after sign-up: one screen per step (src/features/onboarding). Questions slide in
 * from the side; the "What you get" screens fade in. Some steps cannot be swiped back from.
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={({ route }) => {
        const step = (route.params as { step?: string } | undefined)?.step;
        const known = isStepId(step) ? step : null;
        return {
          headerShown: false,
          contentStyle: { backgroundColor: theme.editorial.colors.paper },
          animation: known && VALUE_STEPS.includes(known) ? 'fade' : 'slide_from_right',
          gestureEnabled: !(known && (NO_BACK_STEPS.includes(known) || known === 'more-posts')),
        };
      }}
    />
  );
}
