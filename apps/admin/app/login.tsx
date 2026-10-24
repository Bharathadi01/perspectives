import { ApiError } from '@perspective/api-client';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { adminApi, session } from '../src/api';
import { Button, Card, ErrorText, Field, H1, Muted, Page } from '../src/ui';

/** Admin sign-in: email and password, plus the 6-digit authenticator code once the server requires it. */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const s = await adminApi.logIn({ email, password, code: code || undefined });
      session.set({ token: s.accessToken, email: s.email });
      router.replace('/queue');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Card style={{ maxWidth: 420, width: '100%', alignSelf: 'center', marginTop: 64 }}>
        <H1>Perspective admin</H1>
        <Muted>Admin sign-ins are separate from app accounts. Sessions last 8 hours.</Muted>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" inputMode="email" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
        <Field
          label="6-digit code (only if codes are switched on)"
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          onSubmitEditing={() => void submit()}
        />
        <ErrorText>{error}</ErrorText>
        <Button title="Sign in" onPress={() => void submit()} disabled={!email || !password || (code.length > 0 && code.length !== 6)} loading={busy} />
      </Card>
    </Page>
  );
}
