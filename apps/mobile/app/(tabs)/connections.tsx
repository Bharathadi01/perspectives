import { router } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTabBarSpace } from '../../src/components/ui/GlassTabBar';
import { ConversationRow } from '../../src/features/connections/components/ConversationRow';
import { PaperLoading, PaperState } from '../../src/components/editorial/PaperState';
import { ChatsCircleIcon, WarningCircleIcon } from '../../src/features/connections/icons';
import { isYourTurn } from '../../src/features/connections/thread';
import { useConnections } from '../../src/features/hooks';
import { theme } from '../../src/theme';

const e = theme.editorial;

/** One quiet line under the title: how many conversations are waiting on you. */
function summary(yourTurn: number): string {
  if (yourTurn === 0) return 'You’re all caught up.';
  return yourTurn === 1 ? 'Your move in one conversation.' : `Your move in ${yourTurn} conversations.`;
}

export default function Connections() {
  const connections = useConnections();
  const space = useTabBarSpace();

  if (connections.isLoading) return <PaperLoading />;

  const data = connections.data ?? [];
  const yourTurn = data.filter(isYourTurn).length;

  return (
    <SafeAreaView edges={['top']} style={s.screen}>
      {connections.isError ? (
        <PaperState
          icon={<WarningCircleIcon size={30} color={e.colors.ink} />}
          title="Couldn’t load your connections"
          body="Check your connection and try again."
          action="Try again"
          onAction={() => void connections.refetch()}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(c) => c.id}
          contentContainerStyle={[s.content, { paddingBottom: space + theme.spacing.base }]}
          refreshControl={
            <RefreshControl refreshing={connections.isRefetching} onRefresh={() => void connections.refetch()} tintColor={e.colors.ink} />
          }
          ListHeaderComponent={
            <View style={s.header}>
              <Text style={s.title} accessibilityRole="header">
                Connections
              </Text>
              {data.length > 0 ? <Text style={s.summary}>{summary(yourTurn)}</Text> : null}
            </View>
          }
          ListEmptyComponent={
            <PaperState
              icon={<ChatsCircleIcon size={32} color={e.colors.ink} />}
              title="No connections yet"
              body="Give someone a perspective and ask to connect. If they give one back, your conversation starts here."
              action="Go to Explore"
              onAction={() => router.push('/(tabs)/explore')}
            />
          }
          renderItem={({ item, index }) => (
            <ConversationRow
              connection={item}
              last={index === data.length - 1}
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: e.colors.paper },
  content: { flexGrow: 1 },
  header: { paddingHorizontal: theme.spacing.lg - 4, paddingTop: theme.spacing.base, paddingBottom: theme.spacing.md },
  title: { fontFamily: e.fonts.display, fontSize: 34, lineHeight: 40, color: e.colors.ink, letterSpacing: -0.4 },
  summary: { fontFamily: e.fonts.body, fontSize: 14, lineHeight: 20, color: e.colors.muted, marginTop: 4 },
});
