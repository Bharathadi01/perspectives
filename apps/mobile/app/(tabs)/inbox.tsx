import Ionicons from '@expo/vector-icons/Ionicons';
import { NotHelpfulReason, PostRef, ReceivedPerspective } from '@perspective/contracts';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/api/client';
import { DailyProgress } from '../../src/components/perspective/DailyProgress';
import { PerspectiveCard } from '../../src/components/perspective/PerspectiveCard';
import { SafetyMenu } from '../../src/components/SafetyMenu';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { Sheet } from '../../src/components/ui/Sheet';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/ui/States';
import { Heading, Label, Muted, Title } from '../../src/components/ui/Text';
import { useToast } from '../../src/components/ui/Toast';
import { useAcceptConnect, useDeclineConnect, useFeedback, useInbox } from '../../src/features/hooks';
import { errorMessage } from '../../src/lib/errors';
import { NOT_HELPFUL_LABEL } from '../../src/lib/labels';
import { theme } from '../../src/theme';

function PostHeader({ post }: { post: PostRef }) {
  return (
    <View style={s.postHeader}>
      {post.kind === 'photo' && post.mediaUrl ? (
        <Image source={{ uri: api.mediaUrl(post.mediaUrl) }} style={s.thumb} accessibilityIgnoresInvertColors />
      ) : post.kind === 'audio' ? (
        <View style={[s.thumb, s.audioThumb]}>
          <Ionicons name="mic-outline" size={18} color={theme.colors.brand} />
        </View>
      ) : (
        <View style={[s.thumb, s.audioThumb]}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.colors.brand} />
        </View>
      )}
      <Text style={s.postPrompt} numberOfLines={2}>
        {post.prompt}
      </Text>
    </View>
  );
}

function SmallAction({ icon, label, onPress, active }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [s.action, active && s.actionActive, pressed && s.pressed]}>
      <Ionicons name={icon} size={16} color={active ? theme.colors.onDark : theme.colors.ink} />
      <Text style={[s.actionText, active && s.actionTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function Inbox() {
  const inbox = useInbox();
  const feedback = useFeedback();
  const accept = useAcceptConnect();
  const decline = useDeclineConnect();
  const toast = useToast();
  const [notHelpfulFor, setNotHelpfulFor] = useState<ReceivedPerspective | null>(null);
  const [safetyFor, setSafetyFor] = useState<ReceivedPerspective | null>(null);

  if (inbox.isLoading) return <LoadingState />;
  if (inbox.isError || !inbox.data) return <ErrorState error={inbox.error} onRetry={() => void inbox.refetch()} />;
  const { daily, lockedCount, groups, connectRequests } = inbox.data;
  const remaining = Math.max(0, daily.requiredCount - daily.givenCount);

  const sendFeedback = async (p: ReceivedPerspective, verdict: 'helpful' | 'not_helpful', extra: { reason?: NotHelpfulReason; thankPrivately?: boolean } = {}) => {
    try {
      await feedback.run({ id: p.id, input: { verdict, ...extra } });
      toast(extra.thankPrivately ? `Thanks sent to ${p.giver.displayName}.` : verdict === 'helpful' ? 'Marked helpful.' : 'Thanks, noted privately.', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const answer = async (requestId: string, yes: boolean) => {
    try {
      if (yes) {
        const connection = await accept.run(requestId);
        toast(`You’re connected with ${connection.partner.displayName}.`, 'success');
        router.push({ pathname: '/chat/[id]', params: { id: connection.id } });
      } else {
        await decline.run(requestId);
        toast('Declined. They won’t be told.', 'info');
      }
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const empty = groups.length === 0 && connectRequests.length === 0 && lockedCount === 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={inbox.isRefetching} onRefresh={() => void inbox.refetch()} />}>
        <Title>Inbox</Title>
        <DailyProgress daily={daily} />

        {lockedCount > 0 ? (
          <View style={s.locked}>
            <Ionicons name="lock-closed" size={22} color={theme.colors.onDark} />
            <Heading style={s.lockedTitle}>
              {lockedCount} {lockedCount === 1 ? 'thing is' : 'things are'} waiting for you
            </Heading>
            <Text style={s.lockedText}>
              Give {remaining} more {remaining === 1 ? 'perspective' : 'perspectives'} today to unlock what people said about you.
            </Text>
            <Button title="Go to Explore" variant="secondary" onPress={() => router.push('/(tabs)/explore')} />
          </View>
        ) : null}

        {empty ? (
          <EmptyState
            icon="mail-open-outline"
            title="No perspectives yet"
            description="When people give you perspectives, they show up here. Adding more posts helps people find something to talk about."
            actionTitle="Add a post"
            onAction={() => router.push('/post/new')}
          />
        ) : null}

        {connectRequests.length > 0 ? (
          <View style={s.section}>
            <Label>Wants to connect</Label>
            {connectRequests.map((r) => (
              <PerspectiveCard
                key={r.id}
                person={r.sender}
                comment={r.perspective.comment}
                chips={r.perspective.chips}
                createdAt={r.createdAt}
                onPressPerson={() => router.push({ pathname: '/profile/[id]', params: { id: r.sender.id } })}
                footer={
                  <View style={s.gap}>
                    <Muted>On your post: “{r.perspective.post.prompt}”</Muted>
                    <View style={s.row}>
                      <Button title="Decline" variant="secondary" style={s.flex} onPress={() => void answer(r.id, false)} />
                      <Button title="Connect" style={s.flex} onPress={() => void answer(r.id, true)} loading={accept.isPending} />
                    </View>
                  </View>
                }
              />
            ))}
          </View>
        ) : null}

        {groups.map((g) => (
          <View key={g.post.id} style={s.section}>
            <PostHeader post={g.post} />
            {g.perspectives.map((p) => (
              <PerspectiveCard
                key={p.id}
                person={p.giver}
                comment={p.comment}
                chips={p.chips}
                createdAt={p.createdAt}
                onPressPerson={() => router.push({ pathname: '/profile/[id]', params: { id: p.giver.id } })}
                onMore={() => setSafetyFor(p)}
                footer={
                  p.feedback ? (
                    <Muted>
                      {p.feedback.verdict === 'helpful' ? 'You found this helpful' : 'Marked not helpful (private)'}
                      {p.feedback.thanked ? ' · Thanked' : ''}
                    </Muted>
                  ) : (
                    <View style={s.actions}>
                      <SmallAction icon="thumbs-up-outline" label="Helpful" onPress={() => void sendFeedback(p, 'helpful')} />
                      <SmallAction icon="heart-outline" label="Thank" onPress={() => void sendFeedback(p, 'helpful', { thankPrivately: true })} />
                      <SmallAction icon="thumbs-down-outline" label="Not helpful" onPress={() => setNotHelpfulFor(p)} />
                      <SmallAction
                        icon="person-add-outline"
                        label={p.pendingConnectRequestId ? 'Wants to connect' : 'Connect'}
                        active={!!p.pendingConnectRequestId}
                        onPress={() => router.push({ pathname: '/profile/[id]', params: { id: p.giver.id } })}
                      />
                    </View>
                  )
                }
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <Sheet visible={!!notHelpfulFor} onClose={() => setNotHelpfulFor(null)} title="Why wasn’t it helpful?" subtitle="This stays private and helps keep perspectives useful.">
        {NotHelpfulReason.options.map((reason) => (
          <Pressable
            key={reason}
            accessibilityRole="button"
            style={s.reason}
            onPress={() => {
              const p = notHelpfulFor;
              setNotHelpfulFor(null);
              if (p) void sendFeedback(p, 'not_helpful', { reason });
            }}
          >
            <Text style={s.reasonText}>{NOT_HELPFUL_LABEL[reason]}</Text>
          </Pressable>
        ))}
      </Sheet>

      {safetyFor ? (
        <SafetyMenu
          visible
          onClose={() => setSafetyFor(null)}
          target={{ type: 'perspective', id: safetyFor.id, label: 'this perspective' }}
          userId={safetyFor.giver.id}
          onDone={() => void inbox.refetch()}
        />
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: theme.spacing.base, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  locked: { backgroundColor: theme.colors.ink, borderRadius: theme.radius.media, padding: theme.spacing.lg, gap: theme.spacing.sm },
  lockedTitle: { color: theme.colors.onDark },
  lockedText: { color: theme.colors.onDark, opacity: 0.85, fontSize: theme.typography.fontSize.sm, marginBottom: theme.spacing.sm },
  section: { gap: theme.spacing.md },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  thumb: { width: 44, height: 55, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceMuted },
  audioThumb: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.brandSoft },
  postPrompt: { flex: 1, fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.ink },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: theme.touchTarget.min - 4,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  actionActive: { backgroundColor: theme.colors.brand },
  actionText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.ink, fontWeight: theme.typography.fontWeight.medium },
  actionTextActive: { color: theme.colors.onDark },
  pressed: { opacity: 0.7 },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  flex: { flex: 1 },
  gap: { gap: theme.spacing.md },
  reason: { minHeight: theme.touchTarget.min, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  reasonText: { fontSize: theme.typography.fontSize.base, color: theme.colors.ink },
});
