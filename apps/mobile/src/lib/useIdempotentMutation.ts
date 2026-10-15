import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { ApiError } from '@perspective/api-client';
import { newKey } from '../api/client';

interface Keyed<V> {
  vars: V;
  key: string;
}

/**
 * A mutation whose idempotency key is created once per user action and reused on retries,
 * so a retried request can never run twice on the server.
 */
export function useIdempotentMutation<V, R>(
  fn: (vars: V, idempotencyKey: string) => Promise<R>,
  options: Omit<UseMutationOptions<R, Error, Keyed<V>>, 'mutationFn'> = {},
) {
  const mutation = useMutation<R, Error, Keyed<V>>({
    // Retry only transient network failures; business errors (cooldown, validation, ...) are final.
    retry: (count, err) => err instanceof ApiError && err.code === 'NETWORK_ERROR' && count < 2,
    ...options,
    mutationFn: ({ vars, key }) => fn(vars, key),
  });
  return {
    ...mutation,
    run: (vars: V) => mutation.mutateAsync({ vars, key: newKey() }),
  };
}
