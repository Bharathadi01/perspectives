import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SafetyMenu } from '../../src/components/SafetyMenu';
import { useToast } from '../../src/components/ui/Toast';
import { ChatHeader, QuietNotice, StartIdeas } from '../../src/features/connections/components/ChatParts';
import { Composer, type ComposerHandle } from '../../src/features/connections/components/Composer';
import { DayDivider, MessageBubble } from '../../src/features/connections/components/MessageBubble';
import { PaperSheet, SheetAction } from '../../src/components/editorial/PaperSheet';
import { PaperLoading, PaperState } from '../../src/components/editorial/PaperState';
import { Prologue } from '../../src/features/connections/components/Prologue';
import { ChatsCircleIcon, FlagIcon, TrashIcon, WarningCircleIcon } from '../../src/features/connections/icons';
import { ideaCount, ideasForRound } from '../../src/features/connections/ideas';
import { buildThread, type ThreadItem } from '../../src/features/connections/thread';
import { useSendQueue } from '../../src/features/connections/useSendQueue';
import { useConnections, useMessages, useUnmatch } from '../../src/features/hooks';
import { errorCode, errorMessage } from '../../src/lib/errors';
import { selection, warn } from '../../src/lib/haptics';
import { timeUntil } from '../../src/lib/labels';
import { theme } from '../../src/theme';

const e = theme.editorial;

/** Shown when a quiet connection closed on its own, or the conversation is otherwise gone. */
function ClosedConversation() {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.screen}>
      <PaperState
        icon={<ChatsCircleIcon size={32} color={e.colors.ink} />}
        title="This connection closed"
        body="Conversations stay open when both people reply. You can still connect again from their profile."
        action="Back to connections"
        onAction={() => router.replace('/(tabs)/connections')}
      />
    </SafeAreaView>
  );
}

export default function Chat() {
  const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
  const connectionId = id ?? '';
  const connections = useConnections();
  const messages = useMessages(connectionId);
  const unmatch = useUnmatch();
  const toast = useToast();
  const [closed, setClosed] = useState(false);
  const queue = useSendQueue(connectionId, () => setClosed(true));
  const [sheet, setSheet] = useState<'none' | 'menu' | 'confirm'>('none');
  const [safety, setSafety] = useState(false);
  const safetyNext = useRef(false);
  const composer = useRef<ComposerHandle>(null);
  const [ideaRound, setIdeaRound] = useState(0);
  const [ideasHidden, setIdeasHidden] = useState(false);

  const connection = connections.data?.find((c) => c.id === connectionId);
  const partnerId = connection?.partner.id ?? '';

  // Newest first, for the inverted list: it opens at the latest message and stays there as the keyboard moves.
  const items = useMemo(
    () => buildThread(messages.data ?? [], queue.pending, partnerId, new Date(), connection?.connectedAt).reverse(),
    [messages.data, queue.pending, partnerId, connection?.connectedAt],
  );

  if (connections.isLoading || messages.isLoading) return <PaperLoading />;
  const goneQuiet = closed || errorCode(messages.error) === 'CONNECTION_CLOSED';
  if (goneQuiet || (!connection && connections.isSuccess && !messages.isError)) return <ClosedConversation />;
  if (!connection || messages.isError) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={s.screen}>
        <PaperState
          icon={<WarningCircleIcon size={30} color={e.colors.ink} />}
          title="Couldn’t open this conversation"
          body={errorMessage(messages.error ?? connections.error)}
          action="Try again"
          onAction={() => {
            void connections.refetch();
            void messages.refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  const partner = connection.partner;
  const empty = items.length === 0;
  // The person who asked to connect wrote the first perspective; ideas differ for them and the post's owner.
  const role = connection.origin.fromUserId === partner.id ? 'owner' : 'giver';
  const category = connection.origin.postCategory;
  const ideas = empty && !ideasHidden ? ideasForRound(category, role, connection.id, ideaRound) : [];
  const { expiry } = connection;
  const notice =
    expiry.state === 'you_owe_reply' && expiry.closesAt
      ? `${partner.displayName} is waiting. This connection closes ${timeUntil(expiry.closesAt)} if you don’t reply.`
      : expiry.state === 'remind' && expiry.closesAt
        ? `Nobody has said hi yet. This connection closes ${timeUntil(expiry.closesAt)} if nobody writes.`
        : null;
  const openProfile = () => router.push({ pathname: '/profile/[id]', params: { id: partner.id } });

  const doUnmatch = async () => {
    try {
      await unmatch.run(connectionId);
      setSheet('none');
      toast(`You unmatched ${partner.displayName}.`, 'info');
      router.back();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const renderItem = ({ item }: { item: ThreadItem }) =>
    item.type === 'day' ? (
      <DayDivider label={item.label} />
    ) : (
      <MessageBubble item={item} partnerName={partner.displayName} onRetry={queue.retry} />
    );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.screen}>
      <ChatHeader
        partner={partner}
        subtitle="View profile"
        onBack={() => router.back()}
        onOpenProfile={openProfile}
        onMenu={() => setSheet('menu')}
      />
      {notice ? <QuietNotice text={notice} /> : null}

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          inverted
          data={items}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          // Inverted, so this sits at the top: the two perspectives the conversation grew from.
          ListFooterComponent={<Prologue connection={connection} />}
          ListHeaderComponent={
            expiry.state === 'waiting' && !empty ? <Text style={s.waiting}>Waiting for {partner.displayName} to reply.</Text> : undefined
          }
          // Keeps a short thread at the top of the screen under the prologue, not stuck to the composer.
          contentContainerStyle={s.list}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />
        <StartIdeas
          ideas={ideas}
          onPick={(line) => {
            selection();
            composer.current?.fill(line);
          }}
          onShuffle={
            ideaCount(category, role) > ideas.length
              ? () => {
                  selection();
                  setIdeaRound((r) => r + 1);
                }
              : undefined
          }
          onHide={() => setIdeasHidden(true)}
        />
        <Composer
          ref={composer}
          placeholder={empty ? `Say hi to ${partner.displayName}` : 'Write a message'}
          autoFocus={focus === '1'}
          onSend={queue.send}
        />
      </KeyboardAvoidingView>

      <PaperSheet
        visible={sheet !== 'none'}
        onClose={() => setSheet('none')}
        onDismiss={() => {
          if (safetyNext.current) {
            safetyNext.current = false;
            setSafety(true);
          }
        }}
        title={sheet === 'confirm' ? `Unmatch ${partner.displayName}?` : partner.displayName}
        subtitle={sheet === 'confirm' ? 'The conversation closes for both of you.' : undefined}
      >
        {sheet === 'confirm' ? (
          <>
            <SheetAction label="Unmatch" tone="danger" disabled={unmatch.isPending} onPress={() => void doUnmatch()} />
            <SheetAction label="Keep talking" onPress={() => setSheet('none')} />
          </>
        ) : (
          <>
            <SheetAction
              label="Report or block"
              icon={<FlagIcon size={20} color={e.colors.ink} />}
              onPress={() => {
                setSheet('none');
                // iOS cannot present the next sheet until this one has gone.
                if (Platform.OS === 'ios') safetyNext.current = true;
                else setSafety(true);
              }}
            />
            <SheetAction
              label="Unmatch"
              icon={<TrashIcon size={20} color={e.colors.ink} />}
              onPress={() => {
                warn();
                setSheet('confirm');
              }}
            />
          </>
        )}
      </PaperSheet>

      <SafetyMenu
        visible={safety}
        onClose={() => setSafety(false)}
        target={{ type: 'profile', id: partner.id, label: partner.displayName }}
        userId={partner.id}
        onDone={() => router.back()}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: e.colors.paper },
  flex: { flex: 1 },
  list: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: theme.spacing.base, paddingBottom: theme.spacing.md },
  waiting: {
    alignSelf: 'flex-end',
    fontFamily: e.fonts.body,
    fontSize: 12,
    color: e.colors.muted,
    marginTop: theme.spacing.sm,
    marginRight: 6,
  },
});
