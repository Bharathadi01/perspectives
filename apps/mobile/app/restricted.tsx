import Ionicons from '@expo/vector-icons/Ionicons';
import { ApiError } from '@perspective/api-client';
import { APPEAL_MAX_LENGTH, APPEAL_MIN_LENGTH, Restriction } from '@perspective/contracts';
import { Redirect, router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DeleteAccountSheet } from '../src/components/DeleteAccountSheet';
import { Button } from '../src/components/ui/Button';
import { Screen } from '../src/components/ui/Screen';
import { ErrorState, LoadingState } from '../src/components/ui/States';
import { Label, Muted, Title } from '../src/components/ui/Text';
import { TextField } from '../src/components/ui/TextField';
import { useToast } from '../src/components/ui/Toast';
import { useAppeal, useLogOut, useRestriction } from '../src/features/hooks';
import { errorMessage } from '../src/lib/errors';
import { theme } from '../src/theme';

/**
 * The only screen a suspended or banned person can reach (decided 2026-10-20): why, until when, and
 * one appeal per ban. Their profile is hidden and chats are paused. They can still delete the account.
 */
export default function Restricted() {
  const restriction = useRestriction();
  const logOut = useLogOut();
  const [deleting, setDeleting] = useState(false);

  if (restriction.isLoading) return <LoadingState />;
  // The ban was lifted (or ended): back into the app.
  if (restriction.error instanceof ApiError && restriction.error.code === 'NOT_FOUND') return <Redirect href="/" />;
  if (restriction.isError || !restriction.data) {
    return <ErrorState error={restriction.error} onRetry={() => void restriction.refetch()} />;
  }
  const r = restriction.data;

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.icon}>
          <Ionicons name="shield-outline" size={32} color={theme.colors.brand} />
        </View>
        <Title accessibilityRole="header">{r.status === 'banned' ? 'Your account is banned' : 'Your account is suspended'}</Title>
        <Muted>
          {r.endsAt ? `Until ${formatDate(r.endsAt)}.` : 'This ban is permanent.'} While it lasts, your profile is hidden and your chats are paused.
        </Muted>

        <View style={s.card}>
          <Label>Reason</Label>
          <Text style={s.reason}>{r.reason}</Text>
        </View>

        <AppealSection restriction={r} />

        <View style={s.actions}>
          <Button title="Sign out" variant="secondary" onPress={() => void logOut.run(undefined).then(() => router.replace('/(auth)/welcome'))} />
          <Button title="Delete account" variant="ghost" onPress={() => setDeleting(true)} />
        </View>
      </ScrollView>
      <DeleteAccountSheet visible={deleting} onClose={() => setDeleting(false)} />
    </Screen>
  );
}

function AppealSection({ restriction: r }: { restriction: Restriction }) {
  const appeal = useAppeal();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const valid = message.trim().length >= APPEAL_MIN_LENGTH;

  if (r.appeal?.status === 'open') {
    return (
      <View style={s.card}>
        <Label>Your appeal</Label>
        <Muted>We’re looking at it again. You’ll see the answer here.</Muted>
        <Text style={s.quote}>“{r.appeal.message}”</Text>
      </View>
    );
  }
  if (r.appeal?.status === 'upheld') {
    return (
      <View style={s.card}>
        <Label>Your appeal was reviewed</Label>
        <Muted>The decision stays. This decision can’t be appealed again.</Muted>
        {r.appeal.decisionReason ? <Text style={s.reason}>{r.appeal.decisionReason}</Text> : null}
      </View>
    );
  }
  if (!r.canAppeal) return null;

  const send = async () => {
    try {
      await appeal.run(message.trim());
      setMessage('');
      toast('Appeal sent.', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <View style={s.card}>
      <Label>This was a mistake</Label>
      <Muted>Tell us why. You can appeal this decision once.</Muted>
      <TextField
        label="Your appeal"
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={APPEAL_MAX_LENGTH}
        counter={{ min: APPEAL_MIN_LENGTH, max: APPEAL_MAX_LENGTH }}
      />
      <Button title="Send appeal" onPress={() => void send()} disabled={!valid} loading={appeal.isPending} />
    </View>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
}

const s = StyleSheet.create({
  content: { padding: theme.spacing.lg, gap: theme.spacing.base, paddingBottom: theme.spacing.xxl },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  reason: { fontSize: theme.typography.fontSize.base, color: theme.colors.ink },
  quote: { fontSize: theme.typography.fontSize.sm, color: theme.colors.muted, fontStyle: 'italic' },
  actions: { gap: theme.spacing.sm, marginTop: theme.spacing.lg },
});
