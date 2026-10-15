import Ionicons from '@expo/vector-icons/Ionicons';
import { RULES } from '@perspective/contracts';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from '../../src/components/profile/Avatar';
import { SafetyMenu } from '../../src/components/SafetyMenu';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { Sheet } from '../../src/components/ui/Sheet';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { Label } from '../../src/components/ui/Text';
import { useToast } from '../../src/components/ui/Toast';
import { useConnections, useMessages, useSendMessage, useUnmatch } from '../../src/features/hooks';
import { errorMessage } from '../../src/lib/errors';
import { theme } from '../../src/theme';

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const connectionId = id ?? '';
  const connections = useConnections();
  const messages = useMessages(connectionId);
  const send = useSendMessage(connectionId);
  const unmatch = useUnmatch();
  const toast = useToast();
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [safety, setSafety] = useState(false);
  const list = useRef<FlatList>(null);

  const connection = connections.data?.find((c) => c.id === connectionId);
  if (connections.isLoading || messages.isLoading) return <LoadingState />;
  if (!connection || messages.isError) {
    return <ErrorState error={messages.error} onRetry={() => router.back()} />;
  }
  const partner = connection.partner;

  const submit = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    try {
      await send.run(body);
    } catch (err) {
      setText(body);
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={s.icon}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.ink} />
        </Pressable>
        <Pressable
          style={s.who}
          onPress={() => router.push({ pathname: '/profile/[id]', params: { id: partner.id } })}
          accessibilityRole="button"
          accessibilityLabel={`Open ${partner.displayName}'s profile`}
        >
          <Avatar name={partner.displayName} url={partner.primaryPhotoUrl} size={32} />
          <Text style={s.name}>{partner.displayName}</Text>
        </Pressable>
        <Pressable onPress={() => setMenu(true)} accessibilityRole="button" accessibilityLabel="Conversation options" style={s.icon}>
          <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.ink} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={list}
          data={messages.data ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={s.list}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            <View style={s.origin}>
              <Label>How you connected</Label>
              <Text style={s.originPrompt}>On “{connection.origin.postPrompt}”</Text>
              <Text style={s.originComment}>“{connection.origin.comment}”</Text>
            </View>
          }
          renderItem={({ item }) => {
            const mine = item.senderId !== partner.id;
            return (
              <View style={[s.bubble, mine ? s.mine : s.theirs]}>
                <Text style={[s.text, mine && s.textMine]}>{item.text}</Text>
              </View>
            );
          }}
        />
        <View style={s.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write a message"
            placeholderTextColor={theme.colors.muted}
            accessibilityLabel="Message"
            maxLength={RULES.messageMaxLength}
            multiline
            style={s.input}
          />
          <Pressable
            onPress={() => void submit()}
            disabled={!text.trim() || send.isPending}
            accessibilityRole="button"
            accessibilityLabel="Send"
            style={[s.send, (!text.trim() || send.isPending) && s.sendOff]}
          >
            <Ionicons name="arrow-up" size={22} color={theme.colors.onDark} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Sheet visible={menu} onClose={() => setMenu(false)} title={partner.displayName}>
        <Button
          title="Unmatch"
          variant="secondary"
          onPress={() =>
            void unmatch
              .run(connectionId)
              .then(() => {
                setMenu(false);
                toast('Unmatched.', 'info');
                router.back();
              })
              .catch((err: unknown) => toast(errorMessage(err), 'error'))
          }
        />
        <Button
          title="Report or block"
          variant="danger"
          onPress={() => {
            setMenu(false);
            setSafety(true);
          }}
        />
      </Sheet>
      <SafetyMenu
        visible={safety}
        onClose={() => setSafety(false)}
        target={{ type: 'profile', id: partner.id, label: partner.displayName }}
        userId={partner.id}
        onDone={() => router.back()}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  icon: { width: theme.touchTarget.min, height: theme.touchTarget.min, alignItems: 'center', justifyContent: 'center' },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: theme.touchTarget.min },
  name: { fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.ink },
  list: { padding: theme.spacing.base, gap: theme.spacing.sm },
  origin: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.media, padding: theme.spacing.base, gap: theme.spacing.xs, marginBottom: theme.spacing.md },
  originPrompt: { fontSize: theme.typography.fontSize.sm, color: theme.colors.muted },
  originComment: { fontSize: theme.typography.fontSize.base, color: theme.colors.ink, fontStyle: 'italic' },
  bubble: { maxWidth: '80%', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 2, borderRadius: 18 },
  mine: { alignSelf: 'flex-end', backgroundColor: theme.colors.ink, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: theme.colors.surface, borderBottomLeftRadius: 4 },
  text: { fontSize: theme.typography.fontSize.base, color: theme.colors.ink },
  textMine: { color: theme.colors.onDark },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm, padding: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface },
  input: {
    flex: 1,
    minHeight: theme.touchTarget.min,
    maxHeight: 120,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.ink,
  },
  send: { width: theme.touchTarget.min, height: theme.touchTarget.min, borderRadius: theme.touchTarget.min / 2, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.4 },
});
