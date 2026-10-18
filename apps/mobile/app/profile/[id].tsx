import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileView } from '../../src/components/profile/ProfileView';
import { SafetyMenu } from '../../src/components/SafetyMenu';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { useToast } from '../../src/components/ui/Toast';
import { useAcceptConnect, useDeclineConnect, useProfileView, useRequestConnect } from '../../src/features/hooks';
import { errorMessage } from '../../src/lib/errors';
import { theme } from '../../src/theme';

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const view = useProfileView(id ?? '');
  const request = useRequestConnect();
  const accept = useAcceptConnect();
  const decline = useDeclineConnect();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [safetyOpen, setSafetyOpen] = useState(false);

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
      return <Button title={`Message ${name}`} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: rel.connectionId! } })} />;
    }
    if (rel.incomingRequestId && !rel.gaveToThem) {
      const requestId = rel.incomingRequestId;
      return (
        <View style={s.gap}>
          <Text style={s.info}>{name} asked to connect. Give {name} a perspective on any post to accept.</Text>
          <Button title="Decline" variant="secondary" onPress={() => void run(() => decline.run(requestId), 'Declined. They won’t be told.')} />
        </View>
      );
    }
    if (rel.incomingRequestId) {
      const requestId = rel.incomingRequestId;
      return (
        <View style={s.row}>
          <Button title="Decline" variant="secondary" style={s.flex} onPress={() => void run(() => decline.run(requestId), 'Declined. They won’t be told.')} />
          <Button
            title="Connect"
            style={s.flex}
            loading={accept.isPending}
            onPress={() =>
              void accept
                .run(requestId)
                .then((c) => router.replace({ pathname: '/connected', params: { ids: c.id } }))
                .catch((err: unknown) => toast(errorMessage(err), 'error'))
            }
          />
        </View>
      );
    }
    if (rel.outgoingRequestPending) return <Button title="Request sent" variant="secondary" disabled onPress={() => undefined} />;
    if (rel.cooldownUntil) {
      return <Text style={s.info}>You can ask {name} to connect again on {new Date(rel.cooldownUntil).toLocaleDateString()}.</Text>;
    }
    if (rel.canRequestConnect) {
      return (
        <Button
          title={`Connect with ${name}`}
          loading={request.isPending}
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
    <Screen>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={s.icon}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.ink} />
        </Pressable>
        <Pressable onPress={() => setSafetyOpen(true)} accessibilityRole="button" accessibilityLabel="Report or block" style={s.icon}>
          <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.ink} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {rel.theyGaveToMe ? <Text style={s.note}>{name} gave you a perspective. Give one back on any post below.</Text> : null}
        <ProfileView
          profile={profile}
          givenPostIds={givenPostIds}
          onGive={(post) => router.push({ pathname: '/give/[postId]', params: { postId: post.id, profileId: profile.id } })}
        />
      </ScrollView>
      {bar ? <View style={[s.bar, { paddingBottom: insets.bottom + theme.spacing.md }]}>{bar}</View> : null}
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
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: theme.spacing.sm },
  icon: { width: theme.touchTarget.min, height: theme.touchTarget.min, alignItems: 'center', justifyContent: 'center' },
  content: { padding: theme.spacing.base, paddingBottom: 140, gap: theme.spacing.md },
  note: { fontSize: theme.typography.fontSize.sm, color: theme.colors.brand, fontWeight: theme.typography.fontWeight.semibold },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.md,
  },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  gap: { gap: theme.spacing.sm },
  flex: { flex: 1 },
  info: { textAlign: 'center', color: theme.colors.muted, fontSize: theme.typography.fontSize.sm, paddingVertical: theme.spacing.sm },
});
