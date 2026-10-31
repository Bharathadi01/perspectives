import { chipsFor, RULES, sparkHintsFor, type Post } from '@perspective/contracts';
import { GlassView } from 'expo-glass-effect';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { NATIVE_GLASS_TABS } from '../../components/ui/GlassTabBar';
import { ArrowUpIcon, CheckCircleIcon, SparkleIcon, UserPlusIcon } from '../../components/ui/icons';
import { useToast } from '../../components/ui/Toast';
import { useGivePerspective, useProfileView } from '../hooks';
import { errorMessage } from '../../lib/errors';
import { success, tap, warn } from '../../lib/haptics';
import { setBusy } from '../../lib/busyFlag';
import { useReduceMotion } from '../../lib/useReduceMotion';
import { useReduceTransparency } from '../../lib/useReduceTransparency';
import { theme } from '../../theme';
import { clearDraft, readDraft, readiness, saveDraft, toggleChip } from './compose';

const e = theme.editorial;
const OPEN_SPRING = { damping: 20, stiffness: 190, mass: 1 } as const;
/** How far below the screen the closed composer waits. */
const OFFSCREEN = 600;

const CONNECT_NOT_SENT: Record<string, string> = {
  CONNECT_COOLDOWN_ACTIVE: 'Perspective sent. You can ask to connect again later.',
  CONNECT_REQUEST_PENDING: 'Perspective sent. A connect request is already waiting.',
  ALREADY_CONNECTED: 'Perspective sent. You’re already connected.',
  CAP_REACHED: 'Perspective sent. You’ve reached today’s connect limit.',
};

export interface GiveTarget {
  post: Post;
  profileId: string;
  name: string;
}

/**
 * Give a perspective without leaving the feed (2026-10-27): a glass composer slides up over the
 * screen, with the spark inside the box, quick picks, an optional connect request and a send button.
 * Same rules, hook and server call as the old Give screen it replaces. Unsent text is kept per post.
 */
export function GiveComposer({ target, onClose }: { target: GiveTarget | null; onClose: () => void }) {
  // Keep the last target while the composer animates away after the parent clears it.
  const [current, setCurrent] = useState<GiveTarget | null>(target);
  useEffect(() => {
    if (target) setCurrent(target);
  }, [target]);
  if (!current) return null;
  return <ComposerSheet key={current.post.id} target={current} open={!!target} onClose={onClose} onGone={() => setCurrent(null)} />;
}

function ComposerSheet({ target, open, onClose, onGone }: { target: GiveTarget; open: boolean; onClose: () => void; onGone: () => void }) {
  const { post, profileId, name } = target;
  const view = useProfileView(profileId);
  const give = useGivePerspective();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const reduceTransparency = useReduceTransparency();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);

  const draft = readDraft(post.id);
  const [comment, setComment] = useState(draft?.comment ?? '');
  const [chips, setChips] = useState<string[]>(draft?.chips ?? []);
  const [connect, setConnect] = useState(draft?.connect ?? false);

  // Who can tick Connect: the same rule as before. If they asked you, this perspective accepts.
  const rel = view.data?.relationship;
  const canAsk = !!rel && rel.connectionId === null && !rel.outgoingRequestPending && rel.incomingRequestId === null;
  const canAccept = !!rel && rel.connectionId === null && rel.incomingRequestId !== null;
  const connectOffered = canAsk || canAccept;
  const connecting = connect && connectOffered;

  const spark = sparkHintsFor(post.category, post.focusAreas)[0];
  const picks = chipsFor(post.category);
  const { remaining, ready } = readiness(comment);

  // ---- animation: slide up (or fade, with Reduce Motion), follow the keyboard, drag down to close
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const keyboard = useAnimatedKeyboard();
  const empty = comment.length === 0;
  const sparkShown = useSharedValue(empty ? 1 : 0);

  // Mid-task: the "you're connected" moment waits until the composer is closed.
  useEffect(() => {
    setBusy('give-composer', open);
    return () => setBusy('give-composer', false);
  }, [open]);

  useEffect(() => {
    progress.value = reduceMotion ? withTiming(open ? 1 : 0, { duration: 180 }) : withSpring(open ? 1 : 0, OPEN_SPRING);
    if (!open) {
      const t = setTimeout(onGone, reduceMotion ? 200 : 380);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, reduceMotion, progress, onGone]);

  // The spark fades out (with a slight lift) on the first character and back in when the box is empty.
  useEffect(() => {
    sparkShown.value = withTiming(empty ? 1 : 0, { duration: 170 });
  }, [empty, sparkShown]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value * 0.32 }));
  const panelStyle = useAnimatedStyle(() => ({
    bottom: keyboard.height.value,
    maxHeight: windowHeight - keyboard.height.value - insets.top - 12,
    opacity: reduceMotion ? progress.value : 1,
    transform: [{ translateY: (reduceMotion ? 0 : (1 - progress.value) * OFFSCREEN) + Math.max(0, drag.value) }],
  }));
  // Room for the home indicator only while the keyboard is down.
  const bottomSpace = useAnimatedStyle(() => ({ height: keyboard.height.value > 0 ? 0 : insets.bottom }));
  const sparkStyle = useAnimatedStyle(() => ({
    opacity: sparkShown.value * 0.55,
    transform: [{ translateY: (1 - sparkShown.value) * -4 }],
  }));

  const close = () => {
    saveDraft(post.id, { comment, chips, connect });
    input.current?.blur();
    onClose();
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        drag.value = g.dy;
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 0.9) {
          drag.value = withTiming(OFFSCREEN, { duration: 200 }, () => scheduleOnRN(closeRef.current));
        } else {
          drag.value = withSpring(0, OPEN_SPRING);
        }
      },
    }),
  ).current;

  const pick = (chip: string, shake: () => void, pop: () => void) => {
    const { next, refused } = toggleChip(chips, chip);
    if (refused) {
      warn();
      shake();
      return;
    }
    tap();
    if (!chips.includes(chip)) pop();
    setChips(next);
  };

  const send = async () => {
    if (!ready || give.isPending) return;
    try {
      const result = await give.run({ postId: post.id, comment: comment.trim(), chips, connect: connecting });
      success();
      clearDraft(post.id);
      setComment('');
      onClose();
      if (result.connect?.status === 'connected') {
        router.push({ pathname: '/connected', params: { ids: result.connect.connectionId } });
        return;
      }
      if (result.connect?.status === 'sent') toast(`Perspective sent, and you asked ${name} to connect.`, 'success');
      else if (result.connect?.status === 'not_sent') toast(CONNECT_NOT_SENT[result.connect.code] ?? 'Perspective sent.', 'info');
      else toast(result.daily.unlocked ? 'Perspective sent. Your inbox is unlocked!' : 'Perspective sent.', 'success');
    } catch (err) {
      // Nothing was saved (one call carries both); the text stays so they can try again.
      toast(errorMessage(err), 'error');
    }
  };

  const glass = NATIVE_GLASS_TABS && !reduceTransparency;

  return (
    <Modal visible transparent animationType="none" onRequestClose={close} onShow={() => input.current?.focus()} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Close without sending" />
      </Animated.View>

      <Animated.View style={[s.panel, panelStyle]} accessibilityViewIsModal>
        {glass ? (
          <>
            <GlassView style={[StyleSheet.absoluteFill, s.panelShape]} glassEffectStyle="regular" tintColor={e.colors.paper} colorScheme="light" />
            {/* Clear glass alone let the card's name and photo show through the text; this keeps it legible. */}
            <View style={[StyleSheet.absoluteFill, s.panelShape, s.veil]} />
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, s.panelShape, s.solid]} />
        )}

        <View {...pan.panHandlers} style={s.grab}>
          <View style={s.handle} />
          <Text style={s.title} accessibilityRole="header" numberOfLines={1}>
            Your perspective for {name}
          </Text>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={s.body}
        >
          <View style={s.inputWrap}>
            {spark ? (
              <Animated.View pointerEvents="none" style={[s.spark, sparkStyle]} importantForAccessibility="no-hide-descendants">
                <SparkleIcon size={15} weight="fill" color={e.colors.accent} />
                <Text style={s.sparkText} numberOfLines={2}>
                  {spark}
                </Text>
              </Animated.View>
            ) : null}
            <TextInput
              ref={input}
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={RULES.commentMaxLength}
              style={s.input}
              placeholder={spark ? undefined : 'Be specific and honest.'}
              placeholderTextColor={e.colors.muted}
              accessibilityLabel={`Your honest perspective for ${name}${spark ? `. Idea: ${spark}` : ''}`}
              accessibilityHint={`At least ${RULES.commentMinLength} characters`}
            />
          </View>
          <Text style={s.guide}>
            Be specific and honest. Criticism is welcome; insults and body shaming are not. Only {name} sees this.
          </Text>

          {picks.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} keyboardShouldPersistTaps="handled">
              {picks.map((c) => (
                <PickChip key={c} label={c} selected={chips.includes(c)} onPick={(shake, pop) => pick(c, shake, pop)} />
              ))}
            </ScrollView>
          ) : null}

          {connectOffered ? (
            <View style={s.connect}>
              <UserPlusIcon size={20} color={e.colors.ink} />
              <Text style={s.connectText}>{canAccept ? `Also connect with ${name}` : `Also send a connection request to ${name}`}</Text>
              <Switch
                value={connect}
                onValueChange={(v) => {
                  tap();
                  setConnect(v);
                }}
                trackColor={{ true: e.colors.accent, false: e.colors.line }}
                thumbColor={e.colors.surface}
                ios_backgroundColor={e.colors.line}
                accessibilityLabel={canAccept ? `Also connect with ${name}` : `Also send a connection request to ${name}`}
              />
            </View>
          ) : null}

          <View style={s.footer}>
            {ready ? (
              <View style={s.readyRow} accessible accessibilityLabel="Long enough to send">
                <CheckCircleIcon size={18} weight="fill" color={e.colors.accent} />
              </View>
            ) : (
              <Text style={s.counter} accessibilityLiveRegion="polite">
                {remaining} more
              </Text>
            )}
            <Pressable
              onPress={() => void send()}
              disabled={!ready || give.isPending}
              accessibilityRole="button"
              accessibilityLabel={connecting ? 'Send perspective and connect' : 'Send perspective'}
              accessibilityState={{ disabled: !ready || give.isPending, busy: give.isPending }}
              style={({ pressed }) => [s.send, connecting && s.sendWide, (!ready || give.isPending) && s.sendOff, pressed && s.pressed]}
            >
              {give.isPending ? (
                <ActivityIndicator color={e.colors.onInk} />
              ) : (
                <>
                  {connecting ? <Text style={s.sendText}>Send + connect</Text> : null}
                  <ArrowUpIcon size={20} weight="bold" color={e.colors.onInk} />
                </>
              )}
            </Pressable>
          </View>
          <Animated.View style={bottomSpace} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

/** One quick pick: a small spring when chosen, a shake when the limit refuses it. */
function PickChip({ label, selected, onPick }: { label: string; selected: boolean; onPick: (shake: () => void, pop: () => void) => void }) {
  const scale = useSharedValue(1);
  const shift = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { translateX: shift.value }] }));
  const shake = () => {
    shift.value = withSequence(
      withTiming(-6, { duration: 45 }),
      withTiming(6, { duration: 45 }),
      withTiming(-4, { duration: 45 }),
      withTiming(0, { duration: 45 }),
    );
  };
  const pop = () => {
    scale.value = withSequence(withSpring(1.08, { damping: 12, stiffness: 400 }), withSpring(1, { damping: 14, stiffness: 300 }));
  };
  return (
    <Animated.View style={style}>
      <Pressable
        onPress={() => onPick(shake, pop)}
        // A toggle button on phones; the web has no such role, so a checkbox there. Checked = picked.
        accessibilityRole={Platform.OS === 'web' ? 'checkbox' : 'togglebutton'}
        accessibilityState={{ checked: selected }}
        aria-checked={selected}
        accessibilityLabel={label}
        style={[s.chip, selected && s.chipOn]}
      >
        <Text style={[s.chipText, selected && s.chipTextOn]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const RADIUS = 28;

const s = StyleSheet.create({
  backdrop: { backgroundColor: e.colors.ink },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
    borderWidth: theme.borderWidth.hairline,
    borderColor: 'rgba(255,255,255,0.7)',
    borderBottomWidth: 0,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  panelShape: { borderTopLeftRadius: RADIUS, borderTopRightRadius: RADIUS, overflow: 'hidden' },
  solid: { backgroundColor: e.colors.paper },
  veil: { backgroundColor: e.colors.paper, opacity: 0.86 },
  grab: { alignItems: 'center', paddingTop: theme.spacing.sm, paddingHorizontal: theme.spacing.lg - 4, paddingBottom: theme.spacing.sm },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: e.colors.line, marginBottom: theme.spacing.md },
  title: { alignSelf: 'stretch', fontFamily: e.fonts.display, fontSize: 20, lineHeight: 26, color: e.colors.ink },
  body: { paddingHorizontal: theme.spacing.lg - 4, paddingBottom: theme.spacing.md, gap: theme.spacing.md },
  inputWrap: {
    minHeight: 112,
    backgroundColor: e.colors.surface,
    borderRadius: 18,
    borderWidth: theme.borderWidth.hairline,
    borderColor: e.colors.line,
  },
  spark: {
    position: 'absolute',
    left: theme.spacing.base,
    right: theme.spacing.base,
    top: theme.spacing.md + 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  sparkText: { flex: 1, fontFamily: e.fonts.body, fontSize: 16, lineHeight: 22, color: e.colors.ink },
  input: {
    minHeight: 112,
    maxHeight: 200,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    fontFamily: e.fonts.body,
    fontSize: 16,
    lineHeight: 22,
    color: e.colors.ink,
    textAlignVertical: 'top',
    // The box has its own border; drop the browser's focus ring in the web preview.
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0 } as object) : null),
  },
  guide: { fontFamily: e.fonts.body, fontSize: 12, lineHeight: 17, color: e.colors.muted, marginTop: -4 },
  chips: { gap: theme.spacing.sm, paddingVertical: 2 },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md + 2,
    borderRadius: theme.radius.pill,
    backgroundColor: e.colors.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: e.colors.line,
  },
  chipOn: { backgroundColor: e.colors.accent, borderColor: e.colors.accent },
  chipText: { fontFamily: e.fonts.bodyMedium, fontSize: 14, color: e.colors.ink },
  chipTextOn: { color: e.colors.onInk },
  connect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 52,
    paddingHorizontal: theme.spacing.base,
    borderRadius: 18,
    backgroundColor: e.colors.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: e.colors.line,
  },
  connectText: { flex: 1, fontFamily: e.fonts.bodyMedium, fontSize: 15, lineHeight: 20, color: e.colors.ink },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 },
  counter: { fontFamily: e.fonts.bodyMedium, fontSize: 13, color: e.colors.muted },
  readyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  send: {
    minWidth: 48,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: e.colors.ink,
  },
  sendWide: { paddingHorizontal: theme.spacing.lg - 4 },
  sendOff: { opacity: 0.35 },
  pressed: { opacity: theme.opacity.pressed },
  sendText: { fontFamily: e.fonts.bodySemibold, fontSize: 15, color: e.colors.onInk },
});
