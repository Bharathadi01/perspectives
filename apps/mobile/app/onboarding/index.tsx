import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StepAboutYou } from '../../src/components/onboarding/StepAboutYou';
import { StepAudienceIntentions } from '../../src/components/onboarding/StepAudienceIntentions';
import { StepInterests } from '../../src/components/onboarding/StepInterests';
import { StepPersonality } from '../../src/components/onboarding/StepPersonality';
import { StepReview } from '../../src/components/onboarding/StepReview';
import { StepWhatMatters } from '../../src/components/onboarding/StepWhatMatters';
import { Screen } from '../../src/components/ui/Screen';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { Label, Muted, Title } from '../../src/components/ui/Text';
import { useMe } from '../../src/features/hooks';
import { useOnboardingStore } from '../../src/session/onboardingStore';
import { useSession } from '../../src/session/sessionStore';
import { theme } from '../../src/theme';

const ONBOARDING_STEPS = [
  { title: 'About you', subtitle: 'The foundation of your profile and identity' },
  { title: 'Who would you like to meet?', subtitle: 'Dating preferences, intentions, and dealbreakers' },
  { title: 'Your interests', subtitle: 'Select at least 3 passions to power matching' },
  { title: 'What matters to you?', subtitle: 'Daily rhythm and social energy harmony' },
  { title: 'A little more personality', subtitle: 'A written perspective prompt to share your voice' },
  { title: 'Review & finish', subtitle: 'See how your choices power personalized discovery' },
];

export default function Onboarding() {
  const status = useSession((s) => s.status);
  const me = useMe(status === 'signedIn');
  const { forceStep } = useLocalSearchParams<{ forceStep?: string }>();

  const { stepIndex, setStepIndex, initializeFromProfile } = useOnboardingStore();

  useEffect(() => {
    if (me.data) {
      initializeFromProfile(me.data);
    }
  }, [me.data, initializeFromProfile]);

  useEffect(() => {
    if (forceStep) {
      const idx = parseInt(forceStep, 10);
      if (!isNaN(idx) && idx >= 0 && idx < ONBOARDING_STEPS.length) {
        setStepIndex(idx);
      }
    }
  }, [forceStep, setStepIndex]);

  if (status === 'signedOut') return <Redirect href="/(auth)/welcome" />;
  if (me.isLoading || status === 'loading') return <LoadingState />;
  if (me.isError || !me.data) {
    return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;
  }

  // If user already completed onboarding, photos, and is live, redirect to explore
  if (me.data.isLive && !forceStep) {
    return <Redirect href="/(tabs)/explore" />;
  }

  const currentStep = ONBOARDING_STEPS[stepIndex] ?? ONBOARDING_STEPS[0];
  const progressPercent = ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  const handleNext = () => {
    setStepIndex(Math.min(ONBOARDING_STEPS.length - 1, stepIndex + 1));
  };

  const handleBack = () => {
    setStepIndex(Math.max(0, stepIndex - 1));
  };

  const handleComplete = () => {
    void me.refetch().then(() => {
      router.replace({ pathname: '/me/edit', params: { from: 'onboarding' } });
    });
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Navigation & Progress Header */}
        <View style={s.stepHeader}>
          <View style={s.navRow}>
            {stepIndex > 0 ? (
              <Pressable onPress={handleBack} style={s.backBtn} accessibilityLabel="Go back">
                <Ionicons name="arrow-back" size={20} color={theme.colors.ink} />
                <Text style={s.backText}>Back</Text>
              </Pressable>
            ) : (
              <View style={s.backPlaceholder} />
            )}
            <Label style={s.stepLabel}>
              Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
            </Label>
          </View>

          <View style={s.progressBarTrack}>
            <View style={[s.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* Title and Subtitle */}
        <View style={s.titleBox}>
          <Title>{currentStep.title}</Title>
          <Muted>{currentStep.subtitle}</Muted>
        </View>

        {/* Step Views */}
        {stepIndex === 0 && <StepAboutYou onNext={handleNext} />}
        {stepIndex === 1 && <StepAudienceIntentions onNext={handleNext} />}
        {stepIndex === 2 && <StepInterests onNext={handleNext} />}
        {stepIndex === 3 && <StepWhatMatters onNext={handleNext} />}
        {stepIndex === 4 && <StepPersonality onNext={handleNext} />}
        {stepIndex === 5 && (
          <StepReview onJumpToStep={(idx) => setStepIndex(idx)} onComplete={handleComplete} />
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  stepHeader: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 28,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.ink,
  },
  backPlaceholder: {
    width: 40,
  },
  stepLabel: {
    color: theme.colors.muted,
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.brand,
    borderRadius: 2,
  },
  titleBox: {
    gap: 4,
    marginBottom: theme.spacing.xs,
  },
});
