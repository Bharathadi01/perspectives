import Ionicons from '@expo/vector-icons/Ionicons';
import type { BlockedPerson } from '@perspective/contracts';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../src/components/profile/Avatar';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { Sheet } from '../../src/components/ui/Sheet';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/ui/States';
import { Muted, Title } from '../../src/components/ui/Text';
import { useToast } from '../../src/components/ui/Toast';
import { useBlocked, useUnblock } from '../../src/features/hooks';
import { errorMessage } from '../../src/lib/errors';
import { timeAgo } from '../../src/lib/labels';
import { theme } from '../../src/theme';

/**
 * You → Blocked people (decided 2026-10-20): everyone you blocked, with Unblock. Only you see this
 * list; the other person is never told they were blocked or unblocked.
 */
export default function Blocked() {
  const blocked = useBlocked();
  const unblock = useUnblock();
  const toast = useToast();
  const [confirming, setConfirming] = useState<BlockedPerson | null>(null);

  if (blocked.isLoading) return <LoadingState />;
  if (blocked.isError || !blocked.data) return <ErrorState error={blocked.error} onRetry={() => void blocked.refetch()} />;

  const confirmUnblock = async () => {
    const target = confirming;
    if (!target) return;
    try {
      await unblock.run(target.person.id);
      setConfirming(null);
      toast(`${target.person.displayName} is unblocked.`, 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={s.icon}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.ink} />
        </Pressable>
        <Title style={s.title}>Blocked people</Title>
        <View style={s.icon} />
      </View>
      <FlatList
        data={blocked.data}
        keyExtractor={(b) => b.person.id}
        contentContainerStyle={s.content}
        ListHeaderComponent={
          blocked.data.length > 0 ? <Muted>You and these people can’t see each other anywhere in Perspective. They aren’t told.</Muted> : undefined
        }
        ListEmptyComponent={
          <EmptyState icon="hand-left-outline" title="No one blocked" description="People you block from a profile, a perspective or a chat show up here." />
        }
        renderItem={({ item }) => (
          <View style={s.row}>
            <Avatar name={item.person.displayName} url={item.person.primaryPhotoUrl} />
            <View style={s.text}>
              <Text style={s.name}>
                {item.person.displayName}, {item.person.age}
              </Text>
              <Muted>Blocked {blockedWhen(item.blockedAt)}</Muted>
            </View>
            <Button title="Unblock" variant="secondary" onPress={() => setConfirming(item)} accessibilityLabel={`Unblock ${item.person.displayName}`} />
          </View>
        )}
      />
      <Sheet
        visible={!!confirming}
        onClose={() => setConfirming(null)}
        title={`Unblock ${confirming?.person.displayName ?? ''}?`}
        subtitle="You may see each other again in Explore and on profiles, if you’re in each other’s audience. They won’t be told. Your old conversation and any cancelled requests don’t come back."
      >
        <Button title="Unblock" onPress={() => void confirmUnblock()} loading={unblock.isPending} />
        <Button title="Cancel" variant="secondary" onPress={() => setConfirming(null)} />
      </Sheet>
    </Screen>
  );
}

function blockedWhen(iso: string): string {
  const ago = timeAgo(iso);
  return ago === 'just now' ? ago : `${ago} ago`;
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.sm },
  icon: { width: theme.touchTarget.min, height: theme.touchTarget.min, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: theme.typography.fontSize.lg },
  content: { padding: theme.spacing.base, gap: theme.spacing.md, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  text: { flex: 1, gap: 2 },
  name: { fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.ink },
});
