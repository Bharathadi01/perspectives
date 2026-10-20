import { AdminQueueItem } from '@perspective/contracts';
import { useQuery } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adminApi, session } from '../src/api';
import { QUEUE_REASON } from '../src/labels';
import { Badge, Body, Button, Card, ErrorText, H1, Loading, Muted, Page, formatWhen, t } from '../src/ui';

const TONE: Record<AdminQueueItem['reason'], 'danger' | 'brand' | 'warning' | 'muted'> = {
  serious_report: 'danger',
  appeal: 'brand',
  reporters: 'warning',
  weak_giver: 'muted',
};

/** Everyone on hold or flagged, and open appeals: serious reports first, then appeals, then the rest. */
export default function Queue() {
  const signedIn = session.get();
  const queue = useQuery({ queryKey: ['queue'], queryFn: () => adminApi.queue(), enabled: !!signedIn, refetchInterval: 30_000 });
  if (!signedIn) return <Redirect href="/login" />;

  return (
    <ScrollView>
      <Page>
        <View style={s.top}>
          <View>
            <H1>Review list</H1>
            <Muted>Signed in as {signedIn.email}</Muted>
          </View>
          <Button
            title="Sign out"
            variant="outline"
            tone="muted"
            onPress={() => {
              session.set(null);
              router.replace('/login');
            }}
          />
        </View>
        {queue.isLoading ? <Loading /> : null}
        <ErrorText>{queue.error ? (queue.error as Error).message : null}</ErrorText>
        {queue.data && queue.data.length === 0 ? (
          <Card>
            <Body>Nothing is waiting for a decision.</Body>
          </Card>
        ) : null}
        {queue.data?.map((item) => (
          <Pressable
            key={`${item.userId}-${item.reason}`}
            accessibilityRole="link"
            onPress={() => router.push({ pathname: '/person/[userId]', params: { userId: item.userId } })}
          >
            <Card style={s.row}>
              <Badge label={QUEUE_REASON[item.reason]} tone={TONE[item.reason]} />
              <Text style={s.name}>{item.displayName}</Text>
              <Muted>
                {item.status !== 'active' ? `${item.status} · ` : ''}
                {item.hidden ? 'hidden from new people · ' : ''}
                {item.distinctReporters} reporter{item.distinctReporters === 1 ? '' : 's'} · since {formatWhen(item.since)}
              </Muted>
            </Card>
          </Pressable>
        ))}
      </Page>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: t.spacing.base },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md, flexWrap: 'wrap' },
  name: { fontSize: t.typography.fontSize.base, fontWeight: t.typography.fontWeight.semibold, color: t.colors.ink },
});
