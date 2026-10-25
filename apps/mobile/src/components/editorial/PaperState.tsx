import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

const e = theme.editorial;

/** Empty, closed and error screens for Connections, in the editorial look. */
export function PaperState({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.wrap}>
      {icon ? <View style={s.icon}>{icon}</View> : null}
      <Text style={s.title} accessibilityRole="header">
        {title}
      </Text>
      {body ? <Text style={s.body}>{body}</Text> : null}
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" style={({ pressed }) => [s.pill, pressed && s.pressed]}>
          <Text style={s.pillText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PaperLoading() {
  return (
    <View style={[s.wrap, s.loading]} accessibilityLabel="Loading">
      <ActivityIndicator color={e.colors.ink} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.xl, gap: theme.spacing.md },
  loading: { backgroundColor: e.colors.paper },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: e.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: e.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  title: { fontFamily: e.fonts.display, fontSize: 26, lineHeight: 32, color: e.colors.ink, textAlign: 'center' },
  body: { fontFamily: e.fonts.body, fontSize: 15, lineHeight: 22, color: e.colors.muted, textAlign: 'center', maxWidth: 300 },
  pill: {
    marginTop: theme.spacing.sm,
    minHeight: 48,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.pill,
    backgroundColor: e.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontFamily: e.fonts.bodySemibold, fontSize: 15, color: e.colors.onInk },
  pressed: { opacity: theme.opacity.pressed },
});
