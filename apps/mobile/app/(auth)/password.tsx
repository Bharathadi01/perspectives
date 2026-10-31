import { RULES } from '@perspective/contracts';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSignupDraft } from '../../src/features/onboarding/drafts';
import { Rise, Tap } from '../../src/features/onboarding/motion';
import { CheckBox, FieldCard, GUTTER, StepScreen } from '../../src/features/onboarding/ui';
import { selection } from '../../src/lib/haptics';
import { theme } from '../../src/theme';

const e = theme.editorial;

/** Sign-up, 2 of 3: the password and the 18+ / terms agreement. */
export default function Password() {
  const draft = useSignupDraft();
  const [password, setPassword] = useState(draft.password);
  const [shown, setShown] = useState(false);
  const [accepted, setAccepted] = useState(draft.acceptTerms);
  const longEnough = password.length >= RULES.passwordMinLength;
  const submit = () => {
    if (!longEnough || !accepted) return;
    draft.set({ password, acceptTerms: true });
    router.push('/(auth)/birthday');
  };
  return (
    <StepScreen
      title="Create a password"
      subtitle={`At least ${RULES.passwordMinLength} characters.`}
      note={{ text: 'Stored safely, never readable', icon: 'lock', tone: 'muted' }}
      next={{ onPress: submit, disabled: !longEnough || !accepted }}
    >
      <View style={s.body}>
        <FieldCard
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!shown}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={RULES.passwordMaxLength}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
          right={
            <Tap
              onPress={() => setShown(!shown)}
              accessibilityRole="button"
              accessibilityLabel={shown ? 'Hide password' : 'Show password'}
              style={s.show}
            >
              <Text style={s.showText}>{shown ? 'Hide' : 'Show'}</Text>
            </Tap>
          }
        />
        <Rise delay={260}>
          <Tap
            onPress={() => {
              selection();
              setAccepted(!accepted);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
            accessibilityLabel="I’m 18 or older and I agree to the Terms, Community Guidelines and Privacy Notice."
            style={s.terms}
          >
            <CheckBox on={accepted} />
            <Text style={s.termsText}>
              I’m 18 or older and I agree to the <Text style={s.bold}>Terms</Text>, <Text style={s.bold}>Community Guidelines</Text> and{' '}
              <Text style={s.bold}>Privacy Notice</Text>.
            </Text>
          </Tap>
        </Rise>
      </View>
    </StepScreen>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: GUTTER, paddingTop: theme.spacing.xl, gap: theme.spacing.md },
  show: { height: 44, paddingHorizontal: theme.spacing.md, justifyContent: 'center' },
  showText: { fontFamily: e.fonts.bodySemibold, fontSize: 14, color: e.colors.ink, textDecorationLine: 'underline' },
  terms: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    backgroundColor: e.colors.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: e.colors.line,
    borderRadius: 16,
    padding: theme.spacing.base,
  },
  termsText: { flex: 1, fontFamily: e.fonts.body, fontSize: 14, lineHeight: 21, color: e.colors.ink },
  bold: { fontFamily: e.fonts.bodySemibold },
});
