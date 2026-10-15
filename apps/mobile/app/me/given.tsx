import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { PerspectiveCard } from '../../src/components/perspective/PerspectiveCard';
import { Screen } from '../../src/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/ui/States';
import { Muted, Title } from '../../src/components/ui/Text';
import { useGiven } from '../../src/features/hooks';
import { theme } from '../../src/theme';

/** Perspectives you gave. You see if someone thanked you, never whether they found it helpful. */
export default function Given() {
  const given = useGiven();
  if (given.isLoading) return <LoadingState />;
  if (given.isError || !given.data) return <ErrorState error={given.error} onRetry={() => void given.refetch()} />;

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={s.icon}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.ink} />
        </Pressable>
        <Title style={s.title}>Perspectives you gave</Title>
        <View style={s.icon} />
      </View>
      <FlatList
        data={given.data}
        keyExtractor={(p) => p.id}
        contentContainerStyle={s.content}
        ListEmptyComponent={
          <EmptyState icon="chatbubble-ellipses-outline" title="Nothing yet" description="Perspectives you give from Explore show up here." />
        }
        renderItem={({ item }) => (
          <PerspectiveCard
            person={item.owner}
            comment={item.comment}
            chips={item.chips}
            createdAt={item.createdAt}
            onPressPerson={() => router.push({ pathname: '/profile/[id]', params: { id: item.owner.id } })}
            footer={
              <View style={s.footer}>
                <Muted style={s.flex}>On “{item.post.prompt}”</Muted>
                {item.thanked ? <Text style={s.thanked}>Thanked you</Text> : null}
              </View>
            }
          />
        )}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.sm },
  icon: { width: theme.touchTarget.min, height: theme.touchTarget.min, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: theme.typography.fontSize.lg },
  content: { padding: theme.spacing.base, gap: theme.spacing.md, flexGrow: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  flex: { flex: 1 },
  thanked: { color: theme.colors.success, fontWeight: theme.typography.fontWeight.semibold, fontSize: theme.typography.fontSize.sm },
});
