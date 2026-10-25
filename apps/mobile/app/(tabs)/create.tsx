import { CATEGORY_CATALOG, Post, RULES } from '@perspective/contracts';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { PostCard } from '../../src/components/profile/PostCard';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { Sheet } from '../../src/components/ui/Sheet';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { Label, Muted, Title } from '../../src/components/ui/Text';
import { useToast } from '../../src/components/ui/Toast';
import { useMe, useRemovePost } from '../../src/features/hooks';
import { errorMessage } from '../../src/lib/errors';
import { useTabBarSpace } from '../../src/components/ui/GlassTabBar';
import { theme } from '../../src/theme';

/** Your posts: up to six; the first is your primary photo. */
export default function YourPosts() {
  const me = useMe();
  const space = useTabBarSpace();
  const remove = useRemovePost();
  const toast = useToast();
  const [toRemove, setToRemove] = useState<Post | null>(null);

  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;
  const posts = me.data.posts;

  const confirmRemove = async () => {
    if (!toRemove) return;
    try {
      await remove.run(toRemove.id);
      toast('Post removed.', 'info');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setToRemove(null);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: space + theme.spacing.xxl }]}>
        <Title>Your posts</Title>
        <Muted>
          {posts.length} of {RULES.maxPosts}. People give perspectives on one post at a time, so variety helps.
        </Muted>
        {posts.length < RULES.maxPosts ? <Button title="Add a post" onPress={() => router.push('/post/new')} /> : null}
        {posts.map((post, i) => (
          <View key={post.id} style={s.item}>
            <Label>
              {i === 0 ? 'Primary photo' : `Post ${i + 1}`} · {CATEGORY_CATALOG[post.category].label}
            </Label>
            <PostCard post={post} />
            <Button title="Remove" variant="ghost" onPress={() => setToRemove(post)} />
          </View>
        ))}
      </ScrollView>
      <Sheet visible={!!toRemove} onClose={() => setToRemove(null)} title="Remove this post?" subtitle="Perspectives you already received on it stay in your inbox.">
        <Button title="Remove post" variant="danger" onPress={() => void confirmRemove()} loading={remove.isPending} />
        <Button title="Cancel" variant="secondary" onPress={() => setToRemove(null)} />
      </Sheet>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: theme.spacing.base, gap: theme.spacing.base, paddingBottom: theme.spacing.xxl },
  item: { gap: theme.spacing.sm },
});
