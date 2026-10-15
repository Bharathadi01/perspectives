import Ionicons from '@expo/vector-icons/Ionicons';
import { RULES, chipsFor, sparkHintsFor } from '@perspective/contracts';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { PostCard } from '../../src/components/profile/PostCard';
import { Button } from '../../src/components/ui/Button';
import { Chip } from '../../src/components/ui/Chip';
import { Screen } from '../../src/components/ui/Screen';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { Label, Muted, Title } from '../../src/components/ui/Text';
import { TextField } from '../../src/components/ui/TextField';
import { useToast } from '../../src/components/ui/Toast';
import { useGivePerspective, useProfileView } from '../../src/features/hooks';
import { errorMessage } from '../../src/lib/errors';
import { theme } from '../../src/theme';

const CONNECT_NOT_SENT: Record<string, string> = {
  CONNECT_COOLDOWN_ACTIVE: 'Perspective sent. You can ask to connect again later.',
  CONNECT_REQUEST_PENDING: 'Perspective sent. A connect request is already waiting.',
  ALREADY_CONNECTED: 'Perspective sent. You’re already connected.',
  CAP_REACHED: 'Perspective sent. You’ve reached today’s connect limit.',
};

/** Give a perspective on one post: a required honest comment, optional chips, optional Connect. */
export default function GivePerspective() {
  const { postId, profileId } = useLocalSearchParams<{ postId: string; profileId: string }>();
  const view = useProfileView(profileId ?? '');
  const give = useGivePerspective();
  const toast = useToast();
  const input = useRef<TextInput>(null);
  const [comment, setComment] = useState('');
  const [chips, setChips] = useState<string[]>([]);
  const [connect, setConnect] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  if (view.isLoading) return <LoadingState />;
  if (view.isError || !view.data) return <ErrorState error={view.error} onRetry={() => void view.refetch()} />;
  const post = view.data.profile.posts.find((p) => p.id === postId);
  if (!post) return <ErrorState error={new Error('missing post')} onRetry={() => router.back()} />;

  const name = view.data.profile.displayName;
  const rel = view.data.relationship;
  const canTickConnect = rel.connectionId === null && !rel.outgoingRequestPending && rel.incomingRequestId === null;
  const hints = sparkHintsFor(post.category, post.focusAreas);
  const length = comment.trim().length;
  const ready = length >= RULES.commentMinLength && length <= RULES.commentMaxLength;

  const toggleChip = (c: string) =>
    setChips((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : cur.length < RULES.maxChips ? [...cur, c] : cur));

  const submit = async () => {
    try {
      const result = await give.run({ postId: post.id, comment: comment.trim(), chips, connect: connect && canTickConnect });
      if (result.connect?.status === 'sent') toast(`Perspective sent, and you asked ${name} to connect.`, 'success');
      else if (result.connect?.status === 'not_sent') toast(CONNECT_NOT_SENT[result.connect.code] ?? 'Perspective sent.', 'info');
      else toast(result.daily.unlocked ? 'Perspective sent. Your inbox is unlocked!' : 'Perspective sent.', 'success');
      router.back();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <Screen edges={['top', 'bottom']} surface="background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" style={s.close}>
            <Ionicons name="close" size={26} color={theme.colors.ink} />
          </Pressable>
          <Title style={s.headerTitle}>Give perspective</Title>
          <View style={s.close} />
        </View>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.preview}>
            <PostCard post={post} />
          </View>

          <View style={s.group}>
            <Label>Need a spark?</Label>
            <View style={s.hints}>
              {hints.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => {
                    setHint(h);
                    input.current?.focus();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Use hint: ${h}`}
                  style={[s.hint, hint === h && s.hintOn]}
                >
                  <Ionicons name="sparkles-outline" size={14} color={theme.colors.brand} />
                  <Text style={s.hintText}>{h}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <TextField
            ref={input}
            label={`Your honest perspective for ${name}`}
            value={comment}
            onChangeText={setComment}
            multiline
            placeholder={hint ?? 'Be specific and honest. Criticism is welcome; insults and body shaming are not.'}
            maxLength={RULES.commentMaxLength}
            counter={{ min: RULES.commentMinLength, max: RULES.commentMaxLength }}
          />

          <View style={s.group}>
            <Label>Quick picks (optional, up to {RULES.maxChips})</Label>
            <View style={s.chips}>
              {chipsFor(post.category).map((c) => (
                <Chip
                  key={c}
                  label={c}
                  selected={chips.includes(c)}
                  disabled={!chips.includes(c) && chips.length >= RULES.maxChips}
                  onPress={() => toggleChip(c)}
                />
              ))}
            </View>
          </View>

          {canTickConnect ? (
            <View style={s.connect}>
              <View style={s.flex}>
                <Text style={s.connectTitle}>Also ask {name} to connect</Text>
                <Muted>They’ll see your perspective and can accept or decline. Chat opens only if they accept.</Muted>
              </View>
              <Switch
                value={connect}
                onValueChange={setConnect}
                accessibilityLabel={`Also ask ${name} to connect`}
                trackColor={{ true: theme.colors.brand, false: theme.colors.border }}
              />
            </View>
          ) : null}

          <Muted>Only {name} will see this. Perspectives are subjective: say how it came across to you.</Muted>
          <Button title="Send perspective" onPress={() => void submit()} disabled={!ready} loading={give.isPending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.sm },
  headerTitle: { fontSize: theme.typography.fontSize.lg },
  close: { width: theme.touchTarget.min, height: theme.touchTarget.min, alignItems: 'center', justifyContent: 'center' },
  content: { padding: theme.spacing.base, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  preview: { maxWidth: 320, alignSelf: 'center', width: '75%' },
  group: { gap: theme.spacing.sm },
  hints: { gap: theme.spacing.sm },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.control,
    paddingHorizontal: theme.spacing.md,
    minHeight: theme.touchTarget.min - 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  hintOn: { borderColor: theme.colors.brand, backgroundColor: theme.colors.brandSoft },
  hintText: { flex: 1, color: theme.colors.ink, fontSize: theme.typography.fontSize.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  connect: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: theme.radius.control, padding: theme.spacing.base },
  connectTitle: { fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.ink },
});
