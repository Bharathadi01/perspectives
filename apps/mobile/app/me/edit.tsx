import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AudienceForm } from '../../src/components/forms/AudienceForm';
import { BasicsForm } from '../../src/components/forms/BasicsForm';
import { Screen } from '../../src/components/ui/Screen';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { Title } from '../../src/components/ui/Text';
import { useToast } from '../../src/components/ui/Toast';
import { useMe } from '../../src/features/hooks';
import { theme } from '../../src/theme';

export default function EditProfile() {
  const { section } = useLocalSearchParams<{ section?: 'basics' | 'audience' }>();
  const me = useMe();
  const toast = useToast();

  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;
  const done = () => {
    toast('Saved.', 'success');
    router.back();
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={s.icon}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.ink} />
        </Pressable>
        <Title style={s.title}>{section === 'audience' ? 'Who sees you' : 'Basics'}</Title>
        <View style={s.icon} />
      </View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {section === 'audience' ? <AudienceForm me={me.data} onSaved={done} /> : <BasicsForm me={me.data} onSaved={done} />}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.sm },
  icon: { width: theme.touchTarget.min, height: theme.touchTarget.min, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: theme.typography.fontSize.lg },
  content: { padding: theme.spacing.base, paddingBottom: theme.spacing.xxl },
});
