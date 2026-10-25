import { NotHelpfulReason, ReceivedPerspective } from '@perspective/contracts';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PaperSheet } from '../../src/components/editorial/PaperSheet';
import { PaperLoading, PaperState } from '../../src/components/editorial/PaperState';
import { DailyProgress } from '../../src/components/perspective/DailyProgress';
import { SafetyMenu } from '../../src/components/SafetyMenu';
import { useTabBarSpace } from '../../src/components/ui/GlassTabBar';
import { useToast } from '../../src/components/ui/Toast';
import { useAcceptConnect, useDeclineConnect, useFeedback, useInbox } from '../../src/features/hooks';
import { LockedPreview, PostThread, REQUEST_CARD_WIDTH, RequestCard, type ReplyHandlers } from '../../src/features/inbox/InboxCards';
import { EnvelopeOpenIcon, WarningCircleIcon } from '../../src/features/inbox/icons';
import { errorMessage } from '../../src/lib/errors';
import { selection } from '../../src/lib/haptics';
import { NOT_HELPFUL_LABEL } from '../../src/lib/labels';
import { theme } from '../../src/theme';

const e = theme.editorial;

/** What people said about you, grouped by your posts, in the same editorial look as Explore. */
export default function Inbox() {
  const inbox = useInbox();
  const space = useTabBarSpace();
  const feedback = useFeedback();
  const accept = useAcceptConnect();
  const decline = useDeclineConnect();
  const toast = useToast();
  const [notHelpfulFor, setNotHelpfulFor] = useState<ReceivedPerspective | null>(null);
  const [safetyFor, setSafetyFor] = useState<ReceivedPerspective | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  if (inbox.isLoading) return <PaperLoading />;
  if (inbox.isError || !inbox.data) {
    return (
      <SafeAreaView edges={['top']} style={s.screen}>
        <PaperState
          icon={<WarningCircleIcon size={30} color={e.colors.ink} />}
          title="Couldn’t load your inbox"
          body={errorMessage(inbox.error)}
          action="Try again"
          onAction={() => void inbox.refetch()}
        />
      </SafeAreaView>
    );
  }
  const { daily, lockedCount, groups, connectRequests } = inbox.data;
  const remaining = Math.max(0, daily.requiredCount - daily.givenCount);
  const openProfile = (id: string) => router.push({ pathname: '/profile/[id]', params: { id } });

  const sendFeedback = async (p: ReceivedPerspective, verdict: 'helpful' | 'not_helpful', reason?: NotHelpfulReason) => {
    setBusyId(p.id);
    try {
      await feedback.run({ id: p.id, input: { verdict, ...(reason ? { reason } : {}) } });
      selection();
      toast(verdict === 'helpful' ? 'Marked helpful.' : 'Noted. Only you see this.', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const answer = async (requestId: string, yes: boolean) => {
    if (yes) setAcceptingId(requestId);
    try {
      if (yes) {
        const connection = await accept.run(requestId);
        // The connected moment, then straight into the chat.
        router.push({ pathname: '/connected', params: { ids: connection.id } });
      } else {
        await decline.run(requestId);
        toast('Declined. They won’t be told.', 'info');
      }
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setAcceptingId(null);
    }
  };

  const empty = groups.length === 0 && connectRequests.length === 0 && lockedCount === 0;
  const total = groups.reduce((n, g) => n + g.perspectives.length, 0);
  const unrated = groups.reduce((n, g) => n + g.perspectives.filter((p) => !p.feedback).length, 0);
  const summary = [
    total > 0 ? `${total} ${total === 1 ? 'perspective' : 'perspectives'}${unrated > 0 ? ` · ${unrated} to rate` : ''}` : null,
    connectRequests.length > 0 ? `${connectRequests.length} ${connectRequests.length === 1 ? 'wants' : 'want'} to connect` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const handlers: ReplyHandlers = {
    busyId,
    onOpenPerson: (person) => openProfile(person.id),
    onConnect: (person) => openProfile(person.id),
    onMore: (p) => setSafetyFor(p),
    onHelpful: (p) => void sendFeedback(p, 'helpful'),
    onNotHelpful: (p) => setNotHelpfulFor(p),
  };

  return (
    <SafeAreaView edges={['top']} style={s.screen}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: space + theme.spacing.xl }]}
        refreshControl={<RefreshControl refreshing={inbox.isRefetching} onRefresh={() => void inbox.refetch()} tintColor={e.colors.ink} />}
      >
        <View style={s.topBar}>
          <DailyProgress daily={daily} tone="dark" />
        </View>
        <View style={s.heading}>
          <Text style={s.title} accessibilityRole="header">
            Inbox
          </Text>
          {summary ? <Text style={s.summary}>{summary}</Text> : null}
        </View>

        {lockedCount > 0 ? (
          <LockedPreview count={lockedCount} remaining={remaining} onGo={() => router.push('/(tabs)/explore')} />
        ) : null}

        {empty ? (
          <View style={s.emptyWrap}>
            <PaperState
              icon={<EnvelopeOpenIcon size={30} color={e.colors.ink} />}
              title="No perspectives yet"
              body="When people give you perspectives, they show up here. Adding more posts helps people find something to talk about."
              action="Add a post"
              onAction={() => router.push('/post/new')}
            />
          </View>
        ) : null}

        {connectRequests.length > 0 ? (
          <View style={s.section}>
            <Text style={s.overline}>WANTS TO CONNECT</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={REQUEST_CARD_WIDTH + theme.spacing.md}
              decelerationRate="fast"
              style={s.bleed}
              contentContainerStyle={s.requestRow}
            >
              {connectRequests.map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  accepting={acceptingId === r.id}
                  onOpenPerson={() => openProfile(r.sender.id)}
                  onAccept={() => void answer(r.id, true)}
                  onGiveBack={() => openProfile(r.sender.id)}
                  onDecline={() => void answer(r.id, false)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {groups.length > 0 ? (
          <View style={s.section}>
            <Text style={s.overline}>ON YOUR POSTS</Text>
            {groups.map((g) => (
              <PostThread key={g.post.id} post={g.post} perspectives={g.perspectives} handlers={handlers} />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <PaperSheet
        visible={!!notHelpfulFor}
        onClose={() => setNotHelpfulFor(null)}
        title="Why wasn’t it helpful?"
        subtitle="This stays private and helps keep perspectives useful."
      >
        <View style={s.reasons}>
          {NotHelpfulReason.options.map((reason, i) => (
            <Pressable
              key={reason}
              accessibilityRole="button"
              style={({ pressed }) => [s.reason, i > 0 && s.reasonRule, pressed && s.pressed]}
              onPress={() => {
                const p = notHelpfulFor;
                setNotHelpfulFor(null);
                if (p) void sendFeedback(p, 'not_helpful', reason);
              }}
            >
              <Text style={s.reasonText}>{NOT_HELPFUL_LABEL[reason]}</Text>
            </Pressable>
          ))}
        </View>
      </PaperSheet>

      {safetyFor ? (
        <SafetyMenu
          visible
          onClose={() => setSafetyFor(null)}
          target={{ type: 'perspective', id: safetyFor.id, label: 'this perspective' }}
          userId={safetyFor.giver.id}
          onDone={() => void inbox.refetch()}
        />
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: e.colors.paper },
  content: { paddingHorizontal: theme.spacing.base, gap: theme.spacing.lg },
  pressed: { opacity: theme.opacity.pressed },
  topBar: { flexDirection: 'row', alignItems: 'center', minHeight: theme.touchTarget.min, paddingTop: theme.spacing.xs },
  heading: { marginTop: -theme.spacing.sm, paddingHorizontal: 4, gap: 4 },
  title: { fontFamily: e.fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.4, color: e.colors.ink },
  summary: { fontFamily: e.fonts.body, fontSize: 14, lineHeight: 20, color: e.colors.muted },
  bleed: { marginHorizontal: -theme.spacing.base },
  requestRow: { paddingHorizontal: theme.spacing.base, gap: theme.spacing.md },
  emptyWrap: { minHeight: 420 },
  section: { gap: theme.spacing.md },
  overline: { fontFamily: e.fonts.bodySemibold, fontSize: 11, letterSpacing: 1.1, color: e.colors.muted, paddingHorizontal: 4 },
  reasons: { marginTop: -theme.spacing.xs },
  reason: { minHeight: 52, justifyContent: 'center' },
  reasonRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: e.colors.line },
  reasonText: { fontFamily: e.fonts.body, fontSize: 16, color: e.colors.ink },
});
