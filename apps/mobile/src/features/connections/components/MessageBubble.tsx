import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme';
import { WarningCircleIcon } from '../icons';
import { clockTime, type ThreadItem } from '../thread';

const e = theme.editorial;
const R = 20;
const JOIN = 6;

type MessageItem = Extract<ThreadItem, { type: 'message' }>;

/**
 * One message. Bursts from the same person sit close together with tightened
 * inner corners and a single time under the last one. Yours are ink, theirs
 * are paper-white. Long-press the text to copy it (the system menu).
 */
export function MessageBubble({
  item,
  partnerName,
  onRetry,
}: {
  item: MessageItem;
  partnerName: string;
  onRetry: (localId: string) => void;
}) {
  const { mine, first, last, status } = item;
  const corners = mine
    ? { borderTopRightRadius: first ? R : JOIN, borderBottomRightRadius: JOIN }
    : { borderTopLeftRadius: first ? R : JOIN, borderBottomLeftRadius: JOIN };
  const time = clockTime(item.createdAt);

  return (
    <View style={[s.row, mine ? s.right : s.left, first && s.runStart]}>
      <View
        style={[
          s.bubble,
          mine ? s.mine : s.theirs,
          corners,
          status === 'sending' && s.sending,
          status === 'failed' && s.failed,
        ]}
        accessible
        accessibilityLabel={`${mine ? 'You' : partnerName}${status === 'sent' ? `, ${time}` : ''}: ${item.text}${
          status === 'sending' ? '. Sending.' : status === 'failed' ? '. Not sent.' : ''
        }`}
      >
        <Text selectable style={[s.text, mine && status !== 'failed' && s.textMine]}>
          {item.text}
        </Text>
      </View>

      {status === 'sending' ? <Text style={[s.meta, s.metaRight]}>Sending…</Text> : null}
      {status === 'failed' && item.localId ? (
        <View style={s.failedRow}>
          <WarningCircleIcon size={15} color={e.colors.accent} weight="bold" />
          <Text style={s.failedText}>Not sent</Text>
          <Pressable
            onPress={() => onRetry(item.localId as string)}
            accessibilityRole="button"
            accessibilityLabel="Retry sending"
            hitSlop={12}
            style={({ pressed }) => [s.retry, pressed && s.pressed]}
          >
            <Text style={s.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {status === 'sent' && last ? <Text style={[s.meta, mine && s.metaRight]}>{time}</Text> : null}
    </View>
  );
}

/** "Today", "Yesterday"… between messages from different days. */
export function DayDivider({ label }: { label: string }) {
  return (
    <View style={s.day} accessibilityRole="header">
      <Text style={s.dayText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { marginTop: 2, maxWidth: '100%' },
  runStart: { marginTop: theme.spacing.md - 2 },
  left: { alignItems: 'flex-start' },
  right: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '80%',
    borderRadius: R,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  mine: { backgroundColor: e.colors.ink },
  theirs: { backgroundColor: e.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: e.colors.line },
  sending: { opacity: 0.55 },
  failed: { backgroundColor: e.colors.surface, borderWidth: 1.5, borderColor: e.colors.accent },
  text: { fontFamily: e.fonts.body, fontSize: 16, lineHeight: 22, color: e.colors.ink },
  textMine: { color: e.colors.onInk },
  meta: { fontFamily: e.fonts.body, fontSize: 11, color: e.colors.muted, marginTop: 4, marginHorizontal: 6 },
  metaRight: { textAlign: 'right' },
  failedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginRight: 4 },
  failedText: { fontFamily: e.fonts.bodySemibold, fontSize: 12, color: e.colors.accent },
  retry: { minHeight: 28, justifyContent: 'center', paddingHorizontal: 4 },
  retryText: { fontFamily: e.fonts.bodySemibold, fontSize: 13, color: e.colors.ink, textDecorationLine: 'underline' },
  pressed: { opacity: theme.opacity.pressed },
  day: {
    alignSelf: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(36,29,21,0.05)',
  },
  dayText: { fontFamily: e.fonts.bodyMedium, fontSize: 12, color: e.colors.muted },
});
