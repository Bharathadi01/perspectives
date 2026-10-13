import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface ModerationStateBannerProps {
  state: 'pending' | 'allowed' | 'removed';
  message?: string;
}

export const ModerationStateBanner: React.FC<ModerationStateBannerProps> = ({
  state,
  message,
}) => {
  if (state === 'allowed') return null;

  const isPending = state === 'pending';
  const defaultText = isPending
    ? 'This request is currently under review by our community safety guidelines.'
    : 'This content was removed as it violated our constructive feedback policy.';

  return (
    <View style={[styles.banner, isPending ? styles.pending : styles.removed]}>
      <Text style={styles.text}>{message || defaultText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.control,
    marginVertical: theme.spacing.sm,
  },
  pending: {
    backgroundColor: '#FFF4E5',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
  },
  removed: {
    backgroundColor: '#FDECEC',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.danger,
  },
  text: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.ink,
    lineHeight: 20,
  },
});
