import type { Connection } from '@perspective/contracts';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../../../api/client';
import { selection } from '../../../lib/haptics';
import { theme } from '../../../theme';
import { MicrophoneIcon, QuotesIcon } from '../icons';
import { connectedLabel, theirOpening, type TheirOpening } from '../thread';
import { PaperSheet } from '../../../components/editorial/PaperSheet';

const e = theme.editorial;

const NOUN: Record<'photo' | 'audio' | 'text', string> = { photo: 'photo', audio: 'voice note', text: 'question' };

function noun(opening: TheirOpening): string {
  return opening.postKind ? NOUN[opening.postKind] : 'post';
}

/** Your post, small: the photo, or a paper tile marking a voice note or a written question. */
function PostThumb({ opening }: { opening: TheirOpening }) {
  if (opening.photoUrl) {
    return <Image source={{ uri: api.mediaUrl(opening.photoUrl) }} style={s.thumb} accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={[s.thumb, s.tile]}>
      {opening.postKind === 'audio' ? (
        <MicrophoneIcon size={24} color={e.colors.ink} />
      ) : (
        <QuotesIcon size={24} weight="fill" color={e.colors.ink} />
      )}
    </View>
  );
}

/**
 * How the conversation started, shown the way a reply to a story is: a small
 * line saying what happened, your post as a thumbnail, and their words as the
 * first bubble from their side. You only ever see what they said to you; what
 * you said to them is theirs to see.
 */
export function Prologue({ connection }: { connection: Pick<Connection, 'origin' | 'reply' | 'partner' | 'connectedAt'> }) {
  const opening = theirOpening(connection);
  const name = connection.partner.displayName;
  const [open, setOpen] = useState(false);
  const show = () => {
    selection();
    setOpen(true);
  };

  return (
    <View style={s.wrap}>
      {opening ? (
        <Pressable
          onPress={show}
          accessibilityRole="button"
          accessibilityLabel={`${name} gave you a perspective on your ${noun(opening)}: ${opening.comment}`}
          accessibilityHint="Shows your post and the question it answered."
          style={({ pressed }) => [s.story, pressed && s.pressed]}
        >
          <Text style={s.label}>
            <Text style={s.labelStrong}>{name}</Text> gave you a perspective · on your {noun(opening)}
          </Text>
          <PostThumb opening={opening} />
          <View style={s.bubble}>
            <Text style={s.words}>{opening.comment}</Text>
          </View>
        </Pressable>
      ) : null}

      <View style={s.rule} accessible accessibilityLabel={connectedLabel(connection.connectedAt)}>
        <View style={s.hair} />
        <Text style={s.ruleText}>{connectedLabel(connection.connectedAt)}</Text>
        <View style={s.hair} />
      </View>

      {opening ? (
        <PaperSheet visible={open} onClose={() => setOpen(false)}>
          <View style={s.detail}>
            {opening.photoUrl ? (
              <Image source={{ uri: api.mediaUrl(opening.photoUrl) }} style={s.photo} accessibilityIgnoresInvertColors />
            ) : null}
            <Text style={s.prompt}>Your {noun(opening)} asked: “{opening.prompt}”</Text>
            <Text style={s.detailQuote}>“{opening.comment}”</Text>
            <Text style={s.byline}>{name}’s perspective</Text>
          </View>
        </PaperSheet>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xs },
  story: { alignItems: 'flex-start', gap: theme.spacing.sm, maxWidth: '86%' },
  pressed: { opacity: theme.opacity.pressed },
  label: { fontFamily: e.fonts.body, fontSize: 12, lineHeight: 16, color: e.colors.muted, marginLeft: 4 },
  labelStrong: { fontFamily: e.fonts.bodySemibold, color: e.colors.ink },
  thumb: {
    width: 76,
    height: 95,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: e.colors.line,
    backgroundColor: e.colors.line,
    marginLeft: 4,
  },
  tile: { backgroundColor: e.colors.surface, alignItems: 'center', justifyContent: 'center' },
  bubble: {
    backgroundColor: e.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: e.colors.line,
    borderRadius: 20,
    borderTopLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  words: { fontFamily: e.fonts.bodyMedium, fontSize: 17, lineHeight: 24, color: e.colors.ink },
  rule: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.lg },
  hair: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: e.colors.line },
  ruleText: { fontFamily: e.fonts.bodyMedium, fontSize: 12, color: e.colors.muted },
  detail: { alignItems: 'center', gap: theme.spacing.md, paddingBottom: theme.spacing.sm },
  photo: { width: 200, aspectRatio: 4 / 5, borderRadius: 20, backgroundColor: e.colors.line, marginBottom: theme.spacing.xs },
  prompt: { fontFamily: e.fonts.bodyMedium, fontSize: 15, lineHeight: 21, color: e.colors.muted, textAlign: 'center' },
  detailQuote: { fontFamily: e.fonts.bodyMedium, fontSize: 19, lineHeight: 27, color: e.colors.ink, textAlign: 'center' },
  byline: { fontFamily: e.fonts.body, fontSize: 13, color: e.colors.muted },
});
