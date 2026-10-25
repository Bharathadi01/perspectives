import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ListGroup } from '../../src/components/ui/ListGroup';
import { ListRow } from '../../src/components/ui/ListRow';
import { Screen } from '../../src/components/ui/Screen';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { feedSummary } from '../../src/features/filters/audienceUpdate';
import { useMe } from '../../src/features/hooks';
import { theme } from '../../src/theme';

/**
 * Explore → filter button. Everything that changes who you see, one row each, with its current value.
 * The same settings as Settings → Your feed and Your goal; only the way in is new.
 */
export default function FeedFilters() {
  const me = useMe();

  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;

  const summary = feedSummary(me.data);

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.header}>
        <Text style={s.title} accessibilityRole="header">
          Your feed
        </Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={({ pressed }) => [s.close, pressed && s.pressed]}
        >
          <Ionicons name="close" size={theme.iconSize.xl} color={theme.colors.ink} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <ListGroup title="Who you see">
          <ListRow
            title="Show me"
            subtitle={summary.showMe}
            accessibilityLabel={`Show me: ${summary.showMe}`}
            onPress={() => router.push('/filters/show-me')}
          />
          <ListRow
            title="Age range"
            subtitle={summary.age}
            accessibilityLabel={`Age range: ${summary.age}`}
            onPress={() => router.push('/filters/age')}
          />
        </ListGroup>
        <ListGroup title="Just for you" footer="Only you see this. In the beta it only changes how we word things.">
          <ListRow
            title="Your goal"
            subtitle={summary.goal}
            accessibilityLabel={`Your goal: ${summary.goal}`}
            onPress={() => router.push('/filters/goal')}
          />
        </ListGroup>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.touchTarget.min + theme.spacing.base,
    borderBottomWidth: theme.borderWidth.hairline,
    borderBottomColor: theme.colors.border,
  },
  title: { ...theme.textStyles.title, color: theme.colors.ink },
  close: {
    position: 'absolute',
    right: theme.spacing.base,
    width: theme.touchTarget.min,
    height: theme.touchTarget.min,
    borderRadius: theme.touchTarget.min / 2,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: theme.opacity.pressed },
  content: { padding: theme.spacing.base, paddingBottom: theme.spacing.xxl, gap: theme.spacing.lg },
});
