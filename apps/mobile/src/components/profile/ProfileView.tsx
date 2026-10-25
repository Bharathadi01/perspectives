import Ionicons from '@expo/vector-icons/Ionicons';
import type { Post, PublicProfile } from '@perspective/contracts';
import {
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
  /** Explore: leave out posts the viewer already answered, so a returning profile is not repetitive. */
  hideAnswered?: boolean;
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
  hideAnswered = false,
  onGive,
  headerRight,
}: ProfileViewProps) {
  const unanswered = profile.posts.filter((p) => !givenPostIds.includes(p.id));
  // The server only offers profiles that still have an unanswered post; fall back to all posts just in case.
  const posts = hideAnswered && unanswered.length > 0 ? unanswered : profile.posts;
  const [primary, ...rest] = posts;
  const card = (post: Post) => (
    <PostCard
      key={post.id}
      post={post}
      alreadyGiven={givenPostIds.includes(post.id)}
      onGive={onGive ? () => onGive(post) : undefined}
    />
  );

  return (
    <View style={s.stack}>
      {/* Name with the verified tick beside it, pronouns underneath; an optional control (Explore's ⋯) on the right */}
      <View style={s.header}>
        <View style={s.nameBlock}>
          <View style={s.nameRow}>
            <Text style={s.name} accessibilityRole="header">
              {profile.displayName}
            </Text>
            {profile.verified ? <VerifiedBadge size={20} /> : null}
          </View>
          {profile.pronouns ? <Text style={s.pronouns}>{profile.pronouns}</Text> : null}
        </View>
        {headerRight}
      </View>

      {/* Primary Photo Card */}
      {primary ? card(primary) : null}

      {/* Basics Strip */}
      <BasicsRow profile={profile} />

      {/* Lifestyle Pill Strip */}
      {(profile.lifestylePace || profile.socialPreference) && (
        <View style={s.pillStrip}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: theme.touchTarget.min,
  },
  nameBlock: { flexShrink: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, flexShrink: 1 },
  name: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.ink,
    flexShrink: 1,
  },
  pronouns: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    color: theme.colors.muted,
  },
  pillStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
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
