import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../lib/errors';
import { theme } from '../../theme';
import { Button } from './Button';
import type { IconName } from './IconButton';
import { Body, Heading, Muted } from './Text';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={s.center} accessibilityLabel={label} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={theme.colors.brand} />
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <View style={s.center}>
      <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.muted} />
      <Heading style={s.text}>That didn’t load</Heading>
      <Muted style={s.text}>{errorMessage(error)}</Muted>
      <Button title="Try again" variant="secondary" onPress={onRetry} />
    </View>
  );
}

interface EmptyStateProps {
  icon: IconName;
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionTitle, onAction }: EmptyStateProps) {
  return (
    <View style={s.center}>
      <View style={s.iconWrap}>
        <Ionicons name={icon} size={30} color={theme.colors.brand} />
      </View>
      <Heading style={s.text}>{title}</Heading>
      <Body style={[s.text, s.desc]}>{description}</Body>
      {actionTitle && onAction ? <Button title={actionTitle} onPress={onAction} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl, gap: theme.spacing.md },
  text: { textAlign: 'center' },
  desc: { color: theme.colors.muted },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
