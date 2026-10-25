import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';

const e = theme.editorial;

interface PaperSheetProps {
  visible: boolean;
  onClose: () => void;
  /** iOS: called once the sheet has fully gone, the safe moment to open another modal. */
  onDismiss?: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

/** A bottom sheet in the editorial look: paper, a Fraunces title, nothing else. */
export function PaperSheet({ visible, onClose, onDismiss, title, subtitle, children }: PaperSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onDismiss={onDismiss}>
      <View style={s.wrap}>
        <Pressable style={s.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={[s.sheet, { paddingBottom: insets.bottom + theme.spacing.base }]} accessibilityViewIsModal>
          <View style={s.handle} />
          {title ? (
            <Text style={s.title} accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
          <View style={s.content}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

/** One full-width action in a PaperSheet. */
export function SheetAction({
  label,
  onPress,
  icon,
  tone = 'plain',
  disabled,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  tone?: 'plain' | 'danger' | 'primary';
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        s.action,
        tone === 'primary' && s.actionPrimary,
        tone === 'danger' && s.actionDanger,
        (pressed || disabled) && s.pressed,
      ]}
    >
      {icon}
      <Text style={[s.actionText, tone !== 'plain' && s.actionTextOnFill, tone === 'plain' && icon ? s.actionTextLeft : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(36,29,21,0.42)' },
  sheet: {
    backgroundColor: e.colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: theme.spacing.lg - 4,
    paddingTop: theme.spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: e.colors.line,
    marginBottom: theme.spacing.base,
  },
  title: { fontFamily: e.fonts.display, fontSize: 24, lineHeight: 30, color: e.colors.ink },
  subtitle: { fontFamily: e.fonts.body, fontSize: 15, lineHeight: 21, color: e.colors.muted, marginTop: theme.spacing.sm },
  content: { marginTop: theme.spacing.base, gap: theme.spacing.xs },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    minHeight: 52,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.base,
  },
  actionPrimary: { backgroundColor: e.colors.ink },
  actionDanger: { backgroundColor: e.colors.accent },
  pressed: { opacity: theme.opacity.pressed },
  actionText: { fontFamily: e.fonts.bodySemibold, fontSize: 16, color: e.colors.ink },
  actionTextOnFill: { color: e.colors.onInk },
  actionTextLeft: { flex: 1 },
});
