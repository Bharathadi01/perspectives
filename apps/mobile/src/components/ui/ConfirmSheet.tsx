import React from 'react';
import { ActivityIndicator } from 'react-native';
import { theme } from '../../theme';
import { PaperSheet, SheetAction } from '../editorial/PaperSheet';

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
 * else, so the editor's old blocking Alert is gone. In the editorial paper sheet
 * since 2026-10-31: a clay button for something destructive, ink otherwise.
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
    <PaperSheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      <SheetAction
        label={loading ? `${confirmTitle}…` : confirmTitle}
        tone={destructive ? 'danger' : 'primary'}
        disabled={loading}
        icon={loading ? <ActivityIndicator color={theme.editorial.colors.onInk} /> : undefined}
        onPress={onConfirm}
      />
      <SheetAction label="Cancel" onPress={onClose} disabled={loading} />
    </PaperSheet>
  );
}
