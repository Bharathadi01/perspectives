import type { UpdateProfileInput } from '@perspective/contracts';
import { useState } from 'react';
import { errorMessage } from '../../lib/errors';
import { useUpdateProfile } from '../hooks';

/**
 * Saves one step's answer. Each step saves on "Next", so a half-finished profile is never lost and
 * the review screen can send someone back to change a single answer. The error shows on the step.
 */
export function useSaveStep() {
  const update = useUpdateProfile();
  const [error, setError] = useState<string | null>(null);

  const save = async (input: UpdateProfileInput): Promise<boolean> => {
    setError(null);
    try {
      await update.run(input);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    }
  };

  return { save, saving: update.isPending, error, setError };
}
