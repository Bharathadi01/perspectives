import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  getInterestById,
  LIFESTYLE_PACE_LABELS,
  SOCIAL_PREFERENCE_LABELS,
} from '@perspective/contracts';
import { useUpdateProfile } from '../../features/hooks';
import { errorMessage } from '../../lib/errors';
import { GOAL_LABEL, ORIENTATION_LABEL, audienceQuestion } from '../../lib/labels';
import { useOnboardingStore } from '../../session/onboardingStore';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { Label, Muted, Title } from '../ui/Text';
import { useToast } from '../ui/Toast';

const GENDER_LABEL: Record<string, string> = {
  woman: 'Woman',
  man: 'Man',
  non_binary: 'Non-binary',
};

export function StepReview({
  onJumpToStep,
  onComplete,
}: {
  onJumpToStep: (stepIndex: number) => void;
  onComplete: () => void;
}) {
  const store = useOnboardingStore();
  const updateProfile = useUpdateProfile();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      await updateProfile.run({
        displayName: store.displayName.trim(),
        gender: store.gender ?? undefined,
        pronouns: store.pronouns.trim() || null,
        heightCm: Number(store.heightCm),
        orientation: store.orientation,
        city: store.city.trim(),
        goals: store.goals,
        audience: {
          genders: store.audienceGenders,
          minAge: store.audienceMinAge,
          maxAge: store.audienceMaxAge,
        },
        interests: store.selectedInterests,
        lifestylePace: store.lifestylePace,
        socialPreference: store.socialPreference,
        personalityPrompts: store.personalityPrompts,
      });

      toast('Preferences saved successfully.', 'success');
      onComplete();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.container}>
      {/* 1. Identity & Basics Card */}
      <View style={s.reviewCard}>
        <View style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            <Ionicons name="person-circle-outline" size={20} color={theme.colors.brand} />
            <Text style={s.cardTitle}>Identity & Basics</Text>
          </View>
          <Pressable onPress={() => onJumpToStep(0)}>
            <Text style={s.editLink}>Edit</Text>
          </Pressable>
        </View>

        <View style={s.identityDetails}>
          <Text style={s.primaryName}>
            {store.displayName}
            {store.pronouns ? <Text style={s.pronounsText}> ({store.pronouns})</Text> : null}
          </Text>
          <View style={s.metaRow}>
            {store.gender && (
              <Text style={s.metaItem}>{GENDER_LABEL[store.gender]}</Text>
            )}
            <Text style={s.metaDot}>•</Text>
            <Text style={s.metaItem}>{store.heightCm} cm</Text>
            <Text style={s.metaDot}>•</Text>
            <Text style={s.metaItem}>{store.city}</Text>
          </View>
          <View style={s.verificationBadge}>
            <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
            <Text style={s.verificationText}>18+ Verified Adult</Text>
          </View>
        </View>
      </View>

      {/* 2. Goal (private) and orientation (private, optional) */}
      <View style={s.reviewCard}>
        <View style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.brand} />
            <Text style={s.cardTitle}>Your goal (private)</Text>
          </View>
          <Pressable onPress={() => onJumpToStep(1)}>
            <Text style={s.editLink}>Edit</Text>
          </Pressable>
        </View>
        <View style={s.chipsRow}>
          {store.goals.map((g) => (
            <View key={g} style={s.goalPill}>
              <Text style={s.goalPillText}>{GOAL_LABEL[g].title}</Text>
            </View>
          ))}
        </View>
        {store.orientation ? (
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Orientation (private):</Text>
            <Text style={s.detailValue}>{ORIENTATION_LABEL[store.orientation]}</Text>
          </View>
        ) : null}
      </View>

      {/* 3. Audience, worded by the goal */}
      <View style={s.reviewCard}>
        <View style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            <Ionicons name="people-outline" size={20} color={theme.colors.brand} />
            <Text style={s.cardTitle}>{audienceQuestion(store.goals)}</Text>
          </View>
          <Pressable onPress={() => onJumpToStep(2)}>
            <Text style={s.editLink}>Edit</Text>
          </Pressable>
        </View>
        <Text style={s.detailValue}>
          {store.audienceGenders.map((g) => GENDER_LABEL[g]).join(', ')} (Ages {store.audienceMinAge}–{store.audienceMaxAge})
        </Text>
      </View>

      {/* 3. Passions & Interests */}
      <View style={s.reviewCard}>
        <View style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            <Ionicons name="sparkles-outline" size={20} color={theme.colors.brand} />
            <Text style={s.cardTitle}>Passions ({store.selectedInterests.length})</Text>
          </View>
          <Pressable onPress={() => onJumpToStep(3)}>
            <Text style={s.editLink}>Edit</Text>
          </Pressable>
        </View>

        <View style={s.chipsRow}>
          {store.selectedInterests.map((id) => {
            const def = getInterestById(id);
            return (
              <View key={id} style={s.interestChip}>
                {def?.icon && (
                  <Ionicons name={def.icon as any} size={12} color={theme.colors.brand} />
                )}
                <Text style={s.interestChipText}>{def?.label ?? id}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 4. Lifestyle & Rhythm (If selected) */}
      {(store.lifestylePace || store.socialPreference) && (
        <View style={s.reviewCard}>
          <View style={s.cardHeader}>
            <View style={s.cardHeaderLeft}>
              <Ionicons name="cafe-outline" size={20} color={theme.colors.brand} />
              <Text style={s.cardTitle}>Lifestyle & Rhythm</Text>
            </View>
            <Pressable onPress={() => onJumpToStep(4)}>
              <Text style={s.editLink}>Edit</Text>
            </Pressable>
          </View>

          <View style={s.chipsRow}>
            {store.lifestylePace && (
              <View style={s.lifestyleChip}>
                <Text style={s.lifestyleChipText}>
                  {LIFESTYLE_PACE_LABELS[store.lifestylePace].label}
                </Text>
              </View>
            )}
            {store.socialPreference && (
              <View style={s.lifestyleChip}>
                <Text style={s.lifestyleChipText}>
                  {SOCIAL_PREFERENCE_LABELS[store.socialPreference].label}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* 5. Personality Prompt (If answered) */}
      {store.personalityPrompts.length > 0 && (
        <View style={s.reviewCard}>
          <View style={s.cardHeader}>
            <View style={s.cardHeaderLeft}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.brand} />
              <Text style={s.cardTitle}>Perspective Prompt</Text>
            </View>
            <Pressable onPress={() => onJumpToStep(5)}>
              <Text style={s.editLink}>Edit</Text>
            </Pressable>
          </View>

          <View style={s.promptBox}>
            <Text style={s.promptQuestion}>{store.personalityPrompts[0].question}</Text>
            <Text style={s.promptAnswer}>"{store.personalityPrompts[0].answer}"</Text>
          </View>
        </View>
      )}

      {/* Algorithm Transparency Card */}
      <View style={s.transparencyCard}>
        <View style={s.transparencyIcon}>
          <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.brand} />
        </View>
        <View style={s.transparencyText}>
          <Text style={s.transparencyTitle}>How Perspective Recommends People</Text>
          <Text style={s.transparencyDesc}>
            We match you mostly on shared interests, and we make sure everyone gets perspectives.
            Your goal and orientation stay private. We never rank members by popularity or looks.
          </Text>
        </View>
      </View>

      <Button
        title="Complete & Set Up Profile"
        onPress={() => void handleFinish()}
        loading={submitting || updateProfile.isPending}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: theme.spacing.md },
  reviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.ink,
  },
  editLink: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.brand,
  },
  identityDetails: { gap: 4 },
  primaryName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.ink,
  },
  pronounsText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    color: theme.colors.muted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaItem: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
  },
  metaDot: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  verificationText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.success,
  },
  detailRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  detailLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.muted,
  },
  detailValue: {
    flex: 1,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.ink,
  },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.brandSoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  goalPillText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.brand,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
  },
  interestChipText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.ink,
  },
  lifestyleChip: {
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.card,
  },
  lifestyleChipText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.ink,
  },
  promptBox: {
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
    borderRadius: theme.radius.control,
    gap: 4,
  },
  promptQuestion: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.brand,
  },
  promptAnswer: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.ink,
    fontStyle: 'italic',
  },
  transparencyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.brandSoft,
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    gap: theme.spacing.md,
  },
  transparencyIcon: {
    marginTop: 2,
  },
  transparencyText: {
    flex: 1,
    gap: 2,
  },
  transparencyTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.ink,
  },
  transparencyDesc: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    lineHeight: theme.typography.fontSize.xs * 1.4,
  },
});
