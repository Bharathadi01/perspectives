import type { Connection } from '@perspective/contracts';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../src/components/profile/Avatar';
import { useConnections, useMarkConnectionsSeen, useMe } from '../src/features/hooks';
import { playConnectedMoment } from '../src/lib/celebrate';
import { theme } from '../src/theme';

const SHOW_FOR_MS = 2600;
const CONFETTI = [theme.colors.confettiGold, theme.colors.confettiCoral, theme.colors.confettiMint, theme.colors.confettiLilac];

/** One falling confetti piece; positions are fixed per index so the layout is stable. */
function ConfettiPiece({ index, width, height, play }: { index: number; width: number; height: number; play: boolean }) {
  const fall = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!play) return;
    Animated.timing(fall, {
      toValue: 1,
      duration: 1600 + (index % 5) * 220,
      delay: (index % 7) * 90,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [fall, index, play]);
  const left = ((index * 37) % 100) / 100;
  const drift = ((index % 3) - 1) * 24;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.confetti,
        {
          left: left * width,
          backgroundColor: CONFETTI[index % CONFETTI.length],
          transform: [
            { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [-40, height * 0.55] }) },
            { translateX: fall.interpolate({ inputRange: [0, 1], outputRange: [0, drift] }) },
            { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(index % 2 ? 1 : -1) * 220}deg`] }) },
          ],
          opacity: fall.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
        },
      ]}
    />
  );
}

/**
 * "You're connected": a short moment with our own chime, a vibration and a little motion, then the
 * chat (one connection, keyboard up) or the Connections list (several). Tap anywhere to continue.
 */
export default function Connected() {
  const params = useLocalSearchParams<{ ids?: string }>();
  const ids = useMemo(() => (params.ids ?? '').split(',').filter(Boolean), [params.ids]);
  const connections = useConnections();
  const me = useMe();
  const markSeen = useMarkConnectionsSeen();
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const left = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const done = useRef(false);

  const items: Connection[] = (connections.data ?? []).filter((c) => ids.includes(c.id));
  const single = ids.length === 1 ? items[0] : undefined;

  const go = () => {
    if (done.current) return;
    done.current = true;
    if (ids.length === 1) router.replace({ pathname: '/chat/[id]', params: { id: ids[0], focus: '1' } });
    else router.replace('/(tabs)/connections');
  };

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
  }, []);

  // Mark seen straight away, so the moment shows once even if the app is closed now.
  useEffect(() => {
    if (ids.length === 0) {
      router.replace('/(tabs)/connections');
      return;
    }
    markSeen.run(ids).catch((err: unknown) => console.warn('Could not mark connections seen', err));
    void playConnectedMoment();
    const timer = setTimeout(go, SHOW_FOR_MS);
    return () => clearTimeout(timer);
    // Runs once per set of connections; `go` and `markSeen` are stable enough for this one-shot screen.
  }, [ids.join(',')]);

  useEffect(() => {
    if (reduceMotion === null) return;
    Animated.timing(fade, { toValue: 1, duration: reduceMotion ? 200 : 350, useNativeDriver: true }).start();
    if (reduceMotion) {
      left.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.spring(left, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    ]).start();
  }, [reduceMotion, fade, left, glow]);

  const myName = me.data?.displayName ?? 'You';
  const myPhoto = me.data?.posts[0]?.mediaUrl ?? null;
  const title = ids.length > 1 ? `${ids.length} new connections` : 'You’re connected';
  const subtitle = single
    ? `You and ${single.partner.displayName} can talk now.`
    : ids.length > 1
      ? 'People said yes while you were away.'
      : '';

  return (
    <Pressable style={s.screen} onPress={go} accessibilityRole="button" accessibilityLabel={`${title}. Tap to continue.`}>
      {!reduceMotion && reduceMotion !== null
        ? Array.from({ length: 22 }, (_, i) => <ConfettiPiece key={i} index={i} width={width} height={height} play />)
        : null}
      <SafeAreaView style={s.safe}>
        <Animated.View style={[s.center, { opacity: fade }]}>
          <View style={s.avatars}>
            <Animated.View
              pointerEvents="none"
              style={[s.glow, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }), transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) }] }]}
            />
            <Animated.View style={[s.avatarWrap, { transform: [{ translateX: left.interpolate({ inputRange: [0, 1], outputRange: [-70, -26] }) }] }]}>
              <Avatar name={myName} url={myPhoto} size={112} />
            </Animated.View>
            {ids.length > 1 ? (
              <Animated.View style={[s.avatarWrap, s.many, { transform: [{ translateX: left.interpolate({ inputRange: [0, 1], outputRange: [70, 26] }) }] }]}>
                <Text style={s.manyText}>+{ids.length}</Text>
              </Animated.View>
            ) : (
              <Animated.View style={[s.avatarWrap, { transform: [{ translateX: left.interpolate({ inputRange: [0, 1], outputRange: [70, 26] }) }] }]}>
                <Avatar name={single?.partner.displayName ?? '?'} url={single?.partner.primaryPhotoUrl ?? null} size={112} />
              </Animated.View>
            )}
          </View>
          <Text style={s.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
          {single ? <Text style={s.origin}>Over “{single.origin.postPrompt}”</Text> : null}
        </Animated.View>
        <Text style={s.hint}>{ids.length > 1 ? 'Tap to see them' : 'Tap to say hi'}</Text>
      </SafeAreaView>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.celebrationBackground, overflow: 'hidden' },
  safe: { flex: 1, justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: theme.spacing.md },
  avatars: { height: 150, width: 260, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.lg },
  glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: theme.colors.celebrationGlow },
  avatarWrap: {
    position: 'absolute',
    borderRadius: 60,
    borderWidth: 4,
    borderColor: theme.colors.onDark,
  },
  many: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.brand },
  manyText: { color: theme.colors.onDark, fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold },
  title: { color: theme.colors.onDark, fontSize: theme.typography.fontSize.hero, fontWeight: theme.typography.fontWeight.bold, textAlign: 'center' },
  subtitle: { color: theme.colors.onDark, fontSize: theme.typography.fontSize.md, textAlign: 'center' },
  origin: { color: theme.colors.confettiLilac, fontSize: theme.typography.fontSize.base, textAlign: 'center', fontStyle: 'italic', paddingHorizontal: theme.spacing.lg },
  hint: { color: theme.colors.confettiLilac, fontSize: theme.typography.fontSize.sm, marginBottom: theme.spacing.base },
  confetti: { position: 'absolute', top: 0, width: 10, height: 14, borderRadius: 3 },
});
