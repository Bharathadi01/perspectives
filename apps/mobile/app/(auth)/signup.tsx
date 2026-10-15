import { zodResolver } from '@hookform/resolvers/zod';
import { SignUpInputSchema } from '@perspective/contracts';
import { router } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { TextField } from '../../src/components/ui/TextField';
import { Muted, Title } from '../../src/components/ui/Text';
import { useToast } from '../../src/components/ui/Toast';
import { useSignUp } from '../../src/features/hooks';
import { errorMessage } from '../../src/lib/errors';
import { theme } from '../../src/theme';

type SignUpForm = Omit<z.input<typeof SignUpInputSchema>, 'acceptTerms'> & { acceptTerms: boolean };

export default function SignUp() {
  const signUp = useSignUp();
  const toast = useToast();
  const { control, handleSubmit, formState } = useForm<SignUpForm>({
    resolver: zodResolver(SignUpInputSchema),
    defaultValues: { email: '', password: '', birthDate: '', acceptTerms: false },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await signUp.run(SignUpInputSchema.parse(values));
      router.replace('/onboarding');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  });

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Title>Create your account</Title>
        <Muted>Perspective is for adults 18 and over. You’ll verify with a selfie next.</Muted>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              label="Email"
              value={field.value}
              onChangeText={field.onChange}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              error={formState.errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <TextField
              label="Password"
              value={field.value}
              onChangeText={field.onChange}
              secureTextEntry
              autoComplete="new-password"
              hint="At least 8 characters"
              error={formState.errors.password?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="birthDate"
          render={({ field }) => (
            <TextField
              label="Date of birth"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              hint="Only your age is shown, never your birthday."
              error={formState.errors.birthDate?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="acceptTerms"
          render={({ field }) => (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: field.value }}
              onPress={() => field.onChange(!field.value)}
              style={s.check}
            >
              <View style={[s.box, field.value && s.boxOn]} />
              <Text style={s.checkText}>
                I’m 18 or older and I agree to the Terms, Community Guidelines and Privacy Notice.
              </Text>
            </Pressable>
          )}
        />
        {formState.errors.acceptTerms ? <Text style={s.error}>Please accept to continue.</Text> : null}
        <Button title="Continue" onPress={() => void submit()} loading={signUp.isPending} />
        <Button title="I already have an account" variant="ghost" onPress={() => router.replace('/(auth)/login')} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: theme.spacing.lg, gap: theme.spacing.base },
  check: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center', minHeight: theme.touchTarget.min },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: theme.colors.ink },
  boxOn: { backgroundColor: theme.colors.ink },
  checkText: { flex: 1, color: theme.colors.ink, fontSize: theme.typography.fontSize.sm },
  error: { color: theme.colors.danger, fontSize: theme.typography.fontSize.xs },
});
