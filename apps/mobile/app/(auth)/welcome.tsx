import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { Muted } from '../../src/components/ui/Text';
import { theme } from '../../src/theme';

export default function Welcome() {
  return (
    <Screen edges={['top', 'bottom']} style={s.screen}>
      <View style={s.hero}>
        <Text style={s.brand} accessibilityRole="header">
          Perspective
        </Text>
        <Text style={s.tagline}>See yourself through other people’s eyes, and connect through what you notice.</Text>
        <Muted style={s.note}>Honest perspectives from verified adults. Give a few each day to unlock yours.</Muted>
      </View>
      <View style={s.actions}>
        <Button title="Create account" onPress={() => router.push('/(auth)/signup')} />
        <Button title="I already have an account" variant="secondary" onPress={() => router.push('/(auth)/login')} />
        <Muted style={s.legal}>18+ only. By continuing you agree to the Terms and Community Guidelines.</Muted>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  screen: { padding: theme.spacing.lg, justifyContent: 'space-between' },
  hero: { flex: 1, justifyContent: 'center', gap: theme.spacing.base },
  brand: { fontSize: 44, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.ink },
  tagline: { fontSize: theme.typography.fontSize.question, lineHeight: 36, color: theme.colors.ink },
  note: { fontSize: theme.typography.fontSize.base },
  actions: { gap: theme.spacing.md },
  legal: { textAlign: 'center', fontSize: theme.typography.fontSize.xs },
});
