import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DailyProgress } from '../../src/components/perspective/DailyProgress';
import { ProfileView } from '../../src/components/profile/ProfileView';
import { SafetyMenu } from '../../src/components/SafetyMenu';
import { IconButton } from '../../src/components/ui/IconButton';
import { Screen } from '../../src/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/ui/States';
import { useToast } from '../../src/components/ui/Toast';
import { useExplore, useSkip } from '../../src/features/hooks';
import { errorMessage } from '../../src/lib/errors';
import { theme } from '../../src/theme';

const SLOT_NOTE = {
  boost: 'This person hasn’t had many perspectives yet. Yours could be their first.',
  mandatory: 'Part of today’s set. Give a perspective on any one post.',
  optional: 'Bonus profile. Give a perspective if you want to.',
} as const;

/** One profile at a time: today's mandatory set first, then a short optional batch. */
export default function Explore() {
  const explore = useExplore();
  const skip = useSkip();
  const toast = useToast();
  const [safetyOpen, setSafetyOpen] = useState(false);

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
        <DailyProgress daily={daily} />
        {card ? (
          <Pressable onPress={() => setSafetyOpen(true)} accessibilityRole="button" accessibilityLabel="Report or block" style={s.more}>
            <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.ink} />
          </Pressable>
        ) : null}
      </View>

      {!card ? (
        <EmptyState
          icon={daily.unlocked ? 'sparkles-outline' : 'hourglass-outline'}
          title={daily.unlocked ? 'You’re done for today' : 'No one to show right now'}
          description={
            daily.unlocked
              ? 'Your perspectives are unlocked. Come back tomorrow for a new set.'
              : 'There’s nobody in your audience yet. Your inbox unlocks once there is, or widen who sees you in You → Edit.'
          }
          actionTitle={daily.unlocked ? 'Open your inbox' : undefined}
          onAction={daily.unlocked ? () => router.push('/(tabs)/inbox') : undefined}
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={s.scroll}
            refreshControl={<RefreshControl refreshing={explore.isRefetching} onRefresh={() => void explore.refetch()} />}
          >
            <Text style={s.note}>{SLOT_NOTE[card.slot]}</Text>
            <ProfileView
              profile={card.profile}
              givenPostIds={card.givenPostIds}
              onGive={(post) => router.push({ pathname: '/give/[postId]', params: { postId: post.id, profileId: card.profile.id } })}
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
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.base, paddingVertical: theme.spacing.sm },
  more: { minWidth: theme.touchTarget.min, minHeight: theme.touchTarget.min, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: theme.spacing.base, paddingBottom: 120, gap: theme.spacing.sm },
  note: { fontSize: theme.typography.fontSize.sm, color: theme.colors.muted },
  skip: { position: 'absolute', left: theme.spacing.lg, bottom: theme.spacing.lg },
});
