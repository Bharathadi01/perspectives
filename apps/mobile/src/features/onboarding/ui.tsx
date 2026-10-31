import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selection } from '../../lib/haptics';
import { theme } from '../../theme';
import { Animate, Pop, PulseRing, Rise, Tap, keyframes } from './motion';

const e = theme.editorial;
const c = e.colors;
const f = e.fonts;

/**
 * For text fields whose card already marks focus. Browsers draw their own blue ring with
 * `outline-style: auto`, which ignores a zero width; a solid zero-width outline draws nothing.
 * Native platforms have no outline, so this changes nothing there.
 */
export const NO_WEB_OUTLINE = { outlineStyle: 'solid', outlineWidth: 0 } as const;

/** Side padding of the title block and the content, as in the design. */
export const GUTTER = theme.spacing.lg;
const TITLE_GUTTER = theme.spacing.lg + theme.spacing.xs;

export const ob = StyleSheet.create({
  title: {
    fontFamily: f.display,
    fontSize: 31,
    lineHeight: 37,
    letterSpacing: -0.4,
    color: c.ink,
    textAlign: 'center',
  },
  subtitle: { fontFamily: f.body, fontSize: 14, lineHeight: 21, color: c.muted, textAlign: 'center' },
  bigTitle: {
    fontFamily: f.display,
    fontSize: 33,
    lineHeight: 39,
    letterSpacing: -0.4,
    color: c.ink,
    textAlign: 'center',
  },
  body: { fontFamily: f.body, fontSize: 16, lineHeight: 24, color: c.ink, textAlign: 'center' },
  bodyMuted: { fontFamily: f.body, fontSize: 15, lineHeight: 22, color: c.muted, textAlign: 'center' },
  overline: { fontFamily: f.bodySemibold, fontSize: 12, letterSpacing: 0.6, color: c.muted, textTransform: 'uppercase' },
  clayLabel: { fontFamily: f.bodyBold, fontSize: 11, letterSpacing: 0.6, color: c.accentText, textTransform: 'uppercase' },
  card: {
    backgroundColor: c.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    borderRadius: 18,
  },
  error: { fontFamily: f.bodyMedium, fontSize: 14, lineHeight: 20, color: theme.colors.danger, textAlign: 'center' },
});

// ---------- the top of a step ----------

let lastProgress = 0;

/** The thin bar across the top. It fills on from where the previous step left it. */
export function ProgressBar({ value }: { value: number }) {
  const from = useRef(lastProgress).current;
  useEffect(() => {
    lastProgress = value;
  }, [value]);
  const start = value > 0 ? Math.min(1, from / value) : 1;
  return (
    <View
      style={s.track}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Profile setup"
      accessibilityValue={{ min: 0, max: 100, now: value }}
    >
      <Animate frames={keyframes.growX(start)} duration={1000} delay={100} style={[s.fill, { width: `${value}%` }]} />
    </View>
  );
}

export function BackButton({ onPress, label = 'Back', icon = 'chevron-back' }: { onPress?: () => void; label?: string; icon?: 'chevron-back' | 'close' }) {
  return (
    <Tap
      onPress={onPress ?? (() => router.canGoBack() && router.back())}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={s.iconTap}
    >
      <Ionicons name={icon} size={24} color={c.ink} />
    </Tap>
  );
}

export function SkipPill({ onPress }: { onPress: () => void }) {
  return (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel="Skip" hitSlop={7} style={s.skip}>
      <Text style={s.skipText}>Skip</Text>
    </Tap>
  );
}

// ---------- the bottom of a step ----------

export function PrivacyNote({ text, icon, tone = 'ink' }: { text: string; icon: 'eye' | 'lock'; tone?: 'ink' | 'muted' }) {
  const color = tone === 'muted' ? c.muted : c.ink;
  // A private answer gets the clay lock, so "only you" reads at a glance.
  const iconColor = icon === 'lock' && tone === 'ink' ? c.accent : color;
  return (
    <View style={s.note}>
      <Ionicons name={icon === 'eye' ? 'eye-outline' : 'lock-closed-outline'} size={18} color={iconColor} />
      <Text style={[s.noteText, { color }]}>{text}</Text>
    </View>
  );
}

export const SHOWN = { text: 'Shown on your profile', icon: 'eye' } as const;
export const ONLY_YOU = { text: 'Only you see this', icon: 'lock' } as const;

/** The round ink "next" button: pops in, then pulses twice to say "this way". */
export function NextButton({
  onPress,
  disabled,
  loading,
  label = 'Next',
  delay = 500,
}: {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  delay?: number;
}) {
  const ready = !disabled && !loading;
  // The pulse runs once the button can be used: on arrival, or later when the answer is filled in.
  const readyAtStart = useRef(ready).current;
  return (
    <Pop delay={delay} duration={550} style={s.nextWrap}>
      {ready ? <PulseRing key="pulse" width={56} height={56} radius={28} delay={readyAtStart ? delay + 800 : 150} /> : null}
      <Tap
        onPress={onPress}
        disabled={!ready}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !ready, busy: !!loading }}
        style={[s.next, !ready && !loading && s.disabled]}
      >
        {loading ? (
          <ActivityIndicator color={c.onInk} />
        ) : (
          <Ionicons name="chevron-forward" size={24} color={c.onInk} />
        )}
      </Tap>
    </Pop>
  );
}

/** A full pill button ("Continue", "Let's go"). Rises in, then pulses to draw the eye. */
export function PillButton({
  label,
  onPress,
  variant = 'ink',
  delay = 0,
  pulseDelay,
  pulses = 2,
  loading,
  disabled,
  icon,
  wide,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'ink' | 'outline';
  delay?: number;
  /** When to start pulsing; no pulse when left out. */
  pulseDelay?: number;
  pulses?: number | 'infinite';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Stretch to the full width. */
  wide?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const ink = variant === 'ink';
  const ready = !disabled && !loading;
  return (
    <Rise delay={delay} duration={600} style={[wide ? s.wide : s.centered, style]}>
      <Pulsing active={ready && pulseDelay !== undefined} radius={26} delay={pulseDelay} iterations={pulses}>
        <Tap
          onPress={onPress}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: !ready, busy: !!loading }}
          style={[s.pill, ink ? s.pillInk : s.pillOutline, wide && s.pillWide, !ready && !loading && s.disabled]}
        >
          {loading ? (
            <ActivityIndicator color={ink ? c.onInk : c.ink} />
          ) : (
            <>
              {icon ? <Ionicons name={icon} size={20} color={ink ? c.onInk : c.ink} /> : null}
              <Text style={[s.pillText, { color: ink ? c.onInk : c.ink }]}>{label}</Text>
            </>
          )}
        </Tap>
      </Pulsing>
    </Rise>
  );
}

/** Wraps a button and pulses a ring out of it, sized to the button once it is laid out. */
export function Pulsing({
  active,
  radius,
  delay,
  iterations,
  duration,
  style,
  children,
}: {
  active: boolean;
  radius: number;
  delay?: number;
  iterations?: number | 'infinite';
  duration?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View
      style={style}
      onLayout={(ev) => {
        const { width, height } = ev.nativeEvent.layout;
        if (width !== size.width || height !== size.height) setSize({ width, height });
      }}
    >
      {active ? (
        <PulseRing width={size.width} height={size.height} radius={radius} delay={delay} iterations={iterations} duration={duration} />
      ) : null}
      {children}
    </View>
  );
}

/** A plain text button, for "I already have an account" and "Not now". */
export function TextButton({ label, onPress, underline }: { label: string; onPress: () => void; underline?: boolean }) {
  return (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={s.textButton}>
      <Text style={[s.textButtonText, underline && s.underline]}>{label}</Text>
    </Tap>
  );
}

// ---------- the shell ----------

export interface StepScreenProps {
  title: string;
  subtitle?: string;
  /** 0 to 100; no bar when left out. */
  progress?: number;
  /** Show the back chevron (default true). */
  back?: boolean;
  onBack?: () => void;
  onSkip?: () => void;
  note?: { text: string; icon: 'eye' | 'lock'; tone?: 'ink' | 'muted' } | React.ReactNode;
  next?: { onPress: () => void; disabled?: boolean; loading?: boolean; label?: string; delay?: number };
  /** Something else at the bottom instead of the note and next button. */
  footer?: React.ReactNode;
  /** Error to show above the footer. */
  error?: string | null;
  /** Content scrolls (default) or is fixed. */
  scroll?: boolean;
  titleGap?: number;
  children?: React.ReactNode;
}

/**
 * One onboarding question: progress bar, back and skip, a big Fraunces question, the answer, and
 * a footer that says who sees it plus the round next button. The footer rides above the keyboard.
 */
export function StepScreen({
  title,
  subtitle,
  progress,
  back = true,
  onBack,
  onSkip,
  note,
  next,
  footer,
  error,
  scroll = true,
  children,
}: StepScreenProps) {
  const insets = useSafeAreaInsets();
  const body = (
    <>
      <View style={s.titleBlock}>
        <Rise>
          <Text style={ob.title} accessibilityRole="header">
            {title}
          </Text>
        </Rise>
        {subtitle ? (
          <Rise delay={80}>
            <Text style={ob.subtitle}>{subtitle}</Text>
          </Rise>
        ) : null}
      </View>
      {children}
    </>
  );
  const noteNode =
    note && typeof note === 'object' && 'text' in (note as object) ? (
      <PrivacyNote {...(note as { text: string; icon: 'eye' | 'lock'; tone?: 'ink' | 'muted' })} />
    ) : (
      (note as React.ReactNode) ?? <View />
    );
  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {progress !== undefined ? <ProgressBar value={progress} /> : null}
        <View style={s.header}>
          {back ? <BackButton onPress={onBack} /> : <View />}
          {onSkip ? <SkipPill onPress={onSkip} /> : null}
        </View>
        {scroll ? (
          <ScrollView
            style={s.flex}
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        ) : (
          <View style={[s.flex, s.scroll]}>{body}</View>
        )}
        {error ? (
          <Rise duration={300} distance={8}>
            <Text style={[ob.error, s.errorText]} accessibilityLiveRegion="polite" accessibilityRole="alert">
              {error}
            </Text>
          </Rise>
        ) : null}
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, theme.spacing.base) + theme.spacing.base }]}>
          {footer ? (
            <View style={s.footerCustom}>{footer}</View>
          ) : (
            <>
              {noteNode}
              {next ? <NextButton {...next} /> : null}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ---------- answers ----------

/** A white input card with a small label, outlined in ink while focused. */
export function FieldCard({
  label,
  delay = 160,
  right,
  big,
  count,
  style,
  ...input
}: TextInputProps & {
  label: string;
  delay?: number;
  right?: React.ReactNode;
  /** Fraunces, for questions and answers people write. */
  big?: boolean;
  /** "49 / 150" under the text. */
  count?: string;
  style?: StyleProp<ViewStyle>;
  /** Reaches the text field, to move focus along (React 19 passes refs as props). */
  ref?: React.Ref<React.ComponentRef<typeof TextInput>>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Rise delay={delay} style={style}>
      <View style={[s.field, focused ? s.fieldFocused : null]}>
        <View style={s.flex}>
          <Text style={s.fieldLabel}>{label}</Text>
          <TextInput
            {...input}
            accessibilityLabel={input.accessibilityLabel ?? label}
            placeholderTextColor={c.muted}
            onFocus={(ev) => {
              setFocused(true);
              input.onFocus?.(ev);
            }}
            onBlur={(ev) => {
              setFocused(false);
              input.onBlur?.(ev);
            }}
            style={[s.fieldInput, big && s.fieldInputBig, input.multiline && s.fieldMultiline]}
          />
          {count ? <Text style={s.count}>{count}</Text> : null}
        </View>
        {right}
      </View>
    </Rise>
  );
}

/** A full-width choice row with a radio dot or a check box on the right. */
export function OptionRow({
  label,
  description,
  selected,
  onPress,
  kind,
  big,
  compact,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  kind: 'radio' | 'check';
  /** Fraunces title with a description, as on the goal question. */
  big?: boolean;
  /** Two to a row (orientation). */
  compact?: boolean;
}) {
  return (
    <Tap
      onPress={() => {
        selection();
        onPress();
      }}
      accessibilityRole={kind === 'radio' ? 'radio' : 'checkbox'}
      accessibilityState={kind === 'radio' ? { selected } : { checked: selected }}
      accessibilityLabel={description ? `${label}. ${description}` : label}
      style={[s.option, compact && s.optionCompact, big && s.optionBig, selected && s.optionOn]}
    >
      {big ? (
        <View style={s.optionText}>
          <Text style={s.optionTitleBig}>{label}</Text>
          {description ? <Text style={s.optionDescription}>{description}</Text> : null}
        </View>
      ) : (
        <Text style={[s.optionLabel, compact && s.optionLabelCompact]} numberOfLines={2}>
          {label}
        </Text>
      )}
      {kind === 'radio' ? <RadioDot on={selected} small={compact} /> : <CheckBox on={selected} big={big} />}
    </Tap>
  );
}

function RadioDot({ on, small }: { on: boolean; small?: boolean }) {
  const size = small ? 20 : 22;
  return (
    <View style={[s.radio, { width: size, height: size, borderRadius: size / 2 }, on && s.radioOn]}>
      {on ? (
        <Pop from={0} overshoot={1.3} duration={400} style={s.radioDot}>
          <View />
        </Pop>
      ) : null}
    </View>
  );
}

export function CheckBox({ on, big }: { on: boolean; big?: boolean }) {
  const size = big ? 24 : 22;
  return (
    <View style={[s.check, { width: size, height: size, borderRadius: big ? 7 : 6 }, on && s.checkOn]}>
      {on ? (
        <Pop from={0.4} overshoot={1.2} duration={300}>
          <Ionicons name="checkmark" size={big ? 17 : 16} color={c.onInk} />
        </Pop>
      ) : null}
    </View>
  );
}

/** A pill you can pick: ink when chosen. */
export function ChoiceChip({
  label,
  selected,
  onPress,
  size = 'md',
  role = 'button',
  dashed,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  size?: 'lg' | 'md' | 'sm';
  role?: 'radio' | 'checkbox' | 'button';
  dashed?: boolean;
}) {
  return (
    <Tap
      onPress={() => {
        selection();
        onPress();
      }}
      accessibilityRole={role}
      accessibilityState={role === 'checkbox' ? { checked: selected } : { selected }}
      accessibilityLabel={label}
      style={[s.chip, s[`chip_${size}`], selected && s.chipOn, dashed && s.chipDashed]}
    >
      <Text style={[s.chipText, size === 'lg' && s.chipTextLg, selected && s.chipTextOn]}>{label}</Text>
    </Tap>
  );
}

/** Children appear one after another, the way option lists do in the design. */
export function Stagger({
  children,
  start = 160,
  step = 50,
  kind = 'rise',
  style,
  itemStyle,
}: {
  children: React.ReactNode;
  start?: number;
  step?: number;
  kind?: 'rise' | 'pop';
  style?: StyleProp<ViewStyle>;
  itemStyle?: StyleProp<ViewStyle>;
}) {
  const items = React.Children.toArray(children);
  return (
    <View style={style}>
      {items.map((child, i) =>
        kind === 'pop' ? (
          <Pop key={(child as React.ReactElement).key ?? i} delay={start + i * step} duration={450} style={itemStyle}>
            {child}
          </Pop>
        ) : (
          <Rise key={(child as React.ReactElement).key ?? i} delay={start + i * step} duration={600} style={itemStyle}>
            {child}
          </Rise>
        ),
      )}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: c.paper },
  track: { height: 3, backgroundColor: c.line },
  fill: { height: 3, backgroundColor: c.ink, transformOrigin: 'left' },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
  },
  iconTap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  skip: {
    height: 34,
    paddingHorizontal: 14,
    marginRight: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    backgroundColor: c.surface,
    justifyContent: 'center',
  },
  skipText: { fontFamily: f.bodySemibold, fontSize: 14, color: c.ink },
  scroll: { paddingBottom: theme.spacing.lg },
  titleBlock: { paddingHorizontal: TITLE_GUTTER, paddingTop: theme.spacing.base, gap: theme.spacing.md },
  errorText: { paddingHorizontal: GUTTER, paddingBottom: theme.spacing.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  footerCustom: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.md },
  note: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexShrink: 1 },
  noteText: { fontFamily: f.bodyMedium, fontSize: 14, flexShrink: 1 },
  nextWrap: { width: 56, height: 56 },
  next: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: theme.opacity.disabled },
  centered: { alignSelf: 'center' },
  wide: { alignSelf: 'stretch' },
  pill: {
    height: 52,
    paddingHorizontal: 34,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm + 2,
  },
  pillWide: { height: 54 },
  pillInk: { backgroundColor: c.ink },
  pillOutline: { borderWidth: theme.borderWidth.hairline, borderColor: c.ink },
  pillText: { fontFamily: f.bodySemibold, fontSize: 16 },
  textButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.base },
  textButtonText: { fontFamily: f.bodySemibold, fontSize: 15, color: c.ink },
  underline: { textDecorationLine: 'underline', fontSize: 14 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: c.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    borderRadius: 16,
    paddingVertical: theme.spacing.md,
    paddingLeft: theme.spacing.base,
    paddingRight: theme.spacing.sm,
    // Keep the outline width steady so the text never shifts when the border thickens.
    margin: 0.5,
  },
  fieldFocused: { borderColor: c.ink, borderWidth: theme.borderWidth.thick, margin: 0 },
  fieldLabel: { fontFamily: f.bodyMedium, fontSize: 12, color: c.muted, marginBottom: theme.spacing.xs },
  fieldInput: { fontFamily: f.body, fontSize: 17, lineHeight: 24, color: c.ink, padding: 0, minHeight: 24, ...NO_WEB_OUTLINE },
  fieldInputBig: { fontFamily: f.display, fontSize: 20, lineHeight: 26 },
  fieldMultiline: { textAlignVertical: 'top' },
  count: { alignSelf: 'flex-end', fontFamily: f.body, fontSize: 12, color: c.muted, marginTop: theme.spacing.xs },
  option: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    backgroundColor: c.surface,
    borderWidth: theme.borderWidth.thick,
    borderColor: c.line,
    borderRadius: 16,
    paddingHorizontal: 18,
  },
  optionCompact: { minHeight: 52, borderRadius: 14, paddingHorizontal: 14, gap: theme.spacing.sm },
  optionBig: { alignItems: 'flex-start', borderRadius: 18, padding: 18 },
  optionOn: { borderColor: c.ink },
  optionLabel: { flex: 1, fontFamily: f.bodyMedium, fontSize: 16, color: c.ink },
  optionLabelCompact: { fontSize: 15 },
  optionText: { flex: 1, gap: 6 },
  optionTitleBig: { fontFamily: f.display, fontSize: 21, lineHeight: 26, color: c.ink },
  optionDescription: { fontFamily: f.body, fontSize: 14, lineHeight: 20, color: c.muted },
  radio: { borderWidth: theme.borderWidth.thick, borderColor: c.muted, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderWidth: 2, borderColor: c.ink },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.ink },
  check: { borderWidth: theme.borderWidth.thick, borderColor: c.muted, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: c.ink, borderColor: c.ink },
  chip: {
    borderRadius: theme.radius.pill,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip_lg: { height: 46, paddingHorizontal: 20 },
  chip_md: { height: 40, paddingHorizontal: theme.spacing.base },
  chip_sm: { height: 38, paddingHorizontal: 14 },
  chipOn: { backgroundColor: c.ink, borderColor: c.ink },
  chipDashed: { borderStyle: 'dashed', borderColor: c.muted, backgroundColor: 'transparent' },
  chipText: { fontFamily: f.bodyMedium, fontSize: 14, color: c.ink },
  chipTextLg: { fontSize: 16 },
  chipTextOn: { color: c.onInk },
});
