import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSignupDraft } from '../../src/features/onboarding/drafts';
import { FieldCard, GUTTER, StepScreen } from '../../src/features/onboarding/ui';
import { looksLikeEmail } from '../../src/features/onboarding/values';
import { theme } from '../../src/theme';

/** Sign-up, 1 of 3: the email. Nothing is sent until the birthday is confirmed. */
export default function Email() {
  const draft = useSignupDraft();
  const [email, setEmail] = useState(draft.email);
  const [touched, setTouched] = useState(false);
  const valid = looksLikeEmail(email);
  const submit = () => {
    setTouched(true);
    if (!valid) return;
    draft.set({ email: email.trim() });
    router.push('/(auth)/password');
  };
  return (
    <StepScreen
      title="What’s your email?"
      subtitle="You’ll use it to sign in. It’s never shown on your profile or to anyone you connect with."
      note={{ text: 'Never shown to anyone', icon: 'lock', tone: 'muted' }}
      error={touched && email.length > 0 && !valid ? 'That doesn’t look like an email address.' : null}
      next={{ onPress: submit, disabled: email.trim().length === 0 }}
    >
      <View style={s.pad}>
        <FieldCard
          label="Your email"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setTouched(false);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          autoFocus
          returnKeyType="next"
          onSubmitEditing={submit}
        />
      </View>
    </StepScreen>
  );
}

const s = StyleSheet.create({
  pad: { paddingHorizontal: GUTTER, paddingTop: theme.spacing.xl },
});
