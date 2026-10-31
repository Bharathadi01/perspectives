import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SealCheckIcon } from '../../src/components/ui/icons';
import { Screen } from '../../src/components/ui/Screen';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { Muted } from '../../src/components/ui/Text';
import { useMe } from '../../src/features/hooks';
import { ExploreProfile } from '../../src/features/explore/ExploreProfile';
import { asPublicProfile } from '../../src/features/profile-editor/asPublicProfile';
import { ProfileEditor } from '../../src/features/profile-editor/ProfileEditor';
import { useTabBarSpace } from '../../src/components/ui/GlassTabBar';
import { theme } from '../../src/theme';

type Mode = 'view' | 'edit';

const e = theme.editorial;

const SEGMENTS = [
  { value: 'view' as const, label: 'View' },
  { value: 'edit' as const, label: 'Edit' },
];

/**
 * Your profile: look at it, or edit it, without leaving the tab.
 *
 * Everything that used to sit under this screen as a stack of buttons (basics,
 * goal, audience, notices, perspectives you gave, blocked people, sign out)
 * now lives behind the gear, in Settings.
 */
export default function You() {
  const me = useMe();
  const space = useTabBarSpace();
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'edit' ? 'edit' : 'view');

  // Set while pushing to Settings or a modal, so coming back keeps Edit selected;
  // leaving for another tab resets to View.
  const returning = useRef(false);

  useFocusEffect(
    useCallback(() => {
      returning.current = false;
      return () => {
        if (!returning.current) setMode('view');
      };
    }, []),
  );

  const leave = () => {
    returning.current = true;
  };

  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;

  const profile = asPublicProfile(me.data);

  return (
    <Screen style={s.paper}>
      <View style={s.header}>
        {/* The profile in View draws its own name, tick and details line, so View mode would
            otherwise show the name twice. Edit mode has no such header. */}
        {mode === 'edit' ? (
          <View style={s.name}>
            <Text style={s.displayName} accessibilityRole="header" numberOfLines={1}>
              {me.data.displayName ?? 'You'}
            </Text>
            {me.data.selfieStatus === 'verified' ? (
              <View accessible accessibilityRole="image" accessibilityLabel="Selfie verified">
                <SealCheckIcon size={22} weight="fill" color={e.colors.accent} />
              </View>
            ) : null}
          </View>
        ) : (
          <View style={s.name} />
        )}
        <Pressable
          onPress={() => {
            leave();
            router.push('/me/settings');
          }}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={({ pressed }) => [s.gear, pressed && s.pressed]}
        >
          <Ionicons name="settings-outline" size={theme.iconSize.lg} color={e.colors.ink} />
        </Pressable>
      </View>

      <SegmentedControl
        segments={SEGMENTS}
        value={mode}
        onChange={setMode}
        accessibilityLabel="Show or edit your profile"
        style={s.segments}
      />

      {mode === 'view' ? (
        <ScrollView contentContainerStyle={[s.viewContent, { paddingBottom: space + theme.spacing.xxl }]}>
          {profile ? (
            // The same editorial layout others see on Explore, read-only (2026-10-25).
            <ExploreProfile profile={profile} />
          ) : (
            <Muted>Add your basics and a first photo to see how your profile looks.</Muted>
          )}
        </ScrollView>
      ) : (
        <ProfileEditor me={me.data} onRefetch={() => me.refetch()} onNavigateAway={leave} />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    // Fixed height so the capsule does not shift when the name shows or hides.
    height: theme.touchTarget.min,
    paddingLeft: theme.spacing.base,
    paddingRight: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  name: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, flexShrink: 1 },
  // The serif name and clay tick, as on Explore.
  displayName: { fontFamily: e.fonts.display, fontSize: 28, lineHeight: 34, color: e.colors.ink, flexShrink: 1 },
  gear: {
    width: theme.touchTarget.min,
    height: theme.touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: theme.opacity.pressed },
  segments: { marginHorizontal: theme.spacing.base, marginVertical: theme.spacing.md },
  // Matches Explore: warm paper and the same side margins.
  paper: { backgroundColor: theme.editorial.colors.paper },
  viewContent: { paddingHorizontal: theme.spacing.lg - 4, paddingTop: theme.spacing.xs, paddingBottom: theme.spacing.xxl },
});
