import { ApiError } from '@perspective/api-client';
import { Redirect } from 'expo-router';
import React from 'react';
import { ErrorState, LoadingState } from '../src/components/ui/States';
import { useMe } from '../src/features/hooks';
import { useSession } from '../src/session/sessionStore';

/** Routes to sign-in, profile setup, or the app depending on the session and profile state. */
export default function Index() {
  const status = useSession((s) => s.status);
  const me = useMe(status === 'signedIn');

  if (status === 'loading') return <LoadingState />;
  if (status === 'signedOut') return <Redirect href="/(auth)/login" />;
  if (me.isLoading) return <LoadingState />;
  if (me.error instanceof ApiError && (me.error.code === 'ACCOUNT_SUSPENDED' || me.error.code === 'ACCOUNT_BANNED')) {
    return <Redirect href="/restricted" />;
  }
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;
  return <Redirect href={me.data.isLive ? '/(tabs)/explore' : '/onboarding'} />;
}
