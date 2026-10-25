import type { IncomingConnectRequest, PostRef, ProfileSummary, ReceivedPerspective } from '@perspective/contracts';
import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { api } from '../../api/client';
import { PaperAvatar } from '../../components/editorial/Person';
import { timeAgo } from '../../lib/labels';
import { theme } from '../../theme';
import {
  DotsThreeIcon,
  EyeSlashIcon,
  MicrophoneIcon,
  QuotesIcon,
  SealCheckIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  UserPlusIcon,
} from './icons';

const e = theme.editorial;
const KIND_NOUN: Record<PostRef['kind'], string> = { photo: 'photo', audio: 'voice note', text: 'question' };

/* ------------------------------------------------------------------ */
/* Locked: a glimpse of what is waiting (the "post to see" pattern)    */
/* ------------------------------------------------------------------ */

/**
 * What is waiting, shown as a hidden preview rather than a plain notice:
 * faceless avatars and blank lines where the words will be, so it feels like
 * something real is one step away.
 */
export function LockedPreview({ count, remaining, onGo }: { count: number; remaining: number; onGo: () => void }) {
  return (
    <View style={s.locked}>
      <View style={s.ghostRow}>
        {Array.from({ length: Math.min(count, 3) }, (_, i) => (
          <View key={i} style={[s.ghost, i > 0 && s.ghostOverlap]} />
        ))}
        <View style={s.eye}>
          <EyeSlashIcon size={18} weight="bold" color={e.colors.onInk} />
        </View>
      </View>
      <View style={s.ghostLines} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[s.ghostLine, { width: '92%' }]} />
        <View style={[s.ghostLine, { width: '74%' }]} />
        <View style={[s.ghostLine, { width: '48%' }]} />
      </View>
      <Text style={s.lockedTitle}>
        {count} {count === 1 ? 'perspective is' : 'perspectives are'} waiting
      </Text>
      <Text style={s.lockedText}>
        Give {remaining} more {remaining === 1 ? 'perspective' : 'perspectives'} today to see what people said about you.
      </Text>
      <Pressable onPress={onGo} accessibilityRole="button" style={({ pressed }) => [s.lockedPill, pressed && s.pressed]}>
        <Text style={s.lockedPillText}>Give perspectives</Text>
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Wants to connect: photo-first cards in a sideways row               */
/* ------------------------------------------------------------------ */

export const REQUEST_CARD_WIDTH = 272;

/**
 * Someone who asked to connect, photo first: their picture with name and age
 * over it, what they said about you, which of your posts it was on, and one
 * clear next step.
 */
export function RequestCard({
  request: r,
  accepting,
  onOpenPerson,
  onAccept,
  onGiveBack,
  onDecline,
}: {
  request: IncomingConnectRequest;
  accepting: boolean;
  onOpenPerson: () => void;
  onAccept: () => void;
  onGiveBack: () => void;
  onDecline: () => void;
}) {
  const name = r.sender.displayName;
  return (
    <View style={s.request}>
      <Pressable onPress={onOpenPerson} accessibilityRole="button" accessibilityLabel={`${name}, ${r.sender.age}. Open profile`}>
        <View style={s.requestPhoto}>
          {r.sender.primaryPhotoUrl ? (
            <Image source={{ uri: api.mediaUrl(r.sender.primaryPhotoUrl) }} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
          ) : (
            <View style={[StyleSheet.absoluteFill, s.requestInitialWrap]}>
              <Text style={s.requestInitial}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Svg style={s.scrim} width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={e.colors.ink} stopOpacity="0" />
                <Stop offset="1" stopColor={e.colors.ink} stopOpacity="0.72" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#scrim)" />
          </Svg>
          <View style={s.requestName}>
            <Text style={s.requestNameText} numberOfLines={1}>
              {name}, {r.sender.age}
            </Text>
            {r.sender.verified ? <SealCheckIcon size={18} weight="fill" color={e.colors.onInk} /> : null}
          </View>
        </View>
      </Pressable>

      <View style={s.requestBody}>
        <Text style={s.requestWords} numberOfLines={4}>
          {r.perspective.comment}
        </Text>
        <View style={s.onPost}>
          <PostThumb post={r.perspective.post} size={{ width: 22, height: 28, radius: 5 }} />
          <Text style={s.onPostText} numberOfLines={1}>
            On your {KIND_NOUN[r.perspective.post.kind]} · {r.perspective.post.prompt}
          </Text>
        </View>
        {r.gaveBack ? null : <Text style={s.hint}>Give {name} a perspective to connect.</Text>}
        <View style={s.requestActions}>
          <Pressable
            onPress={r.gaveBack ? onAccept : onGiveBack}
            disabled={accepting}
            accessibilityRole="button"
            accessibilityLabel={r.gaveBack ? `Connect with ${name}` : `Give ${name} a perspective`}
            style={({ pressed }) => [s.primary, pressed && s.pressed]}
          >
            {accepting ? (
              <ActivityIndicator color={e.colors.onInk} />
            ) : (
              <Text style={s.primaryText} numberOfLines={1}>
                {r.gaveBack ? 'Connect' : 'Give back'}
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={onDecline}
            disabled={accepting}
            accessibilityRole="button"
            accessibilityLabel={`Decline ${name}`}
            style={({ pressed }) => [s.decline, pressed && s.pressed]}
          >
            <Text style={s.declineText}>Decline</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* One of your posts and what people said about it: a short thread     */
/* ------------------------------------------------------------------ */

/** Your post, small: its photo, or a paper tile for a voice note or a written question. */
export function PostThumb({ post, size }: { post: PostRef; size: { width: number; height: number; radius: number } }) {
  const frame = { width: size.width, height: size.height, borderRadius: size.radius };
  if (post.kind === 'photo' && post.mediaUrl) {
    return <Image source={{ uri: api.mediaUrl(post.mediaUrl) }} style={[s.postThumb, frame]} accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={[s.postThumb, s.postTile, frame]}>
      {post.kind === 'audio' ? (
        <MicrophoneIcon size={Math.round(size.width * 0.42)} color={e.colors.ink} />
      ) : (
        <QuotesIcon size={Math.round(size.width * 0.42)} weight="fill" color={e.colors.ink} />
      )}
    </View>
  );
}

export interface ReplyHandlers {
  busyId: string | null;
  onOpenPerson: (person: ProfileSummary) => void;
  onConnect: (person: ProfileSummary) => void;
  onMore: (p: ReceivedPerspective) => void;
  onHelpful: (p: ReceivedPerspective) => void;
  onNotHelpful: (p: ReceivedPerspective) => void;
}

/**
 * One of your posts with what people said about it, set like a short thread:
 * your question large with the photo beside it, then each perspective as a
 * reply joined by a thin line, as conversation apps do.
 */
export function PostThread({ post, perspectives, handlers }: { post: PostRef; perspectives: readonly ReceivedPerspective[]; handlers: ReplyHandlers }) {
  return (
    <View style={s.thread}>
      <View style={s.threadHead} accessibilityRole="header">
        <View style={s.threadHeadText}>
          <Text style={s.overline}>
            YOUR {KIND_NOUN[post.kind].toUpperCase()} · {perspectives.length} {perspectives.length === 1 ? 'PERSPECTIVE' : 'PERSPECTIVES'}
          </Text>
          <Text style={s.question}>{post.prompt}</Text>
        </View>
        <PostThumb post={post} size={{ width: 60, height: 75, radius: 12 }} />
      </View>
      {perspectives.map((p, i) => (
        <Reply key={p.id} perspective={p} last={i === perspectives.length - 1} handlers={handlers} />
      ))}
    </View>
  );
}

function Reply({ perspective: p, last, handlers }: { perspective: ReceivedPerspective; last: boolean; handlers: ReplyHandlers }) {
  const verdict = p.feedback?.verdict ?? null;
  const decided = verdict !== null;
  const busy = handlers.busyId === p.id;
  const asked = !!p.pendingConnectRequestId;

  return (
    <View style={s.reply}>
      {/* The avatar column, with the line that joins this reply to the next. */}
      <View style={s.rail}>
        <Pressable
          onPress={() => handlers.onOpenPerson(p.giver)}
          accessibilityRole="button"
          accessibilityLabel={`${p.giver.displayName}, ${p.giver.age}. Open profile`}
        >
          <PaperAvatar person={p.giver} size={38} />
        </Pressable>
        {last ? null : <View style={s.railLine} />}
      </View>

      <View style={[s.replyBody, !last && s.replyBodyGap]}>
        <View style={s.replyHead}>
          <Pressable onPress={() => handlers.onOpenPerson(p.giver)} style={s.replyWho} accessibilityRole="button">
            <View style={s.replyNameRow}>
              <Text style={s.replyName} numberOfLines={1}>
                {p.giver.displayName}
              </Text>
              {p.giver.verified ? <SealCheckIcon size={14} weight="fill" color={e.colors.accent} /> : null}
            </View>
            <Text style={s.replyMeta}>
              {p.giver.age} · {timeAgo(p.createdAt)}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handlers.onConnect(p.giver)}
            accessibilityRole="button"
            accessibilityLabel={asked ? `${p.giver.displayName} wants to connect. Open profile` : `Connect with ${p.giver.displayName}. Open profile`}
            hitSlop={8}
            style={({ pressed }) => [s.connect, asked && s.connectAsked, pressed && s.pressed]}
          >
            <UserPlusIcon size={13} weight="bold" color={asked ? e.colors.accent : e.colors.onInk} />
            <Text style={[s.connectText, asked && s.connectTextAsked]}>{asked ? 'Wants to connect' : 'Connect'}</Text>
          </Pressable>
          <Pressable
            onPress={() => handlers.onMore(p)}
            accessibilityRole="button"
            accessibilityLabel="Report or block"
            hitSlop={10}
            style={({ pressed }) => [s.more, pressed && s.pressed]}
          >
            <DotsThreeIcon size={20} weight="bold" color={e.colors.muted} />
          </Pressable>
        </View>

        <Text style={s.words}>{p.comment}</Text>

        {p.chips.length > 0 ? (
          <View style={s.chips}>
            {p.chips.map((c) => (
              <Text key={c} style={s.chip}>
                {c}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={s.actions}>
          <Text style={[s.ask, decided && s.askDecided]}>
            {verdict === 'helpful' ? 'Helpful' : verdict === 'not_helpful' ? 'Not helpful · only you see this' : 'Helpful?'}
          </Text>
          <Pressable
            onPress={() => handlers.onHelpful(p)}
            disabled={decided || busy}
            accessibilityRole="button"
            accessibilityLabel="Helpful"
            accessibilityState={{ selected: verdict === 'helpful', disabled: decided || busy }}
            style={({ pressed }) => [s.thumb, verdict === 'not_helpful' && s.thumbFaded, pressed && s.pressed]}
          >
            <ThumbsUpIcon size={21} weight={verdict === 'helpful' ? 'fill' : 'regular'} color={e.colors.ink} />
          </Pressable>
          <Pressable
            onPress={() => handlers.onNotHelpful(p)}
            disabled={decided || busy}
            accessibilityRole="button"
            accessibilityLabel="Not helpful"
            accessibilityState={{ selected: verdict === 'not_helpful', disabled: decided || busy }}
            style={({ pressed }) => [s.thumb, verdict === 'helpful' && s.thumbFaded, pressed && s.pressed]}
          >
            <ThumbsDownIcon size={21} weight={verdict === 'not_helpful' ? 'fill' : 'regular'} color={e.colors.ink} />
          </Pressable>
          {busy ? <ActivityIndicator size="small" color={e.colors.ink} /> : null}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  pressed: { opacity: theme.opacity.pressed },
  overline: { fontFamily: e.fonts.bodySemibold, fontSize: 11, letterSpacing: 1.1, color: e.colors.muted },

  // Locked preview
  locked: { backgroundColor: e.colors.ink, borderRadius: 24, padding: theme.spacing.lg - 4, gap: theme.spacing.md },
  ghostRow: { flexDirection: 'row', alignItems: 'center' },
  ghost: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: e.colors.onInkLine,
    borderWidth: 2,
    borderColor: e.colors.ink,
  },
  ghostOverlap: { marginLeft: -12 },
  eye: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: e.colors.onInkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostLines: { gap: 8, paddingVertical: 2 },
  ghostLine: { height: 10, borderRadius: 5, backgroundColor: e.colors.onInkSoft },
  lockedTitle: { fontFamily: e.fonts.display, fontSize: 24, lineHeight: 30, color: e.colors.onInk, marginTop: theme.spacing.xs },
  lockedText: { fontFamily: e.fonts.body, fontSize: 14.5, lineHeight: 21, color: e.colors.onInkMuted, marginTop: -4 },
  lockedPill: {
    alignSelf: 'flex-start',
    minHeight: theme.touchTarget.min - 4,
    paddingHorizontal: theme.spacing.base + 2,
    borderRadius: theme.radius.pill,
    backgroundColor: e.colors.onInk,
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
  },
  lockedPillText: { fontFamily: e.fonts.bodySemibold, fontSize: 14.5, color: e.colors.ink },

  // Request cards
  request: {
    width: REQUEST_CARD_WIDTH,
    backgroundColor: e.colors.surface,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: e.colors.line,
    overflow: 'hidden',
  },
  requestPhoto: { height: 220, backgroundColor: e.colors.line, justifyContent: 'flex-end' },
  requestInitialWrap: { alignItems: 'center', justifyContent: 'center' },
  requestInitial: { fontFamily: e.fonts.display, fontSize: 64, color: e.colors.ink },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  requestName: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: theme.spacing.base },
  requestNameText: { fontFamily: e.fonts.display, fontSize: 24, lineHeight: 28, color: e.colors.onInk, flexShrink: 1 },
  requestBody: { padding: theme.spacing.base, gap: 10 },
  requestWords: { fontFamily: e.fonts.body, fontSize: 15.5, lineHeight: 22, color: e.colors.ink },
  onPost: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onPostText: { flex: 1, fontFamily: e.fonts.body, fontSize: 12.5, color: e.colors.muted },
  hint: { fontFamily: e.fonts.bodyMedium, fontSize: 12.5, color: e.colors.accent },
  requestActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: 2 },
  primary: {
    flex: 1,
    minHeight: theme.touchTarget.min,
    borderRadius: theme.radius.pill,
    backgroundColor: e.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  primaryText: { fontFamily: e.fonts.bodySemibold, fontSize: 15, color: e.colors.onInk },
  decline: { minHeight: theme.touchTarget.min, paddingHorizontal: theme.spacing.md, justifyContent: 'center' },
  declineText: { fontFamily: e.fonts.bodySemibold, fontSize: 15, color: e.colors.muted },

  // Post thread
  postThumb: { backgroundColor: e.colors.line },
  postTile: { backgroundColor: e.colors.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: e.colors.line, alignItems: 'center', justifyContent: 'center' },
  thread: {
    backgroundColor: e.colors.surface,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: e.colors.line,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.base + 2,
    paddingBottom: theme.spacing.sm,
  },
  threadHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.base,
    marginBottom: theme.spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: e.colors.line,
  },
  threadHeadText: { flex: 1, gap: 6 },
  question: { fontFamily: e.fonts.display, fontSize: 21, lineHeight: 27, color: e.colors.ink },
  reply: { flexDirection: 'row', gap: theme.spacing.md },
  rail: { alignItems: 'center', width: 38 },
  railLine: { flex: 1, width: 2, borderRadius: 1, backgroundColor: e.colors.line, marginTop: 6 },
  replyBody: { flex: 1, gap: 8 },
  replyBodyGap: { paddingBottom: theme.spacing.lg },
  replyHead: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38 },
  replyWho: { flex: 1, gap: 1 },
  replyNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  replyName: { fontFamily: e.fonts.bodySemibold, fontSize: 15, color: e.colors.ink, flexShrink: 1 },
  replyMeta: { fontFamily: e.fonts.body, fontSize: 13, color: e.colors.muted },
  connect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: 11,
    borderRadius: theme.radius.pill,
    backgroundColor: e.colors.ink,
  },
  connectAsked: { backgroundColor: e.colors.surface, borderWidth: 1, borderColor: e.colors.accent },
  connectText: { fontFamily: e.fonts.bodySemibold, fontSize: 12.5, color: e.colors.onInk },
  connectTextAsked: { color: e.colors.accent },
  more: { width: 28, height: 30, alignItems: 'center', justifyContent: 'center' },
  words: { fontFamily: e.fonts.body, fontSize: 16, lineHeight: 23, color: e.colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    fontFamily: e.fonts.bodyMedium,
    fontSize: 12.5,
    color: e.colors.ink,
    backgroundColor: e.colors.paper,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  actions: { flexDirection: 'row', alignItems: 'center', marginLeft: -4, marginTop: -4 },
  ask: { fontFamily: e.fonts.bodyMedium, fontSize: 13, color: e.colors.muted, marginLeft: 4, marginRight: 4 },
  askDecided: { color: e.colors.ink },
  thumb: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  thumbFaded: { opacity: 0.3 },
});
