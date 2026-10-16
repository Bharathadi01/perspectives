import { zodResolver } from '@hookform/resolvers/zod';
import { LogInInput, LogInInputSchema } from '@perspective/contracts';
import { router } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { TextField } from '../../src/components/ui/TextField';
import { Muted, Title } from '../../src/components/ui/Text';
import { useToast } from '../../src/components/ui/Toast';
import { useLogIn, useSignUp } from '../../src/features/hooks';
import { errorMessage } from '../../src/lib/errors';
import { theme } from '../../src/theme';

export default function LogIn() {
  const logIn = useLogIn();
  const signUp = useSignUp();
  const toast = useToast();
  const { control, handleSubmit, setValue, formState } = useForm<LogInInput>({
    resolver: zodResolver(LogInInputSchema),
    defaultValues: __DEV__
      ? { email: 'ravi@perspective.test', password: 'perspective123' }
      : { email: '', password: '' },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await logIn.run(values);
      router.replace('/');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  });

  const quickFill = (email: string) => {
    setValue('email', email);
    setValue('password', 'perspective123');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Title>Welcome back</Title>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              label="Email"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
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
              onBlur={field.onBlur}
              secureTextEntry
              autoComplete="password"
              onSubmitEditing={() => void submit()}
              error={formState.errors.password?.message}
            />
          )}
        />
        <Button title="Sign in" onPress={() => void submit()} loading={logIn.isPending} />
        {__DEV__ ? (
          <>
            <Button
              title="Quick Sign In as Ravi (Dev)"
              variant="secondary"
              onPress={() => {
                quickFill('ravi@perspective.test');
                void logIn.run({ email: 'ravi@perspective.test', password: 'perspective123' }).then(() => {
                  router.replace('/');
                });
              }}
            />
            <Button
              title="Test Fresh Onboarding (New Account)"
              variant="secondary"
              loading={signUp.isPending}
              onPress={async () => {
                const devEmail = `dev_${Date.now()}@perspective.test`;
                try {
                  await signUp.run({
                    email: devEmail,
                    password: 'perspective123',
                    birthDate: '2000-01-01',
                    acceptTerms: true,
                  });
                  router.replace('/onboarding');
                } catch (err) {
                  toast(errorMessage(err), 'error');
                }
              }}
            />
          </>
        ) : null}
        <Button title="Create an account instead" variant="ghost" onPress={() => router.replace('/(auth)/signup')} />
        <Muted>Testing locally? Seed accounts like ravi@perspective.test use the password perspective123.</Muted>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: theme.spacing.lg, gap: theme.spacing.base },
});
