import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PostForm } from '../../src/components/forms/PostForm';
import { Screen } from '../../src/components/ui/Screen';
import { Title } from '../../src/components/ui/Text';
import { theme } from '../../src/theme';

export default function NewPost() {
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" style={s.icon}>
          <Ionicons name="close" size={26} color={theme.colors.ink} />
        </Pressable>
        <Title style={s.title}>New post</Title>
        <View style={s.icon} />
      </View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <PostForm onCreated={() => router.back()} />
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
