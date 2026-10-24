import Ionicons from '@expo/vector-icons/Ionicons';
import type { Notice } from '@perspective/contracts';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/ui/States';
import { Muted, Title } from '../../src/components/ui/Text';
import { useMarkNoticesRead, useNotices } from '../../src/features/hooks';
import { timeAgo } from '../../src/lib/labels';
import { theme } from '../../src/theme';

/** The in-app notices list (decided 2026-10-20). Opening it marks everything as read. */
export default function Notices() {
  const notices = useNotices();
  const markRead = useMarkNoticesRead();
  const marked = useRef(false);

  useEffect(() => {
    if (!marked.current && notices.data && notices.data.unreadCount > 0) {
      marked.current = true;
      void markRead.run(undefined).catch(() => {
        marked.current = false;
      });
    }
  }, [notices.data, markRead]);

  if (notices.isLoading) return <LoadingState />;
  if (notices.isError || !notices.data) return <ErrorState error={notices.error} onRetry={() => void notices.refetch()} />;

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={s.icon}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.ink} />
        </Pressable>
        <Title style={s.title}>Notices</Title>
        <View style={s.icon} />
      </View>
      <FlatList
        data={notices.data.notices}
        keyExtractor={(n) => n.id}
        contentContainerStyle={s.content}
        ListEmptyComponent={
          <EmptyState icon="notifications-outline" title="No notices" description="Changes we make to your settings show up here." />
        }
        renderItem={({ item }) => <NoticeCard notice={item} />}
      />
    </Screen>
  );
}

function NoticeCard({ notice }: { notice: Notice }) {
  switch (notice.kind) {
    case 'audience_widened':
      return (
        <NoticeShell
          notice={notice}
          icon="resize-outline"
          title={`We widened your age range to ${notice.minAge}–${notice.maxAge}`}
          body={`Very few people fit the ${notice.chosenMinAge}–${notice.chosenMaxAge} range you chose, so we added a couple of years at each end to bring in more people. Gender is never changed. You can set it back any time.`}
          action={{ title: 'Open your audience', onPress: () => router.push({ pathname: '/me/edit', params: { section: 'audience' } }) }}
        />
      );
    case 'weak_giver_tip':
      // The quality loop's first step (decided 2026-10-21): private, with no names and no numbers.
      return (
        <NoticeShell
          notice={notice}
          icon="bulb-outline"
          title="Make your perspectives count"
          body="The most useful perspectives are specific: answer the question the person asked, say what works and what doesn’t, and why. Short or general comments like “nice pic” don’t help much."
        />
      );
    case 'account_restored':
      return <NoticeShell notice={notice} icon="checkmark-circle-outline" title="Your account is back to normal" body={notice.reason} />;
  }
}

function NoticeShell({
  notice,
  icon,
  title,
  body,
  action,
}: {
  notice: Notice;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  action?: { title: string; onPress: () => void };
}) {
  return (
    <View style={s.card} accessible accessibilityLabel={`${notice.read ? '' : 'New. '}${title}`}>
      <View style={s.cardTop}>
        <Ionicons name={icon} size={18} color={theme.colors.brand} />
        <Text style={s.cardTitle}>{title}</Text>
        {!notice.read ? <View style={s.dot} /> : null}
      </View>
      <Muted>{body}</Muted>
      <View style={s.cardBottom}>
        <Muted style={s.time}>{timeAgo(notice.createdAt)}</Muted>
        {action ? <Button title={action.title} variant="secondary" onPress={action.onPress} /> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.sm },
  icon: { width: theme.touchTarget.min, height: theme.touchTarget.min, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: theme.typography.fontSize.lg },
  content: { padding: theme.spacing.base, gap: theme.spacing.md, flexGrow: 1 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  cardTitle: { flex: 1, fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.ink },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.brand },
  cardBottom: { gap: theme.spacing.sm },
  time: { fontSize: theme.typography.fontSize.xs },
});
