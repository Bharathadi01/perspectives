import type { Connection } from '@perspective/contracts';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme';
import { isYourTurn, listTime, previewLine } from '../thread';
import { PaperAvatar, PartnerName } from '../../../components/editorial/Person';

const e = theme.editorial;

/** The one status worth a word on the row, if any. The quiet-close warnings come first. */
function tagFor(c: Connection): { label: string; urgent: boolean } | null {
  if (c.expiry.state === 'you_owe_reply') return { label: 'Reply soon', urgent: true };
  if (c.expiry.state === 'remind') return { label: 'Say hi', urgent: true };
  if (c.isNew) return { label: 'New', urgent: false };
  return null;
}

/**
 * One conversation: photo, name, the last line and its time. When the next
 * message is yours the row says so quietly: the name's line goes ink, the time
 * turns clay and a clay dot sits under it.
 */
export function ConversationRow({ connection, onPress, last }: { connection: Connection; onPress: () => void; last: boolean }) {
  const yours = isYourTurn(connection);
  const fresh = !connection.lastMessage;
  const tag = tagFor(connection);
  const when = listTime(connection.lastMessage?.createdAt ?? connection.connectedAt);
  const preview = previewLine(connection);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${connection.partner.displayName}${yours ? ', your turn' : ''}${tag ? `, ${tag.label}` : ''}. ${preview}. ${when}`}
      style={({ pressed }) => [s.row, pressed && s.pressed]}
    >
      <PaperAvatar person={connection.partner} size={56} />
      <View style={[s.body, !last && s.rule]}>
        <View style={s.top}>
          <PartnerName person={connection.partner} />
          <Text style={[s.time, yours && s.timeYours]}>{when}</Text>
        </View>
        <View style={s.bottom}>
          <Text style={[s.preview, yours && !fresh && s.previewYours, fresh && s.previewFresh]} numberOfLines={1}>
            {preview}
          </Text>
          {tag ? (
            <Text style={[s.tag, tag.urgent && s.tagUrgent]}>{tag.label}</Text>
          ) : yours ? (
            <View style={s.dot} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: theme.spacing.lg - 4 },
  pressed: { backgroundColor: 'rgba(36,29,21,0.04)' },
  body: { flex: 1, minHeight: 82, justifyContent: 'center', gap: 4, paddingRight: theme.spacing.lg - 4 },
  rule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: e.colors.line },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  time: { fontFamily: e.fonts.body, fontSize: 12.5, color: e.colors.muted },
  timeYours: { fontFamily: e.fonts.bodySemibold, color: e.colors.accent },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  preview: { flex: 1, fontFamily: e.fonts.body, fontSize: 14.5, lineHeight: 20, color: e.colors.muted },
  previewYours: { fontFamily: e.fonts.bodyMedium, color: e.colors.ink },
  previewFresh: { fontFamily: e.fonts.bodyMedium, color: e.colors.ink },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: e.colors.accent },
  tag: {
    fontFamily: e.fonts.bodySemibold,
    fontSize: 11,
    color: e.colors.ink,
    borderWidth: 1,
    borderColor: e.colors.line,
    backgroundColor: e.colors.surface,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  tagUrgent: { color: e.colors.accent },
});
