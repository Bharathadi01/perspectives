import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ConnectedMomentWatcher } from '../../src/components/connect/ConnectedMomentWatcher';
import { GlassTabBar, type GlassTab } from '../../src/components/ui/GlassTabBar';
import { LoadingState } from '../../src/components/ui/States';
import { useConnections, useInbox, useMe } from '../../src/features/hooks';
import { usePushRegistration } from '../../src/push/push';
import { useSession } from '../../src/session/sessionStore';

/** The floating glass tab bar's tabs (2026-10-25). "You" shows your first photo when there is one. */
const TABS: GlassTab[] = [
  { name: 'explore', label: 'Explore', icon: 'compass-outline', iconActive: 'compass' },
  { name: 'inbox', label: 'Inbox', icon: 'mail-outline', iconActive: 'mail' },
  { name: 'create', label: 'Your posts', icon: 'add-circle-outline', iconActive: 'add-circle' },
  { name: 'connections', label: 'Connections', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { name: 'you', label: 'You', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

export default function TabsLayout() {
  const status = useSession((s) => s.status);
  const me = useMe(status === 'signedIn');
  const live = !!me.data?.isLive;
  const inbox = useInbox();
  const connections = useConnections(live);
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
