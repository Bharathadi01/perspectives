import type { Post, PublicProfile } from '@perspective/contracts';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InCommonCard } from '../../components/profile/InCommonCard';
import { theme } from '../../theme';
import { EditorialPostCard } from './EditorialPostCard';
import { SealCheckIcon } from '../../components/ui/icons';
import { moreAbout, nameLine, type InCommonItem } from './inCommon';

const e = theme.editorial;

interface Props {
  profile: PublicProfile;
  givenPostIds: readonly string[];
  inCommon: InCommonItem[];
  onGive: (post: Post) => void;
  /** Explore's report/block menu, beside the name. */
  headerRight?: React.ReactNode;
}

/**
 * A profile on Explore in the editorial look (chosen 2026-10-25): name with the tick, then
 * "pronouns · age · height · city", the first post, what you have in common, their personality answer,
 * more about them, then the rest.
 * Gender and height are not shown on Explore (decided 2026-10-25). Other screens still use ProfileView.
 */
export function ExploreProfile({ profile, givenPostIds, inCommon, onGive, headerRight }: Props) {
  const unanswered = profile.posts.filter((p) => !givenPostIds.includes(p.id));
  // The server only offers profiles with an unanswered post; fall back to all posts just in case.
  const [primary, ...rest] = unanswered.length > 0 ? unanswered : profile.posts;
  const card = (post: Post) => (
    <EditorialPostCard key={post.id} post={post} alreadyGiven={givenPostIds.includes(post.id)} onGive={() => onGive(post)} />
  );
  const about = moreAbout(profile);
  const prompt = profile.personalityPrompts[0];

  return (
    <View style={s.stack}>
      <View style={s.header}>
        <View style={s.nameBlock}>
          <View style={s.nameRow}>
            <Text style={s.name} accessibilityRole="header">
              {profile.displayName}
            </Text>
            {profile.verified ? (
              <View accessible accessibilityRole="image" accessibilityLabel="Selfie verified">
                <SealCheckIcon size={22} weight="fill" color={e.colors.accent} />
              </View>
            ) : null}
          </View>
          <Text style={s.line}>{nameLine(profile)}</Text>
        </View>
        {headerRight}
      </View>

      {primary ? card(primary) : null}

      <InCommonCard name={profile.displayName} items={inCommon} />

      {prompt ? (
        <View style={s.block}>
          <Text style={s.overline}>{prompt.question.toUpperCase()}</Text>
          <Text style={s.promptAnswer}>{prompt.answer}</Text>
        </View>
      ) : null}

      {about.length > 0 ? (
        <View style={s.block}>
          <Text style={s.overline}>MORE ABOUT {profile.displayName.toUpperCase()}</Text>
          <View style={s.chips}>
            {about.map((label) => (
              <Text key={label} style={s.chip}>
                {label}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {rest.map(card)}
    </View>
  );
}

const s = StyleSheet.create({
  stack: { gap: theme.spacing.lg - 6 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', minHeight: theme.touchTarget.min },
  nameBlock: { flexShrink: 1, gap: theme.spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  name: { fontFamily: e.fonts.display, fontSize: 30, lineHeight: 34, color: e.colors.ink, flexShrink: 1 },
  line: { fontFamily: e.fonts.body, fontSize: 14, color: e.colors.muted },
  overline: { fontFamily: e.fonts.bodySemibold, fontSize: 11, letterSpacing: 1.1, color: e.colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: {
    fontFamily: e.fonts.bodyMedium,
    fontSize: 13,
    color: e.colors.ink,
    backgroundColor: e.colors.paper,
    borderWidth: theme.borderWidth.hairline,
    borderColor: e.colors.line,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
  },
  /** The white block shared by "More about" and the personality answer. */
  block: {
    gap: theme.spacing.md,
    backgroundColor: e.colors.surface,
    borderRadius: 20,
    borderWidth: theme.borderWidth.hairline,
    borderColor: e.colors.line,
    padding: theme.spacing.base,
  },
  promptAnswer: { fontFamily: e.fonts.displayItalic, fontSize: 20, lineHeight: 26, color: e.colors.ink },
});
