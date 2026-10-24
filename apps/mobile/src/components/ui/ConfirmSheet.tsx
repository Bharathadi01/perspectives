import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Button } from './Button';
import { Sheet } from './Sheet';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  confirmTitle: string;
  onConfirm: () => void;
  onClose: () => void;
  destructive?: boolean;
  loading?: boolean;
}

/**
 * Confirmation for a destructive step. The app confirms in a sheet everywhere
 * else, so the editor's old blocking Alert is gone.
 */
export function ConfirmSheet({
  visible,
  title,
  subtitle,
  confirmTitle,
  onConfirm,
  onClose,
  destructive,
  loading,
}: ConfirmSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      <View style={s.actions}>
        <Button
          title={confirmTitle}
          variant={destructive ? 'danger' : 'primary'}
          loading={loading}
          onPress={onConfirm}
        />
        <Button title="Cancel" variant="secondary" onPress={onClose} disabled={loading} />
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  actions: { gap: theme.spacing.sm },
});
