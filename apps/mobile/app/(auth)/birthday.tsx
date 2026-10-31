import { SignUpInputSchema } from '@perspective/contracts';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSignUp } from '../../src/features/hooks';
import { useSignupDraft } from '../../src/features/onboarding/drafts';
import { Animate, Rise, keyframes } from '../../src/features/onboarding/motion';
import { stepHref } from '../../src/features/onboarding/nav';
import { FieldCard, GUTTER, PillButton, StepScreen } from '../../src/features/onboarding/ui';
import { checkBirthday, formatLongDate } from '../../src/features/onboarding/values';
import { errorMessage } from '../../src/lib/errors';
import { normalizeDigits } from '../../src/lib/labels';
import { theme } from '../../src/theme';

const e = theme.editorial;
const c = e.colors;
const f = e.fonts;

/**
 * Sign-up, 3 of 3: the birthday, then a sheet to confirm the age it makes. Confirm creates the
 * account (email, password and birthday together) and starts onboarding.
 */
export default function Birthday() {
  const insets = useSafeAreaInsets();
  const draft = useSignupDraft();
  const signUp = useSignUp();
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ birthDate: string; age: number } | null>(null);
  const monthRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const yearRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const filled = day.length > 0 && month.length > 0 && year.length === 4;

  const check = () => {
    const result = checkBirthday(day, month, year);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setConfirm({ birthDate: result.birthDate, age: result.age });
  };

  const create = async () => {
    if (!confirm) return;
    const input = SignUpInputSchema.safeParse({
      email: draft.email,
      password: draft.password,
      birthDate: confirm.birthDate,
      acceptTerms: draft.acceptTerms,
    });
    if (!input.success) {
      // Only reachable if the earlier screens were skipped; send them back to the start.
      setConfirm(null);
      setError('Something’s missing from your email or password. Please go back and check them.');
      return;
    }
    try {
      await signUp.run(input.data);
      draft.clear();
      if (router.canDismiss()) router.dismissAll();
      router.replace(stepHref('value-perspectives'));
    } catch (err) {
      setConfirm(null);
      setError(errorMessage(err));
    }
  };

  const digits = (value: string, max: number) => normalizeDigits(value).slice(0, max);

  return (
    <View style={s.flex}>
      <StepScreen
        title="When’s your birthday?"
        subtitle="People only see your age. Your birthday stays private."
        note={{ text: 'Only your age is shown', icon: 'eye', tone: 'muted' }}
        error={error}
        next={{ onPress: check, disabled: !filled }}
      >
        <View style={s.row}>
          <FieldCard
            label="Day"
            delay={160}
            style={s.cell}
            value={day}
            onChangeText={(v) => {
              const d = digits(v, 2);
              setDay(d);
              if (d.length === 2) monthRef.current?.focus();
            }}
            keyboardType="number-pad"
            placeholder="DD"
            autoFocus
            textContentType="none"
            accessibilityLabel="Day"
          />
          <FieldCard
            ref={monthRef}
            label="Month"
            delay={240}
            style={s.cell}
            value={month}
            onChangeText={(v) => {
              const m = digits(v, 2);
              setMonth(m);
              if (m.length === 2) yearRef.current?.focus();
            }}
            keyboardType="number-pad"
            placeholder="MM"
            accessibilityLabel="Month"
          />
          <FieldCard
            ref={yearRef}
            label="Year"
            delay={320}
            style={s.cell}
            value={year}
            onChangeText={(v) => setYear(digits(v, 4))}
            keyboardType="number-pad"
            placeholder="YYYY"
            accessibilityLabel="Year"
            returnKeyType="done"
            onSubmitEditing={() => filled && check()}
          />
        </View>
      </StepScreen>

      {confirm ? (
        <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
          <Animate frames={keyframes.fade()} duration={400} easing="ease" style={[StyleSheet.absoluteFill, s.scrim]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setConfirm(null)} accessibilityRole="button" accessibilityLabel="Edit your birthday" />
          </Animate>
          <Animate frames={keyframes.sheet()} duration={550} delay={150} style={[s.sheet, { bottom: Math.max(insets.bottom, 12) }]}>
            <Rise delay={500} duration={500}>
              <Text style={s.sheetTitle} accessibilityRole="header">
                {`You’re ${confirm.age}`}
              </Text>
            </Rise>
            <Rise delay={540} duration={500}>
              <Text style={s.born}>{`Born ${formatLongDate(confirm.birthDate)}`}</Text>
            </Rise>
            <Rise delay={580} duration={500}>
              <Text style={s.sheetBody}>
                Check it’s right before you go on. You can’t change your birthday later, and everyone here is 18 or older.
              </Text>
            </Rise>
            <View style={s.sheetButtons}>
              <PillButton label="Edit" variant="outline" wide style={s.half} onPress={() => setConfirm(null)} disabled={signUp.isPending} />
              <PillButton label="Confirm" wide style={s.half} onPress={() => void create()} loading={signUp.isPending} />
            </View>
          </Animate>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.paper },
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: GUTTER, paddingTop: theme.spacing.xl },
  cell: { flex: 1 },
  scrim: { backgroundColor: c.scrim },
  sheet: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: c.paper,
    borderRadius: 28,
    paddingTop: 28,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: 10,
    shadowColor: c.ink,
    shadowOpacity: 0.18,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  sheetTitle: { fontFamily: f.display, fontSize: 28, lineHeight: 34, color: c.ink },
  born: { fontFamily: f.bodyMedium, fontSize: 15, color: c.ink },
  sheetBody: { fontFamily: f.body, fontSize: 14, lineHeight: 21, color: c.muted },
  sheetButtons: { flexDirection: 'row', gap: 10, marginTop: 14 },
  half: { flex: 1 },
});
