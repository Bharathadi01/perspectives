import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { BottomTabBarProps } from 'expo-router/tabs';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { selection } from '../../lib/haptics';
import { useReduceMotion } from '../../lib/useReduceMotion';
import { theme } from '../../theme';
import { Avatar } from '../profile/Avatar';
import type { IconName } from './IconButton';
import { LENS_INSET, lensLeft, lensLeftForFinger, slotWidth, tabIndexAt } from './tabBarGeometry';

const e = theme.editorial;
const BAR_HEIGHT = 64;
const LENS_HEIGHT = BAR_HEIGHT - LENS_INSET * 3;
/** How much the tab under the travelling lens is enlarged, standing in for the lens's magnification. */
const MAGNIFY = 1.12;
/**
 * Tabs are drawn at their enlarged size and shrunk to this scale at rest. Scaling a drawn icon or
 * label *up* makes it blurry and pixelated; scaling it down keeps it sharp.
 */
const REST = 1 / MAGNIFY;
const ICON = Math.round(25 * MAGNIFY);
const AVATAR = Math.round(24 * MAGNIFY);
/** Springy, slightly underdamped travel; stops counting once it is within half a pixel. */
const TRAVEL = { useNativeDriver: false, damping: 18, stiffness: 220, mass: 1, restDisplacementThreshold: 0.5, restSpeedThreshold: 2 } as const;

export interface GlassTab {
  /** The route name in app/(tabs). */
  name: string;
  label: string;
  /** Ionicons (the app's original tab icons; Phosphor was tried and reverted on 2026-10-25). */
  icon: IconName;
  iconActive: IconName;
}

interface Props extends BottomTabBarProps {
  tabs: GlassTab[];
  /** Shown in place of the icon on the "you" tab, with a ring when selected. */
  avatar?: { name: string; url: string | null };
}

/** Whether iOS asks for less see-through surfaces; the bar then uses a solid fill. */
function useReduceTransparency(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((on) => active && setReduce(on))
      .catch((err: unknown) => console.warn('Could not read Reduce Transparency', err));
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduce);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * The floating glass tab bar (2026-10-25). A capsule of glass (real Liquid Glass on iOS 26, frosted
 * paper elsewhere) with a selection capsule that lifts into a larger "lens" when you tap or drag,
 * springs to the new tab, enlarges the tab beneath it, ticks a haptic per tab it crosses, then
 * settles. Reduce Motion skips the travel; Reduce Transparency uses a solid fill.
 */
export function GlassTabBar({ state, descriptors, navigateToTab, insets, tabs, avatar }: Props) {
  const routes = state.routes.filter((r) => tabs.some((t) => t.name === r.name));
  const count = routes.length;
  const activeIndex = Math.max(0, routes.findIndex((r) => r.key === state.routes[state.index]?.key));

  const reduceMotion = useReduceMotion();
  const reduceTransparency = useReduceTransparency();
  const liquidGlass = Platform.OS === 'ios' && !reduceTransparency && isLiquidGlassAvailable();

  const [barWidth, setBarWidth] = useState(0);
  const barX = useRef(0);
  const barRef = useRef<React.ComponentRef<typeof View>>(null);
  const x = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const scales = useRef(tabs.map(() => new Animated.Value(REST))).current;
  const hover = useRef<number | null>(null);
  const dragging = useRef(false);
  const lensAt = useRef(0);

  const lensWidth = Math.max(0, slotWidth(barWidth, count) - LENS_INSET * 2);

  // Enlarge only the tab under the lens while it is lifted.
  const setHover = (index: number | null) => {
    if (hover.current === index) return;
    if (index !== null && hover.current !== null) selection();
    hover.current = index;
    scales.forEach((v, i) =>
      Animated.spring(v, { toValue: i === index ? 1 : REST, useNativeDriver: false, speed: 24, bounciness: 6 }).start(),
    );
  };

  // While the lens travels, keep track of which tab it is over (haptic tick + magnification).
  useEffect(() => {
    const id = x.addListener(({ value }) => {
      lensAt.current = value;
      if (hover.current === null || barWidth === 0) return;
      setHover(tabIndexAt(value + lensWidth / 2, barWidth, count));
    });
    return () => x.removeListener(id);
    // setHover only touches refs, so it does not need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, barWidth, count, lensWidth]);

  // Follow the selected tab when it changes from elsewhere (a push, a link) or on first layout.
  useEffect(() => {
    if (barWidth === 0 || dragging.current || hover.current !== null) return;
    x.setValue(lensLeft(activeIndex, barWidth, count));
  }, [activeIndex, barWidth, count, x]);

  const settle = () =>
    Animated.timing(lift, { toValue: 0, duration: 220, useNativeDriver: false }).start(() => setHover(null));

  const travelTo = (index: number) => {
    const to = lensLeft(index, barWidth, count);
    if (reduceMotion) {
      x.setValue(to);
      return;
    }
    setHover(tabIndexAt(lensAt.current + lensWidth / 2, barWidth, count));
    // Lift, travel, settle: about 0.6 s in all. The settle does not wait for the spring's last wobble.
    Animated.spring(x, { toValue: to, ...TRAVEL }).start();
    Animated.sequence([
      Animated.timing(lift, { toValue: 1, duration: 120, useNativeDriver: false }),
      Animated.delay(260),
      Animated.timing(lift, { toValue: 0, duration: 220, useNativeDriver: false }),
    ]).start(() => setHover(null));
  };

  const press = (index: number) => {
    selection();
    if (index !== activeIndex) travelTo(index);
    navigateToTab(routes[index].key);
  };

  // The PanResponder is created once, so it reads the latest values through refs.
  const widthRef = useRef(barWidth);
  const countRef = useRef(count);
  const reduceMotionRef = useRef(reduceMotion);
  const finishRef = useRef<(fx: number) => void>(() => undefined);
  widthRef.current = barWidth;
  countRef.current = count;
  reduceMotionRef.current = reduceMotion;
  finishRef.current = (fx: number) => {
    dragging.current = false;
    const index = tabIndexAt(fx, barWidth, count);
    Animated.spring(x, { toValue: lensLeft(index, barWidth, count), ...TRAVEL }).start();
    settle();
    if (index !== activeIndex) navigateToTab(routes[index].key);
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      // Keep the drag once it has started (otherwise a scroll view or text selection can steal it).
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dragging.current = true;
        barRef.current?.measureInWindow((px: number) => (barX.current = px));
      },
      onPanResponderMove: (_, g) => {
        if (reduceMotionRef.current) return;
        const fx = g.moveX - barX.current;
        if (hover.current === null) {
          Animated.timing(lift, { toValue: 1, duration: 120, useNativeDriver: false }).start();
          setHover(tabIndexAt(fx, widthRef.current, countRef.current));
        }
        x.setValue(lensLeftForFinger(fx, widthRef.current, countRef.current));
      },
      onPanResponderRelease: (_, g) => finishRef.current(g.moveX - barX.current),
      onPanResponderTerminate: (_, g) => finishRef.current(g.moveX - barX.current),
    }),
  ).current;

  // The bar grows by moving its edges out, not by scaling, so its icons stay sharp.
  const barGrow = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
  const frost = lift.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });
  const lensScaleX = lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const lensScaleY = lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.26] });

  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom - 6, theme.spacing.md) }]}>
      <Animated.View style={[s.bar, { marginHorizontal: barGrow }]}>
        {liquidGlass ? (
          <GlassView style={s.fill} glassEffectStyle="regular" colorScheme="light" tintColor="rgba(246,241,231,0.35)" isInteractive />
        ) : (
          <View style={[s.fill, reduceTransparency ? s.solid : s.frosted, Platform.OS === 'web' && WEB_BLUR]} />
        )}
        <Animated.View pointerEvents="none" style={[s.fill, s.frostOverlay, { opacity: frost }]} />

        <View
          ref={barRef}
          style={s.row}
          accessibilityRole="tablist"
          onLayout={(ev) => {
            setBarWidth(ev.nativeEvent.layout.width);
            barRef.current?.measureInWindow((px: number) => (barX.current = px));
          }}
          {...pan.panHandlers}
        >
          {barWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[s.lens, { width: lensWidth, transform: [{ translateX: x }, { scaleX: lensScaleX }, { scaleY: lensScaleY }] }]}
            >
              <View style={[s.fill, s.lensFlat]} />
              <Animated.View style={[s.fill, s.lensGlass, { opacity: lift }]} />
            </Animated.View>
          ) : null}

          {routes.map((route, index) => {
            const tab = tabs.find((t) => t.name === route.name);
            if (!tab) return null;
            const selected = index === activeIndex;
            const badge = descriptors[route.key]?.options.tabBarBadge;
            const showAvatar = route.name === 'you' && avatar;
            return (
              <Pressable
                key={route.key}
                onPress={() => press(index)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                aria-selected={selected}
                accessibilityLabel={badge ? `${tab.label}, ${badge} new` : tab.label}
                style={s.tab}
              >
                <Animated.View style={[s.tabInner, { transform: [{ scale: scales[index] ?? REST }] }]}>
                  <View>
                    {showAvatar ? (
                      <View style={[s.avatarRing, selected && s.avatarRingOn]}>
                        <Avatar name={avatar.name} url={avatar.url} size={AVATAR} />
                      </View>
                    ) : (
                      <Ionicons name={selected ? tab.iconActive : tab.icon} size={ICON} color={e.colors.ink} />
                    )}
                    {badge ? (
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[s.label, selected && s.labelOn]} numberOfLines={1}>
                    {tab.label}
                  </Text>
                </Animated.View>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

/** The web preview has no native glass; a CSS backdrop blur stands in for it. */
const WEB_BLUR = { backdropFilter: 'blur(24px) saturate(160%)' } as unknown as ViewStyle;

const s = StyleSheet.create({
  wrap: { paddingHorizontal: theme.spacing.base, paddingTop: theme.spacing.sm - 2, backgroundColor: e.colors.paper },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  fill: { ...StyleSheet.absoluteFill, borderRadius: BAR_HEIGHT / 2, overflow: 'hidden' },
  frosted: { backgroundColor: 'rgba(255,253,248,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  solid: { backgroundColor: e.colors.surface, borderWidth: 1, borderColor: e.colors.line },
  frostOverlay: { backgroundColor: '#FFFFFF' },
  // userSelect: dragging across the labels in the web preview must not select their text.
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', userSelect: 'none' },
  lens: { position: 'absolute', left: 0, top: (BAR_HEIGHT - LENS_HEIGHT) / 2, height: LENS_HEIGHT },
  lensFlat: { borderRadius: LENS_HEIGHT / 2, backgroundColor: 'rgba(36,29,21,0.08)' },
  lensGlass: {
    borderRadius: LENS_HEIGHT / 2,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  tab: { flex: 1, height: BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  tabInner: { alignItems: 'center', gap: 2 },
  // 11 pt on screen at rest (drawn larger, see REST).
  label: { fontFamily: e.fonts.bodyMedium, fontSize: 11 * MAGNIFY, color: e.colors.ink },
  labelOn: { fontFamily: e.fonts.bodySemibold },
  avatarRing: { padding: 2, borderRadius: 999, borderWidth: 2, borderColor: 'transparent' },
  avatarRingOn: { borderColor: e.colors.ink },
  // Sized for the tab's REST scale, so it is about 17 px on screen.
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: e.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: e.fonts.bodyBold, fontSize: 11, color: '#FFFFFF' },
});
