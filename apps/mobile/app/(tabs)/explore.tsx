import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DailyProgress } from '../../src/components/perspective/DailyProgress';
import { InCommonCard } from '../../src/components/profile/InCommonCard';
import { ProfileView } from '../../src/components/profile/ProfileView';
import { SafetyMenu } from '../../src/components/SafetyMenu';
import { IconButton } from '../../src/components/ui/IconButton';
import { Screen } from '../../src/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/ui/States';
import { useToast } from '../../src/components/ui/Toast';
import { thingsInCommon } from '../../src/features/explore/inCommon';
import { useExplore, useMe, useNotices, useSkip } from '../../src/features/hooks';
import { errorMessage } from '../../src/lib/errors';
import { theme } from '../../src/theme';

/**
 * One profile at a time: today's mandatory set first, then a short optional batch. Cards carry no
 * slot note (removed 2026-10-25): set, boost and bonus profiles all look the same.
 */
export default function Explore() {
  const explore = useExplore();
  const skip = useSkip();
  const notices = useNotices();
  const me = useMe();
  const toast = useToast();
  const [safetyOpen, setSafetyOpen] = useState(false);
  const unread = notices.data?.unreadCount ?? 0;

  if (explore.isLoading) return <LoadingState label="Finding today’s profiles" />;
  if (explore.isError || !explore.data) return <ErrorState error={explore.error} onRetry={() => void explore.refetch()} />;

  const { daily, card } = explore.data;

  const doSkip = async () => {
    if (!card) return;
    try {
      await skip.run(card.profile.id);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <Screen>
      <View style={s.topBar}>
        <DailyProgress daily={daily} tone="dark" />
        <View style={s.actions}>
          <Pressable
            onPress={() => router.push('/me/notices')}
            accessibilityRole="button"
            accessibilityLabel={unread > 0 ? `Notices, ${unread} new` : 'Notices'}
            style={({ pressed }) => [s.iconTap, pressed && s.pressed]}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.colors.ink} />
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
            <Ionicons name="options-outline" size={26} color={theme.colors.ink} />
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
            contentContainerStyle={s.scroll}
            refreshControl={<RefreshControl refreshing={explore.isRefetching} onRefresh={() => void explore.refetch()} />}
          >
            <ProfileView
              profile={card.profile}
              givenPostIds={card.givenPostIds}
              hideAnswered
              afterPrimary={me.data ? <InCommonCard name={card.profile.displayName} items={thingsInCommon(me.data, card.profile)} /> : null}
              onGive={(post) => router.push({ pathname: '/give/[postId]', params: { postId: post.id, profileId: card.profile.id } })}
              headerRight={
                <Pressable
                  onPress={() => setSafetyOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Report or block"
                  style={({ pressed }) => [s.iconTap, pressed && s.pressed]}
                >
                  <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.ink} />
                </Pressable>
              }
            />
          </ScrollView>
          <IconButton icon="close" onPress={() => void doSkip()} accessibilityLabel={`Skip ${card.profile.displayName}`} style={s.skip} disabled={skip.isPending} />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: theme.spacing.base,
    paddingRight: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  actions: { flexDirection: 'row', alignItems: 'center' },
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
    backgroundColor: theme.colors.ink,
    borderWidth: 2,
    borderColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.onDark },
  scroll: { padding: theme.spacing.base, paddingBottom: 120, gap: theme.spacing.sm },
  skip: { position: 'absolute', left: theme.spacing.lg, bottom: theme.spacing.lg },
});
