import { ProfileRequirement } from '@perspective/contracts';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AudienceForm } from '../../src/components/forms/AudienceForm';
import { BasicsForm } from '../../src/components/forms/BasicsForm';
import { PostForm } from '../../src/components/forms/PostForm';
import { SelfieStep } from '../../src/components/forms/SelfieStep';
import { Screen } from '../../src/components/ui/Screen';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { Label, Muted, Title } from '../../src/components/ui/Text';
import { useMe } from '../../src/features/hooks';
import { useSession } from '../../src/session/sessionStore';
import { theme } from '../../src/theme';

import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../../src/components/ui/Button';

const STEPS: { key: ProfileRequirement; title: string; subtitle: string }[] = [
  { key: 'basics', title: 'The basics', subtitle: 'Givers see these so their perspective fits who you are.' },
  { key: 'audience', title: 'Who sees you', subtitle: 'Choose who your profile is shown to and who you discover.' },
  { key: 'selfie', title: 'Verify it’s you', subtitle: 'Only verified adults can use Perspective.' },
  { key: 'primary_photo_post', title: 'Set Up Your Profile', subtitle: 'Bring your personality to life with photos, questions, and voice.' },
];

/** Profile setup: the profile goes live once every step is done. */
export default function Onboarding() {
  const status = useSession((s) => s.status);
  const me = useMe(status === 'signedIn');

  const { forceStep } = useLocalSearchParams<{ forceStep?: string }>();

  if (status === 'signedOut') return <Redirect href="/(auth)/welcome" />;
  if (me.isLoading || status === 'loading') return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;
  if (me.data.isLive && !forceStep) return <Redirect href="/(tabs)/explore" />;

  const index = forceStep
    ? STEPS.findIndex((st) => st.key === forceStep)
    : STEPS.findIndex((st) => me.data.missing.includes(st.key));
  const step = STEPS[Math.max(0, index)];
  const next = () => void me.refetch().then((r) => r.data?.isLive && router.replace('/(tabs)/explore'));

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.stepHeader}>
          <Label>
            Step {STEPS.indexOf(step) + 1} of {STEPS.length}
          </Label>
          <View style={s.progressBarTrack}>
            <View style={[s.progressBarFill, { width: `${((STEPS.indexOf(step) + 1) / STEPS.length) * 100}%` }]} />
          </View>
        </View>

        <Title>{step.title}</Title>
        <Muted>{step.subtitle}</Muted>

        {step.key === 'basics' && <BasicsForm me={me.data} onSaved={next} submitTitle="Next" />}
        {step.key === 'audience' && <AudienceForm me={me.data} onSaved={next} submitTitle="Next" />}
        {step.key === 'selfie' && <SelfieStep onVerified={next} />}

        {step.key === 'primary_photo_post' && (
          <View style={s.setupContainer}>
            {/* Visual Pillars */}
            <View style={s.pillarCard}>
              <View style={s.pillarIcon}>
                <Ionicons name="images" size={24} color={theme.colors.brand} />
              </View>
              <View style={s.pillarText}>
                <Text style={s.pillarTitle}>Photos with Questions</Text>
                <Text style={s.pillarDesc}>
                  Select your best photos and attach specific questions you're genuinely curious to get feedback on.
                </Text>
              </View>
            </View>

            <View style={s.pillarCard}>
              <View style={s.pillarIcon}>
                <Ionicons name="sparkles" size={24} color={theme.colors.brand} />
              </View>
              <View style={s.pillarText}>
                <Text style={s.pillarTitle}>Perspective Prompts</Text>
                <Text style={s.pillarDesc}>
                  Explore our curated prompt library across first impressions, vibe, lifestyle, and dating intentions.
                </Text>
              </View>
            </View>

            <View style={s.pillarCard}>
              <View style={s.pillarIcon}>
                <Ionicons name="mic" size={24} color={theme.colors.brand} />
              </View>
              <View style={s.pillarText}>
                <Text style={s.pillarTitle}>15-Second Voice Intro</Text>
                <Text style={s.pillarDesc}>
                  Record a short voice note so potential matches can hear your tone, energy, and authenticity.
                </Text>
              </View>
            </View>

            <View style={s.setupNotice}>
              <Ionicons name="information-circle-outline" size={18} color={theme.colors.muted} />
              <Text style={s.setupNoticeText}>
                At least 1 photo post is required to enter discovery. You can add up to 6 content items and preview your profile live before publishing.
              </Text>
            </View>

            <Button
              title="Set Up Your Profile"
              onPress={() => router.push({ pathname: '/me/edit', params: { from: 'onboarding' } })}
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: theme.spacing.lg, gap: theme.spacing.base, paddingBottom: theme.spacing.xxl },
  stepHeader: { gap: theme.spacing.xs, marginBottom: theme.spacing.xs },
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
  setupContainer: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  pillarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillarIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarText: {
    flex: 1,
    gap: 2,
  },
  pillarTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.ink,
  },
  pillarDesc: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    lineHeight: theme.typography.fontSize.xs * 1.4,
  },
  setupNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
    borderRadius: theme.radius.card,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  setupNoticeText: {
    flex: 1,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    lineHeight: theme.typography.fontSize.xs * 1.4,
  },
});
