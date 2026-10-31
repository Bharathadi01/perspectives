import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DailyProgress } from '../../src/components/perspective/DailyProgress';
import { SafetyMenu } from '../../src/components/SafetyMenu';
import { useTabBarSpace } from '../../src/components/ui/GlassTabBar';
import { IconButton } from '../../src/components/ui/IconButton';
import { Screen } from '../../src/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/ui/States';
import { useToast } from '../../src/components/ui/Toast';
import { ExploreProfile } from '../../src/features/explore/ExploreProfile';
import { GiveComposer, type GiveTarget } from '../../src/features/give/GiveComposer';
import { BellIcon, DotsThreeIcon, SlidersHorizontalIcon, XIcon } from '../../src/components/ui/icons';
import { thingsInCommon } from '../../src/features/explore/inCommon';
import { Float, Rise } from '../../src/features/onboarding/motion';
import { useExplore, useMe, useNotices, useSkip } from '../../src/features/hooks';
import { errorMessage } from '../../src/lib/errors';
import { theme } from '../../src/theme';

/**
 * One profile at a time: today's mandatory set first, then a short optional batch. Cards carry no
 * slot note (removed 2026-10-25): set, boost and bonus profiles all look the same. Explore is the
 * first screen in the editorial look (theme.editorial, chosen 2026-10-25).
 */
const e = theme.editorial;
/** Room under the last card for the floating skip button. */
const SKIP_CLEARANCE = 88;

export default function Explore() {
  const explore = useExplore();
  const skip = useSkip();
  const notices = useNotices();
  const me = useMe();
  const space = useTabBarSpace();
  const toast = useToast();
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [giving, setGiving] = useState<GiveTarget | null>(null);
  // Straight after onboarding, a one-time note explains today's set (design screen 32).
  const { welcome } = useLocalSearchParams<{ welcome?: string }>();
  const [coach, setCoach] = useState(welcome === '1');
  const unread = notices.data?.unreadCount ?? 0;

  if (explore.isLoading) return <LoadingState label="Finding today’s profiles" />;
  if (explore.isError || !explore.data) return <ErrorState error={explore.error} onRetry={() => void explore.refetch()} />;

  const { daily, card } = explore.data;
  const coachText = `Give a perspective to ${daily.requiredCount === 1 ? 'this person' : `these ${daily.requiredCount}`} and the ones people gave you unlock.`;
  const dismissCoach = () => {
    setCoach(false);
    router.setParams({ welcome: '' });
  };

  const doSkip = async () => {
    if (!card) return;
    try {
      await skip.run(card.profile.id);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <Screen style={s.paper}>
      <View style={s.topBar}>
        <DailyProgress daily={daily} tone="dark" />
        <View style={s.actions}>
          <Pressable
            onPress={() => router.push('/me/notices')}
            accessibilityRole="button"
            accessibilityLabel={unread > 0 ? `Notices, ${unread} new` : 'Notices'}
            style={({ pressed }) => [s.iconTap, pressed && s.pressed]}
          >
            <BellIcon size={25} color={e.colors.ink} />
            {unread > 0 ? (
              <View style={s.badge}>
                <Text style={s.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => router.push('/filters')}
            accessibilityRole="button"
            accessibilityLabel="Filters: who you see"
            style={({ pressed }) => [s.iconTap, pressed && s.pressed]}
          >
            <SlidersHorizontalIcon size={25} color={e.colors.ink} />
          </Pressable>
        </View>
      </View>

      {!card ? (
        <EmptyState
          icon={daily.unlocked ? 'sparkles-outline' : 'hourglass-outline'}
          title={daily.unlocked ? 'You’re done for today' : 'No one to show right now'}
          description={
            daily.unlocked
              ? 'Your perspectives are unlocked. Come back tomorrow for a new set.'
              : 'There’s nobody in your audience yet. Your inbox unlocks once there is, or widen who you see with the filter button.'
          }
          actionTitle={daily.unlocked ? 'Open your inbox' : 'Change who you see'}
          onAction={daily.unlocked ? () => router.push('/(tabs)/inbox') : () => router.push('/filters')}
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[s.scroll, { paddingBottom: space + SKIP_CLEARANCE }]}
            refreshControl={<RefreshControl refreshing={explore.isRefetching} onRefresh={() => void explore.refetch()} />}
          >
            <ExploreProfile
              profile={card.profile}
              givenPostIds={card.givenPostIds}
              inCommon={me.data ? thingsInCommon(me.data, card.profile) : []}
              onGive={(post) => {
                if (coach) dismissCoach();
                setGiving({ post, profileId: card.profile.id, name: card.profile.displayName });
              }}
              headerRight={
                <Pressable
                  onPress={() => setSafetyOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Report or block"
                  style={({ pressed }) => [s.iconTap, pressed && s.pressed]}
                >
                  <DotsThreeIcon size={28} weight="bold" color={e.colors.ink} />
                </Pressable>
              }
            />
          </ScrollView>
          <IconButton
            icon="close"
            renderIcon={({ size, color }) => <XIcon size={size} color={color} />}
            onPress={() => void doSkip()}
            accessibilityLabel={`Skip ${card.profile.displayName}`}
            style={{ ...s.skip, bottom: space + theme.spacing.md }}
            disabled={skip.isPending}
          />
          {coach && !daily.unlocked && daily.requiredCount > 0 ? (
            <Rise delay={1200} duration={500} style={s.coachWrap}>
              <Float duration={2800} delay={1800} distance={5}>
                <Pressable
                  onPress={dismissCoach}
                  accessibilityRole="button"
                  accessibilityLabel={coachText}
                  accessibilityHint="Dismisses this note"
                  style={s.coach}
                >
                  <View style={s.coachArrow} />
                  <Text style={s.coachText}>{coachText}</Text>
                  <XIcon size={14} color={e.colors.onInk} />
                </Pressable>
              </Float>
            </Rise>
          ) : null}
          <GiveComposer target={giving} onClose={() => setGiving(null)} />
          <SafetyMenu
            visible={safetyOpen}
            onClose={() => setSafetyOpen(false)}
            target={{ type: 'profile', id: card.profile.id, label: 'this profile' }}
            userId={card.profile.id}
            onDone={() => void explore.refetch()}
          />
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  paper: { backgroundColor: e.colors.paper },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: theme.spacing.base,
    paddingRight: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  actions: { flexDirection: 'row', alignItems: 'center' },
  coachWrap: { position: 'absolute', top: 56, left: theme.spacing.base, width: 260, zIndex: 2 },
  coach: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    // The darker clay keeps the white text above 4.5:1.
    backgroundColor: e.colors.accentText,
    borderRadius: 16,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: 14,
    shadowColor: e.colors.ink,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  coachArrow: {
    position: 'absolute',
    left: 30,
    top: -6,
    width: 12,
    height: 12,
    backgroundColor: e.colors.accentText,
    transform: [{ rotate: '45deg' }],
  },
  coachText: { flex: 1, fontFamily: e.fonts.body, fontSize: 13, lineHeight: 19, color: e.colors.onInk },
  iconTap: { minWidth: theme.touchTarget.min, minHeight: theme.touchTarget.min, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: theme.opacity.pressed },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: e.colors.ink,
    borderWidth: 2,
    borderColor: e.colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: e.fonts.bodyBold, fontSize: 10, color: e.colors.onInk },
  scroll: { paddingHorizontal: theme.spacing.lg - 4, paddingTop: theme.spacing.sm },
  // The skip button floats just above the tab bar; the screen runs underneath both.
  skip: { position: 'absolute', left: theme.spacing.lg },
});
