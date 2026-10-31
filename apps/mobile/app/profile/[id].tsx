import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetAction } from '../../src/components/editorial/PaperSheet';
import { SafetyMenu } from '../../src/components/SafetyMenu';
import { CaretLeftIcon, ChatCircleIcon, DotsThreeIcon } from '../../src/components/ui/icons';
import { Screen } from '../../src/components/ui/Screen';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { useToast } from '../../src/components/ui/Toast';
import { ExploreProfile } from '../../src/features/explore/ExploreProfile';
import { GiveComposer, type GiveTarget } from '../../src/features/give/GiveComposer';
import { thingsInCommon } from '../../src/features/explore/inCommon';
import { useAcceptConnect, useDeclineConnect, useMe, useProfileView, useRequestConnect } from '../../src/features/hooks';
import { errorMessage } from '../../src/lib/errors';
import { theme } from '../../src/theme';

const e = theme.editorial;

/**
 * Someone's profile, opened from the Inbox (Connect), a chat or your given list. In the editorial
 * look like Explore (2026-10-26); the connect rules and wording are unchanged.
 */
export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const view = useProfileView(id ?? '');
  const me = useMe();
  const request = useRequestConnect();
  const accept = useAcceptConnect();
  const decline = useDeclineConnect();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [giving, setGiving] = useState<GiveTarget | null>(null);

  if (view.isLoading) return <LoadingState />;
  if (view.isError || !view.data) return <ErrorState error={view.error} onRetry={() => void view.refetch()} />;
  const { profile, relationship: rel, givenPostIds } = view.data;
  const name = profile.displayName;

  const run = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast(success, 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const bar = (() => {
    if (rel.connectionId) {
      return (
        <SheetAction
          label={`Message ${name}`}
          tone="primary"
          onPress={() => router.push({ pathname: '/chat/[id]', params: { id: rel.connectionId! } })}
        />
      );
    }
    if (rel.incomingRequestId && !rel.gaveToThem) {
      const requestId = rel.incomingRequestId;
      return (
        <View style={s.gap}>
          <Text style={s.info}>{name} asked to connect. Give {name} a perspective on any post to accept.</Text>
          <SheetAction
            label="Decline"
            disabled={decline.isPending}
            onPress={() => void run(() => decline.run(requestId), 'Declined. They won’t be told.')}
          />
        </View>
      );
    }
    if (rel.incomingRequestId) {
      const requestId = rel.incomingRequestId;
      return (
        <View style={s.row}>
          <View style={s.flex}>
            <SheetAction
              label="Decline"
              disabled={decline.isPending || accept.isPending}
              onPress={() => void run(() => decline.run(requestId), 'Declined. They won’t be told.')}
            />
          </View>
          <View style={s.flex}>
            <SheetAction
              label={accept.isPending ? 'Connecting…' : 'Connect'}
              tone="primary"
              disabled={accept.isPending || decline.isPending}
              onPress={() =>
                void accept
                  .run(requestId)
                  .then((c) => router.replace({ pathname: '/connected', params: { ids: c.id } }))
                  .catch((err: unknown) => toast(errorMessage(err), 'error'))
              }
            />
          </View>
        </View>
      );
    }
    if (rel.outgoingRequestPending) return <Text style={s.info}>Request sent. {name} will see your perspective.</Text>;
    if (rel.cooldownUntil) {
      return <Text style={s.info}>You can ask {name} to connect again on {new Date(rel.cooldownUntil).toLocaleDateString()}.</Text>;
    }
    if (rel.canRequestConnect) {
      return (
        <SheetAction
          label={request.isPending ? 'Sending…' : `Connect with ${name}`}
          tone="primary"
          disabled={request.isPending}
          onPress={() => void run(() => request.run(profile.id), `Request sent. ${name} will see your perspective.`)}
        />
      );
    }
    if (!rel.gaveToThem) {
      return <Text style={s.info}>Give {name} a perspective on any post to be able to connect.</Text>;
    }
    return null;
  })();

  return (
    <Screen style={s.paper}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={s.icon}>
          <CaretLeftIcon size={24} color={e.colors.ink} />
        </Pressable>
        <Pressable onPress={() => setSafetyOpen(true)} accessibilityRole="button" accessibilityLabel="Report or block" style={s.icon}>
          <DotsThreeIcon size={28} weight="bold" color={e.colors.ink} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: (bar ? 150 : 48) + insets.bottom }]}>
        {rel.theyGaveToMe ? (
          <View style={s.note} accessible accessibilityLabel={`${name} left you a perspective. Give one back on any of ${name}’s posts below.`}>
            <View style={s.noteIcon}>
              <ChatCircleIcon size={18} weight="fill" color={e.colors.onInk} />
            </View>
            <View style={s.noteBody}>
              <Text style={s.noteTitle}>{name} left you a perspective</Text>
              <Text style={s.noteText}>Give one back on any of {name}’s posts below.</Text>
            </View>
          </View>
        ) : null}
        <ExploreProfile
          profile={profile}
          givenPostIds={givenPostIds}
          inCommon={me.data ? thingsInCommon(me.data, profile) : []}
          onGive={(post) => setGiving({ post, profileId: profile.id, name })}
        />
      </ScrollView>
      {bar ? <View style={[s.bar, { paddingBottom: insets.bottom + theme.spacing.md }]}>{bar}</View> : null}
      <GiveComposer target={giving} onClose={() => setGiving(null)} />
      <SafetyMenu
        visible={safetyOpen}
        onClose={() => setSafetyOpen(false)}
        target={{ type: 'profile', id: profile.id, label: 'this profile' }}
        userId={profile.id}
        onDone={(action) => action === 'blocked' && router.back()}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  paper: { backgroundColor: e.colors.paper },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: theme.spacing.sm },
  icon: { width: theme.touchTarget.min, height: theme.touchTarget.min, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: theme.spacing.lg - 4, paddingTop: theme.spacing.xs, gap: theme.spacing.base },
  note: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.xs },
  noteIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: e.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBody: { flex: 1, gap: 2 },
  noteTitle: { fontFamily: e.fonts.bodySemibold, fontSize: 15, lineHeight: 20, color: e.colors.ink },
  noteText: { fontFamily: e.fonts.body, fontSize: 14, lineHeight: 19, color: e.colors.muted },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: e.colors.paper,
    borderTopWidth: theme.borderWidth.hairline,
    borderTopColor: e.colors.line,
    paddingHorizontal: theme.spacing.lg - 4,
    paddingTop: theme.spacing.md,
  },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  gap: { gap: theme.spacing.sm },
  flex: { flex: 1 },
  info: { textAlign: 'center', fontFamily: e.fonts.body, fontSize: 14, lineHeight: 20, color: e.colors.muted, paddingVertical: theme.spacing.sm },
});
