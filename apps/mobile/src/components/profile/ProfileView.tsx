import type { Post, PublicProfile } from '@perspective/contracts';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { VerifiedBadge } from './Avatar';
import { BasicsRow } from './BasicsRow';
import { PostCard } from './PostCard';

interface ProfileViewProps {
  profile: PublicProfile;
  givenPostIds?: readonly string[];
  /** Give a perspective on one post. Omit for read-only (your own profile). */
  onGive?: (post: Post) => void;
  headerRight?: React.ReactNode;
}

/**
 * A full profile, one long card stack: name, primary photo, basics, then the remaining posts.
 * Each post carries its own "give perspective" action, so a giver answers one specific post.
 */
export function ProfileView({ profile, givenPostIds = [], onGive, headerRight }: ProfileViewProps) {
  const [primary, ...rest] = profile.posts;
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
      <View style={s.header}>
        <View style={s.nameRow}>
          <Text style={s.name} accessibilityRole="header">
            {profile.displayName}
          </Text>
          {profile.verified ? <VerifiedBadge /> : null}
        </View>
        {headerRight}
      </View>
      {primary ? card(primary) : null}
      <BasicsRow profile={profile} />
      {rest.map(card)}
    </View>
  );
}

const s = StyleSheet.create({
  stack: { gap: theme.spacing.base },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: theme.touchTarget.min },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexShrink: 1 },
  name: { fontSize: theme.typography.fontSize.hero, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.ink },
});
