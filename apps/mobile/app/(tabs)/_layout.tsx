import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import React, { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { ConnectedMomentWatcher } from '../../src/components/connect/ConnectedMomentWatcher';
import { GlassTabBar, NATIVE_GLASS_TABS, type GlassTab } from '../../src/components/ui/GlassTabBar';
import { LoadingState } from '../../src/components/ui/States';
import { useConnections, useInbox, useMe } from '../../src/features/hooks';
import { usePushRegistration } from '../../src/push/push';
import { useSession } from '../../src/session/sessionStore';
import { theme } from '../../src/theme';


/**
 * The tabs and their Ionicons (outline, filled when selected). On iOS 26 and later the system draws
 * the tab bar itself: Apple's floating Liquid Glass bar with the lens, magnification, refraction and
 * drag-to-scrub (2026-10-26), with these same icons. Everywhere else (web, Android, older iOS)
 * GlassTabBar stands in, where "You" shows your first photo; the system bar cannot shrink a photo
 * to icon size, so it keeps the person icon.
 */
const TABS: GlassTab[] = [
  { name: 'explore', label: 'Explore', icon: 'compass-outline', iconActive: 'compass' },
  { name: 'inbox', label: 'Inbox', icon: 'mail-outline', iconActive: 'mail' },
  { name: 'create', label: 'Your posts', icon: 'add-circle-outline', iconActive: 'add-circle' },
  { name: 'connections', label: 'Connections', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { name: 'you', label: 'You', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

type TabIcons = Record<string, { default: ImageSourcePropType; selected: ImageSourcePropType }>;

/**
 * The tab icons as images for the iOS 26 system bar, both versions of every tab loaded together.
 * Handing the bar Ionicons that load one by one let a filled icon arrive before its outline, and
 * react-native-screens throws when that happens.
 */
function useNativeTabIcons(enabled: boolean): TabIcons | null {
  const [icons, setIcons] = useState<TabIcons | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    Promise.all(
      TABS.map(async (t) => {
        const [normal, selected] = await Promise.all([
          Ionicons.getImageSource(t.icon, 26, '#000000'),
          Ionicons.getImageSource(t.iconActive, 26, '#000000'),
        ]);
        if (!normal || !selected) throw new Error(`No image for the ${t.name} tab icon`);
        return [t.name, { default: normal, selected }] as const;
      }),
    )
      .then((entries) => active && setIcons(Object.fromEntries(entries)))
      .catch((err: unknown) => console.warn('Could not load the tab icons; tabs show labels only', err));
    return () => {
      active = false;
    };
  }, [enabled]);
  return icons;
}

export default function TabsLayout() {
  const status = useSession((s) => s.status);
  const me = useMe(status === 'signedIn');
  const live = !!me.data?.isLive;
  const inbox = useInbox();
  const connections = useConnections(live);
  const nativeIcons = useNativeTabIcons(NATIVE_GLASS_TABS);
  // Ask for push permission once the person is in the app (not during sign-up or onboarding).
  usePushRegistration(live);

  if (status === 'signedOut') return <Redirect href="/(auth)/welcome" />;
  if (status === 'loading' || me.isLoading) return <LoadingState />;
  if (me.data && !live) return <Redirect href="/onboarding" />;

  const inboxBadge = inbox.data
    ? inbox.data.lockedCount + inbox.data.connectRequests.length || undefined
    : undefined;
  const connectionsBadge = connections.data
    ? connections.data.filter((c) => c.isNew || c.expiry.state === 'you_owe_reply').length || undefined
    : undefined;
  const firstPhoto = me.data?.posts
    .filter((p) => p.kind === 'photo' && p.mediaUrl)
    .sort((a, b) => a.position - b.position)[0];
  const avatar = me.data ? { name: me.data.displayName ?? 'You', url: firstPhoto?.mediaUrl ?? null } : undefined;

  const badges: Record<string, number | undefined> = { inbox: inboxBadge, connections: connectionsBadge };

  if (NATIVE_GLASS_TABS) {
    return (
      <>
        <ConnectedMomentWatcher enabled={live} />
        <NativeTabs tintColor={theme.editorial.colors.accent}>
          {TABS.map((t) => (
            <NativeTabs.Trigger key={t.name} name={t.name}>
              <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
              {nativeIcons?.[t.name] ? (
                // 'template': iOS tints the icon like the label (clay when selected, label colour otherwise).
                <NativeTabs.Trigger.Icon renderingMode="template" src={nativeIcons[t.name]} />
              ) : null}
              {badges[t.name] ? <NativeTabs.Trigger.Badge>{String(badges[t.name])}</NativeTabs.Trigger.Badge> : null}
            </NativeTabs.Trigger>
          ))}
        </NativeTabs>
      </>
    );
  }

  return (
    <>
    <ConnectedMomentWatcher enabled={live} />
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <GlassTabBar {...props} tabs={TABS} avatar={avatar} />}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.label,
            tabBarBadge: t.name === 'inbox' ? inboxBadge : t.name === 'connections' ? connectionsBadge : undefined,
          }}
        />
      ))}
    </Tabs>
    </>
  );
}
