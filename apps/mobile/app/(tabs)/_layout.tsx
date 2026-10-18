import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ConnectedMomentWatcher } from '../../src/components/connect/ConnectedMomentWatcher';
import { LoadingState } from '../../src/components/ui/States';
import { useConnections, useInbox, useMe } from '../../src/features/hooks';
import { useSession } from '../../src/session/sessionStore';
import { theme } from '../../src/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'explore', title: 'Explore', icon: 'compass-outline', iconActive: 'compass' },
  { name: 'inbox', title: 'Inbox', icon: 'mail-outline', iconActive: 'mail' },
  { name: 'create', title: 'Your posts', icon: 'add-circle-outline', iconActive: 'add-circle' },
  { name: 'connections', title: 'Connections', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { name: 'you', title: 'You', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

export default function TabsLayout() {
  const status = useSession((s) => s.status);
  const me = useMe(status === 'signedIn');
  const live = !!me.data?.isLive;
  const inbox = useInbox();
  const connections = useConnections(live);

  if (status === 'signedOut') return <Redirect href="/(auth)/welcome" />;
  if (status === 'loading' || me.isLoading) return <LoadingState />;
  if (me.data && !live) return <Redirect href="/onboarding" />;

  const inboxBadge = inbox.data
    ? inbox.data.lockedCount + inbox.data.connectRequests.length || undefined
    : undefined;
  const connectionsBadge = connections.data
    ? connections.data.filter((c) => c.isNew || c.expiry.state === 'you_owe_reply').length || undefined
    : undefined;

  return (
    <>
    <ConnectedMomentWatcher enabled={live} />
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.colors.onDark,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarStyle: { backgroundColor: theme.colors.tabBar, borderTopWidth: 0, height: 64, paddingTop: 8 },
        tabBarBadgeStyle: { backgroundColor: theme.colors.brand, color: theme.colors.onDark },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarAccessibilityLabel: t.title,
            tabBarBadge: t.name === 'inbox' ? inboxBadge : t.name === 'connections' ? connectionsBadge : undefined,
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? t.iconActive : t.icon} size={26} color={String(color)} />,
          }}
        />
      ))}
    </Tabs>
    </>
  );
}
