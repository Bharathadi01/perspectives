import type { ProfileSummary } from '@perspective/contracts';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PaperAvatar, PartnerName } from '../../../components/editorial/Person';
import { theme } from '../../../theme';
import { ArrowsClockwiseIcon, ArrowUpRightIcon, CaretLeftIcon, ClockIcon, DotsThreeIcon, XIcon } from '../icons';
import { starterFor } from '../ideas';

const e = theme.editorial;

export function ChatHeader({
  partner,
  subtitle,
  onBack,
  onOpenProfile,
  onMenu,
}: {
  partner: ProfileSummary;
  subtitle: string;
  onBack: () => void;
  onOpenProfile: () => void;
  onMenu: () => void;
}) {
  return (
    <View style={s.header}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={({ pressed }) => [s.icon, pressed && s.pressed]}>
        <CaretLeftIcon size={24} weight="bold" color={e.colors.ink} />
      </Pressable>
      <Pressable
        onPress={onOpenProfile}
        accessibilityRole="button"
        accessibilityLabel={`${partner.displayName}. Open profile`}
        style={({ pressed }) => [s.who, pressed && s.pressed]}
      >
        <PaperAvatar person={partner} size={38} />
        <View style={s.whoText}>
          <PartnerName person={partner} />
          <Text style={s.sub} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </Pressable>
      <Pressable onPress={onMenu} accessibilityRole="button" accessibilityLabel="Conversation options" style={({ pressed }) => [s.icon, pressed && s.pressed]}>
        <DotsThreeIcon size={28} weight="bold" color={e.colors.ink} />
      </Pressable>
    </View>
  );
}

/** The quiet-connection reminder: same words and rules as before, set calmly in ink on paper. */
export function QuietNotice({ text }: { text: string }) {
  return (
    <View style={s.notice} accessibilityRole="alert">
      <ClockIcon size={18} color={e.colors.accent} weight="bold" />
      <Text style={s.noticeText}>{text}</Text>
    </View>
  );
}

const IDEA_WIDTH = 224;
const IDEA_GAP = 10;

/**
 * A few ways to start, in an empty chat: a slim row of cards you swipe through,
 * like the suggestions above a phone keyboard. Tapping one puts its first line
 * in the message box to finish in your own words. Shuffle shows other ideas;
 * the cross puts the row away.
 */
export function StartIdeas({
  ideas,
  onPick,
  onShuffle,
  onHide,
}: {
  ideas: readonly string[];
  onPick: (line: string) => void;
  /** Absent when there are no other ideas to show. */
  onShuffle?: () => void;
  onHide: () => void;
}) {
  if (ideas.length === 0) return null;
  return (
    <View style={s.ideas}>
      <View style={s.ideasHead}>
        <Text style={s.overline}>A FEW WAYS TO START</Text>
        <View style={s.ideasTools}>
          {onShuffle ? (
            <Pressable
              onPress={onShuffle}
              accessibilityRole="button"
              accessibilityLabel="Show other ideas"
              hitSlop={10}
              style={({ pressed }) => [s.tool, pressed && s.pressed]}
            >
              <ArrowsClockwiseIcon size={15} weight="bold" color={e.colors.ink} />
              <Text style={s.toolText}>Shuffle</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onHide}
            accessibilityRole="button"
            accessibilityLabel="Hide ideas"
            hitSlop={12}
            style={({ pressed }) => [s.tool, pressed && s.pressed]}
          >
            <XIcon size={16} weight="bold" color={e.colors.muted} />
          </Pressable>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={IDEA_WIDTH + IDEA_GAP}
        decelerationRate="fast"
        contentContainerStyle={s.ideaRow}
        keyboardShouldPersistTaps="handled"
      >
        {ideas.map((idea) => {
          const line = starterFor(idea);
          return (
            <Pressable
              key={idea}
              onPress={line ? () => onPick(line) : undefined}
              disabled={!line}
              accessibilityRole={line ? 'button' : 'text'}
              accessibilityLabel={idea}
              accessibilityHint={line ? 'Puts a first line in the message box for you to finish.' : undefined}
              style={({ pressed }) => [s.idea, pressed && s.ideaPressed]}
            >
              <Text style={s.ideaText} numberOfLines={3}>
                {idea}
              </Text>
              {line ? (
                <View style={s.use}>
                  <ArrowUpRightIcon size={15} weight="bold" color={e.colors.accent} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: e.colors.line,
  },
  icon: { width: theme.touchTarget.min, height: theme.touchTarget.min, alignItems: 'center', justifyContent: 'center' },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: theme.touchTarget.min },
  whoText: { flex: 1, gap: 1 },
  sub: { fontFamily: e.fonts.body, fontSize: 12, color: e.colors.muted },
  pressed: { opacity: theme.opacity.pressed },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: theme.spacing.lg - 4,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: e.colors.line,
  },
  noticeText: { flex: 1, fontFamily: e.fonts.body, fontSize: 13, lineHeight: 18, color: e.colors.ink },
  ideas: { gap: 10, paddingBottom: theme.spacing.md },
  ideasHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: theme.spacing.base + 2,
    paddingRight: theme.spacing.sm,
  },
  overline: { fontFamily: e.fonts.bodySemibold, fontSize: 11, letterSpacing: 1.1, color: e.colors.muted },
  ideasTools: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32, paddingHorizontal: theme.spacing.sm },
  toolText: { fontFamily: e.fonts.bodySemibold, fontSize: 13, color: e.colors.ink },
  ideaRow: { paddingHorizontal: theme.spacing.base, gap: IDEA_GAP },
  idea: {
    width: IDEA_WIDTH,
    minHeight: 84,
    backgroundColor: e.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: e.colors.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 28,
  },
  ideaPressed: { borderColor: e.colors.ink },
  ideaText: { fontFamily: e.fonts.body, fontSize: 14.5, lineHeight: 20, color: e.colors.ink },
  use: { position: 'absolute', right: 12, bottom: 10 },
});
