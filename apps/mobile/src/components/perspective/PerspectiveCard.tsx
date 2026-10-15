import Ionicons from '@expo/vector-icons/Ionicons';
import type { ProfileSummary } from '@perspective/contracts';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { timeAgo } from '../../lib/labels';
import { theme } from '../../theme';
import { Avatar, VerifiedBadge } from '../profile/Avatar';
import { Chip } from '../ui/Chip';

interface PerspectiveCardProps {
  person: ProfileSummary;
  comment: string;
  chips: readonly string[];
  createdAt: string;
  onPressPerson?: () => void;
  footer?: React.ReactNode;
  onMore?: () => void;
}

/** One person's perspective: who wrote it, the comment, and any quick-pick chips. */
export function PerspectiveCard({ person, comment, chips, createdAt, onPressPerson, footer, onMore }: PerspectiveCardProps) {
  return (
    <View style={s.card}>
      <View style={s.head}>
        <Pressable
          style={s.person}
          onPress={onPressPerson}
          disabled={!onPressPerson}
          accessibilityRole={onPressPerson ? 'button' : undefined}
          accessibilityLabel={onPressPerson ? `Open ${person.displayName}'s profile` : undefined}
        >
          <Avatar name={person.displayName} url={person.primaryPhotoUrl} size={40} />
          <View>
            <View style={s.nameRow}>
              <Text style={s.name}>{person.displayName}</Text>
              {person.verified ? <VerifiedBadge size={14} /> : null}
            </View>
            <Text style={s.meta}>
              {person.age} · {timeAgo(createdAt)}
            </Text>
          </View>
        </Pressable>
        {onMore ? (
          <Pressable onPress={onMore} accessibilityRole="button" accessibilityLabel="Report or block" hitSlop={12} style={s.more}>
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.muted} />
          </Pressable>
        ) : null}
      </View>
      <Text style={s.comment}>{comment}</Text>
      {chips.length > 0 ? (
        <View style={s.chips}>
          {chips.map((c) => (
            <Chip key={c} label={c} />
          ))}
        </View>
      ) : null}
      {footer}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.media, padding: theme.spacing.base, gap: theme.spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  person: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: theme.touchTarget.min },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.ink },
  meta: { fontSize: theme.typography.fontSize.xs, color: theme.colors.muted },
  more: { minWidth: theme.touchTarget.min, minHeight: theme.touchTarget.min, alignItems: 'center', justifyContent: 'center' },
  comment: {
    fontSize: theme.typography.fontSize.md,
    lineHeight: theme.typography.fontSize.md * theme.typography.lineHeight.relaxed,
    color: theme.colors.ink,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
});
