import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { theme } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
          borderBottomWidth: 1,
          borderBottomColor: '#EAE6DC',
        },
        headerTitleStyle: {
          fontSize: theme.typography.fontSize.md,
          fontWeight: '700',
          color: theme.colors.ink,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: '#EAE6DC',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme.colors.brand,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          headerTitle: 'Perspective',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🧭</Text>,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          headerTitle: 'Perspectives Inbox',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📥</Text>,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          headerTitle: 'New Request',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>➕</Text>,
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: 'Connections',
          headerTitle: 'Connections',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💬</Text>,
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          headerTitle: 'Your Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
