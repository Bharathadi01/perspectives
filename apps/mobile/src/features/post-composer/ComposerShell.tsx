import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';

interface ComposerShellProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  stepIndex: number;
  stepCount: number;
  onBack: () => void;
  primary: {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    /** Dims the button but keeps it pressable, so the tap can say what is missing. */
    incomplete?: boolean;
  };
  secondary?: { title: string; onPress: () => void };
  children: React.ReactNode;
  /**
   * Sheets that open over this screen. They must render inside this modal: on
   * iOS a second modal cannot be presented from underneath one that is already
   * showing, so a sheet placed beside the shell silently never appears.
   */
  overlays?: React.ReactNode;
}

/**
 * The frame every composer step sits in.
 *
 * Full screen rather than a short sheet: Apple's guidance is that a sheet suits
 * one scoped task, and that a multi-step job like putting a photo together
 * belongs in a full-screen modal. One question per screen, one button to move
 * on, and the bar at the top shows how much is left.
 */
export function ComposerShell({
  visible,
  title,
  subtitle,
  stepIndex,
  stepCount,
  onBack,
  primary,
  secondary,
  children,
  overlays,
}: ComposerShellProps) {
  const insets = useSafeAreaInsets();
  const first = stepIndex === 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onBack}>
      <View style={[s.screen, { paddingTop: insets.top > 0 ? 0 : theme.spacing.md }]}>
        <View style={s.nav}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={first ? 'Close' : 'Back'}
            style={({ pressed }) => [s.navBtn, pressed && s.pressed]}
          >
            <Ionicons
              name={first ? 'close' : 'chevron-back'}
              size={theme.iconSize.xl}
              color={theme.colors.ink}
            />
          </Pressable>
          {stepCount > 1 ? (
            <Text style={s.stepLabel}>{`Step ${stepIndex + 1} of ${stepCount}`}</Text>
          ) : null}
        </View>

        <View style={s.head}>
          {stepCount > 1 ? (
            <View
              style={s.bar}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: stepCount, now: stepIndex + 1 }}
            >
              {Array.from({ length: stepCount }, (_, i) => (
                <View key={i} style={[s.barPiece, i <= stepIndex && s.barPieceOn]} />
              ))}
            </View>
          ) : null}
          <Text style={s.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
        </View>

        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>

        <View style={[s.foot, { paddingBottom: insets.bottom + theme.spacing.base }]}>
          <Button
            title={primary.title}
            onPress={primary.onPress}
            loading={primary.loading}
            disabled={primary.disabled}
            style={primary.incomplete ? s.incomplete : undefined}
          />
          {secondary ? (
            <Button title={secondary.title} variant="ghost" onPress={secondary.onPress} />
          ) : null}
        </View>
        {overlays}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: theme.spacing.sm,
    paddingRight: theme.spacing.base,
    paddingTop: theme.spacing.sm,
  },
  navBtn: {
    width: theme.touchTarget.min,
    height: theme.touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: theme.opacity.pressed },
  stepLabel: { ...theme.textStyles.callout, color: theme.colors.muted },
  incomplete: { opacity: theme.opacity.disabled },
  head: { paddingHorizontal: theme.spacing.base, paddingBottom: theme.spacing.base, gap: theme.spacing.sm },
  bar: { flexDirection: 'row', gap: theme.spacing.xs, marginBottom: theme.spacing.sm },
  barPiece: { flex: 1, height: 3, borderRadius: theme.radius.pill, backgroundColor: theme.colors.border },
  barPieceOn: { backgroundColor: theme.colors.ink },
  title: { ...theme.textStyles.display, fontSize: theme.typography.fontSize.xl, lineHeight: 30, color: theme.colors.ink },
  subtitle: { ...theme.textStyles.callout, fontSize: theme.typography.fontSize.base, color: theme.colors.muted },
  body: { paddingHorizontal: theme.spacing.base, paddingBottom: theme.spacing.xl, gap: theme.spacing.base },
  foot: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.xs,
    borderTopWidth: theme.borderWidth.hairline,
    borderTopColor: theme.colors.border,
  },
});
