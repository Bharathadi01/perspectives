import { ApiError } from '@perspective/api-client';
import { ADMIN_REASON_MIN, AdminAction, AdminCase } from '@perspective/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adminApi, session } from '../../src/api';
import { ACTION_LABEL, REPORT_REASON } from '../../src/labels';
import { Badge, Body, Button, Card, ErrorText, Field, H1, H2, Loading, Muted, Page, formatWhen, t } from '../../src/ui';

/**
 * One person's case: what they were reported for (with the content), their giving quality, bans and
 * appeals, and the actions. Every action needs a reason; ban reasons are shown to the person.
 */
export default function Person() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const signedIn = session.get();
  const qc = useQueryClient();
  const person = useQuery({ queryKey: ['person', userId], queryFn: () => adminApi.person(userId), enabled: !!signedIn && !!userId });
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const onDone = (c: AdminCase) => {
    qc.setQueryData(['person', userId], c);
    void qc.invalidateQueries({ queryKey: ['queue'] });
    setReason('');
    setError('');
  };
  const onFail = (err: unknown) => setError(err instanceof ApiError ? err.message : 'Something went wrong.');
  const act = useMutation({ mutationFn: (action: AdminAction) => adminApi.act(userId, { action, reason }), onSuccess: onDone, onError: onFail });
  const decide = useMutation({
    mutationFn: (v: { appealId: string; decision: 'uphold' | 'restore' }) => adminApi.decideAppeal(v.appealId, { decision: v.decision, reason }),
    onSuccess: onDone,
    onError: onFail,
  });

  if (!signedIn) return <Redirect href="/login" />;
  if (person.isLoading) return <Loading />;
  if (person.isError || !person.data) {
    return (
      <Page>
        <ErrorText>{person.error ? (person.error as Error).message : 'Not found.'}</ErrorText>
      </Page>
    );
  }
  const c = person.data;
  const p = c.person;
  const reasonOk = reason.trim().length >= ADMIN_REASON_MIN;
  const busy = act.isPending || decide.isPending;
  const confirmThen = (message: string, run: () => void) => {
    if (typeof window === 'undefined' || window.confirm(message)) run();
  };
  const openAppeal = c.bans.find((b) => b.appeal?.status === 'open')?.appeal ?? null;

  return (
    <ScrollView>
      <Page>
        <Pressable accessibilityRole="link" onPress={() => router.replace('/queue')}>
          <Text style={s.back}>← Review list</Text>
        </Pressable>

        <Card style={s.header}>
          {p.primaryPhotoUrl ? <Image source={{ uri: adminApi.mediaUrl(p.primaryPhotoUrl) }} style={s.photo} accessibilityLabel="Primary photo" /> : null}
          <View style={s.headerText}>
            <H1>
              {p.displayName}, {p.age}
            </H1>
            <Muted>
              {p.email} · joined {formatWhen(p.joinedAt)}
            </Muted>
            <View style={s.badges}>
              <Badge label={p.status === 'active' ? 'Active' : p.status === 'suspended' ? `Suspended until ${formatWhen(p.suspendedUntil)}` : 'Banned'} tone={p.status === 'active' ? 'success' : 'danger'} />
              {c.openCases.map((oc) => (
                <Badge key={oc.id} label={oc.hides ? `On hold: ${oc.reason === 'serious_report' ? 'serious report' : '3+ reporters'}` : 'Weak giver'} tone={oc.hides ? 'danger' : 'warning'} />
              ))}
              <Badge label={`${c.distinctReporters} reporter${c.distinctReporters === 1 ? '' : 's'} in 30 days`} />
            </View>
          </View>
        </Card>

        <Card>
          <H2>Decide</H2>
          <Muted>Every action needs a reason. For a ban, the person sees this reason. A 3-day ban and each extension last 3 days.</Muted>
          <Field label="Reason" value={reason} onChangeText={setReason} multiline maxLength={500} />
          <ErrorText>{error}</ErrorText>
          <View style={s.actions}>
            {c.openCases.length > 0 ? <Button title="Dismiss (lift hold)" tone="success" disabled={!reasonOk} loading={busy} onPress={() => act.mutate('dismiss')} /> : null}
            {p.status === 'active' ? (
              <Button title="Ban for 3 days" tone="warning" disabled={!reasonOk} loading={busy} onPress={() => confirmThen(`Ban ${p.displayName} for 3 days?`, () => act.mutate('ban_temporary'))} />
            ) : null}
            {p.status === 'suspended' ? (
              <Button title="Extend by 3 days" tone="warning" disabled={!reasonOk} loading={busy} onPress={() => confirmThen('Extend the ban by 3 days?', () => act.mutate('extend'))} />
            ) : null}
            {p.status !== 'banned' ? (
              <Button title="Ban permanently" tone="danger" disabled={!reasonOk} loading={busy} onPress={() => confirmThen(`Ban ${p.displayName} permanently? Their email can’t sign up again.`, () => act.mutate('ban_permanent'))} />
            ) : null}
            {p.status !== 'active' ? <Button title="Restore account" variant="outline" disabled={!reasonOk} loading={busy} onPress={() => act.mutate('restore')} /> : null}
          </View>
          {openAppeal ? (
            <View style={s.appeal}>
              <H2>Open appeal</H2>
              <Body>“{openAppeal.message}”</Body>
              <Muted>Sent {formatWhen(openAppeal.createdAt)}. One appeal per ban: if you keep the ban, they cannot appeal it again.</Muted>
              <View style={s.actions}>
                <Button title="Keep the ban" tone="danger" variant="outline" disabled={!reasonOk} loading={busy} onPress={() => decide.mutate({ appealId: openAppeal.id, decision: 'uphold' })} />
                <Button title="Lift the ban" tone="success" disabled={!reasonOk} loading={busy} onPress={() => decide.mutate({ appealId: openAppeal.id, decision: 'restore' })} />
              </View>
            </View>
          ) : null}
        </Card>

        <Card>
          <H2>Reports ({c.reports.length})</H2>
          {c.reports.length === 0 ? <Muted>No reports.</Muted> : null}
          {c.reports.map((r) => (
            <View key={r.id} style={s.report}>
              <View style={s.badges}>
                <Badge label={REPORT_REASON[r.reason]} tone={['nudity_sexual', 'threat_violence', 'underage', 'self_harm'].includes(r.reason) ? 'danger' : 'warning'} />
                <Badge label={`On a ${r.targetType}`} />
                {r.fromFeedback ? <Badge label="From a “not helpful” mark" /> : null}
                {r.status === 'allowed' ? <Badge label="Dismissed" tone="success" /> : null}
              </View>
              <Muted>
                {r.reporterLabel} · {formatWhen(r.createdAt)}
              </Muted>
              {r.note ? <Body>Note: {r.note}</Body> : null}
              {r.content.prompt ? <Body>Post question: “{r.content.prompt}”</Body> : null}
              {r.content.text ? <Body>“{r.content.text}”</Body> : null}
              {r.content.mediaUrl ? (
                <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(adminApi.mediaUrl(r.content.mediaUrl!))}>
                  <Text style={s.link}>Open the photo or audio (link works for 1 hour)</Text>
                </Pressable>
              ) : null}
              {r.content.missing ? <Muted>The content was deleted.</Muted> : null}
            </View>
          ))}
        </Card>

        <Card>
          <H2>Giving quality</H2>
          <Body>
            {c.quality.weak ? 'Over the weak-giver line' : 'Not a weak giver'} · {c.quality.lowEffortMarks} low-effort and {c.quality.helpfulMarks} helpful marks in the last 45 days
          </Body>
          {c.quality.weakSince ? <Muted>Over the line since {formatWhen(c.quality.weakSince)}{c.quality.flagged ? ', flagged for review' : ''}.</Muted> : null}
        </Card>

        <Card>
          <H2>Bans and appeals</H2>
          {c.bans.length === 0 ? <Muted>No bans.</Muted> : null}
          {c.bans.map((b) => (
            <View key={b.id} style={s.report}>
              <Body>
                {b.kind === 'permanent' ? 'Permanent ban' : `3-day ban until ${formatWhen(b.endsAt)}`} · {formatWhen(b.createdAt)}
                {b.liftedAt ? ` · lifted ${formatWhen(b.liftedAt)}` : ''}
              </Body>
              <Muted>Reason: {b.reason}</Muted>
              {b.appeal ? (
                <Muted>
                  Appeal ({b.appeal.status}): “{b.appeal.message}”{b.appeal.decisionReason ? ` · Decision: ${b.appeal.decisionReason}` : ''}
                </Muted>
              ) : null}
            </View>
          ))}
        </Card>

        <Card>
          <H2>History</H2>
          {c.history.length === 0 ? <Muted>No admin actions yet.</Muted> : null}
          {c.history.map((h, i) => (
            <Muted key={i}>
              {formatWhen(h.createdAt)} · {ACTION_LABEL[h.action] ?? h.action} by {h.admin}
              {h.reason ? ` · ${h.reason}` : ''}
            </Muted>
          ))}
        </Card>
      </Page>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  back: { color: t.colors.brand, fontSize: t.typography.fontSize.sm, fontWeight: t.typography.fontWeight.semibold },
  header: { flexDirection: 'row', gap: t.spacing.base, alignItems: 'flex-start', flexWrap: 'wrap' },
  headerText: { flex: 1, gap: t.spacing.xs, minWidth: 240 },
  photo: { width: 96, height: 128, borderRadius: t.radius.control, backgroundColor: t.colors.surfaceMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  appeal: { gap: t.spacing.sm, marginTop: t.spacing.base, paddingTop: t.spacing.base, borderTopWidth: 1, borderTopColor: t.colors.border },
  report: { gap: 4, paddingVertical: t.spacing.sm, borderTopWidth: 1, borderTopColor: t.colors.surfaceMuted },
  link: { color: t.colors.brand, fontSize: t.typography.fontSize.sm },
});
