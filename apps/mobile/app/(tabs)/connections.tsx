import { router } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Avatar, VerifiedBadge } from '../../src/components/profile/Avatar';
import { Screen } from '../../src/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/ui/States';
import { Title } from '../../src/components/ui/Text';
import { useConnections } from '../../src/features/hooks';
import { timeAgo } from '../../src/lib/labels';
import { theme } from '../../src/theme';

export default function Connections() {
  const connections = useConnections();

  if (connections.isLoading) return <LoadingState />;
  if (connections.isError || !connections.data) return <ErrorState error={connections.error} onRetry={() => void connections.refetch()} />;

  return (
    <Screen>
      <FlatList
        data={connections.data}
        keyExtractor={(c) => c.id}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={connections.isRefetching} onRefresh={() => void connections.refetch()} />}
        ListHeaderComponent={<Title style={s.title}>Connections</Title>}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No connections yet"
            description="Give someone a perspective and ask to connect. If they accept, your conversation starts here."
            actionTitle="Go to Explore"
            onAction={() => router.push('/(tabs)/explore')}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
            accessibilityRole="button"
            accessibilityLabel={`Conversation with ${item.partner.displayName}`}
            style={({ pressed }) => [s.row, pressed && s.pressed]}
          >
            <Avatar name={item.partner.displayName} url={item.partner.primaryPhotoUrl} size={56} />
            <View style={s.body}>
              <View style={s.nameRow}>
                <Text style={s.name}>{item.partner.displayName}</Text>
                {item.partner.verified ? <VerifiedBadge size={14} /> : null}
                <Text style={s.time}>{timeAgo(item.lastMessage?.createdAt ?? item.createdAt)}</Text>
              </View>
              <Text style={s.preview} numberOfLines={1}>
                {item.lastMessage ? item.lastMessage.text : `Connected over: “${item.origin.postPrompt}”`}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: theme.spacing.base, gap: theme.spacing.sm, flexGrow: 1 },
  title: { marginBottom: theme.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: theme.radius.media, padding: theme.spacing.md, minHeight: 72 },
  pressed: { opacity: 0.7 },
  body: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.ink },
  time: { marginLeft: 'auto', fontSize: theme.typography.fontSize.xs, color: theme.colors.muted },
  preview: { fontSize: theme.typography.fontSize.sm, color: theme.colors.muted },
});
