import Ionicons from '@expo/vector-icons/Ionicons';
import type { MatchReason, Post, PublicProfile } from '@perspective/contracts';
import {
  DATING_INTENTION_CONFIG,
  getInterestById,
  LIFESTYLE_PACE_LABELS,
  SOCIAL_PREFERENCE_LABELS,
} from '@perspective/contracts';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { VerifiedBadge } from './Avatar';
import { BasicsRow } from './BasicsRow';
import { PostCard } from './PostCard';

interface ProfileViewProps {
  profile: PublicProfile;
  givenPostIds?: readonly string[];
  compatibilityScore?: number;
  matchReasons?: MatchReason[];
  /** Give a perspective on one post. Omit for read-only (your own profile). */
  onGive?: (post: Post) => void;
  headerRight?: React.ReactNode;
}

/**
 * A full profile, one long card stack: name, primary photo, basics, interests, prompts, then remaining posts.
 * Each post carries its own "give perspective" action, so a giver answers one specific post.
 */
export function ProfileView({
  profile,
  givenPostIds = [],
  compatibilityScore,
  matchReasons,
  onGive,
  headerRight,
}: ProfileViewProps) {
  const [primary, ...rest] = profile.posts;
  const card = (post: Post) => (
    <PostCard
      key={post.id}
      post={post}
      alreadyGiven={givenPostIds.includes(post.id)}
      onGive={onGive ? () => onGive(post) : undefined}
    />
  );

  const intentionConfig = profile.datingIntention ? DATING_INTENTION_CONFIG[profile.datingIntention] : null;

  return (
    <View style={s.stack}>
      {/* Explainable Match Reasons Banner (in Explore Feed) */}
      {matchReasons && matchReasons.length > 0 && (
        <View style={s.matchBanner}>
          <Ionicons name="sparkles" size={16} color={theme.colors.brand} />
          <View style={s.matchBannerText}>
            {matchReasons.map((r, i) => (
              <Text key={i} style={s.matchReasonLine}>
                {r.text}
              </Text>
            ))}
          </View>
        </View>
      )}

      {/* Header with Name, Pronouns, Verified Badge, and Settings/Share */}
      <View style={s.header}>
        <View style={s.nameRow}>
          <Text style={s.name} accessibilityRole="header">
            {profile.displayName}
          </Text>
          {profile.pronouns ? <Text style={s.pronouns}>({profile.pronouns})</Text> : null}
          {profile.verified ? <VerifiedBadge /> : null}
        </View>
        {headerRight}
      </View>

      {/* Primary Photo Card */}
      {primary ? card(primary) : null}

      {/* Basics Strip */}
      <BasicsRow profile={profile} />

      {/* Dating Intention & Lifestyle Pill Strip */}
      {(intentionConfig || profile.lifestylePace || profile.socialPreference) && (
        <View style={s.intentionStrip}>
          {intentionConfig && (
            <View style={s.intentionPill}>
              <Ionicons name={intentionConfig.icon as any} size={14} color={theme.colors.brand} />
              <Text style={s.intentionPillText}>{intentionConfig.label}</Text>
            </View>
          )}
          {profile.lifestylePace && (
            <View style={s.lifestylePill}>
              <Text style={s.lifestylePillText}>
                {LIFESTYLE_PACE_LABELS[profile.lifestylePace].label}
              </Text>
            </View>
          )}
          {profile.socialPreference && (
            <View style={s.lifestylePill}>
              <Text style={s.lifestylePillText}>
                {SOCIAL_PREFERENCE_LABELS[profile.socialPreference].label}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Passions & Interests Grid */}
      {profile.interests && profile.interests.length > 0 && (
        <View style={s.interestsCard}>
          <Text style={s.interestsTitle}>Passions & Pass-Times</Text>
          <View style={s.chipsRow}>
            {profile.interests.map((id) => {
              const def = getInterestById(id);
              return (
                <View key={id} style={s.interestChip}>
                  {def?.icon && (
                    <Ionicons name={def.icon as any} size={13} color={theme.colors.brand} />
                  )}
                  <Text style={s.interestChipText}>{def?.label ?? id}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Personality Prompts Card */}
      {profile.personalityPrompts && profile.personalityPrompts.length > 0 && (
        <View style={s.promptCard}>
          <Text style={s.promptQuestion}>{profile.personalityPrompts[0].question}</Text>
          <Text style={s.promptAnswer}>"{profile.personalityPrompts[0].answer}"</Text>
        </View>
      )}

      {/* Remaining Photo & Audio Posts */}
      {rest.map(card)}
    </View>
  );
}

const s = StyleSheet.create({
  stack: { gap: theme.spacing.base },
  matchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.brandSoft,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.card,
    gap: theme.spacing.sm,
  },
  matchBannerText: { flex: 1, gap: 2 },
  matchReasonLine: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.brand,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: theme.touchTarget.min,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: theme.typography.fontSize.hero,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.ink,
  },
  pronouns: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.regular,
    color: theme.colors.muted,
  },
  intentionStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  intentionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.brandSoft,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },
  intentionPillText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.brand,
  },
  lifestylePill: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  lifestylePillText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.ink,
  },
  interestsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.media,
    padding: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  interestsTitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },
  interestChipText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.ink,
  },
  promptCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.media,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  promptQuestion: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.brand,
  },
  promptAnswer: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.ink,
    fontStyle: 'italic',
    lineHeight: theme.typography.fontSize.base * 1.4,
  },
});
