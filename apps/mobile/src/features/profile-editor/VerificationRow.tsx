import type { MyProfile } from '@perspective/contracts';
import { router } from 'expo-router';
import React from 'react';
import { ListGroup } from '../../components/ui/ListGroup';
import { ListRow } from '../../components/ui/ListRow';

/**
 * Shown only when the selfie is not verified.
 *
 * In practice that is never on this tab: verification is one of the
 * requirements for a live profile, and a profile that is not live is sent to
 * onboarding before it reaches the tabs. It is here so the screen stays correct
 * if that ever changes — and because the old row said "Get verified" to people
 * who already were.
 */
export function VerificationRow({ me }: { me: MyProfile }) {
  if (me.selfieStatus === 'verified') return null;

  const rejected = me.selfieStatus === 'rejected';
  return (
    <ListGroup>
      <ListRow
        icon="shield-outline"
        iconTone="danger"
        title={rejected ? 'Selfie not accepted' : 'Not verified'}
        subtitle={
          rejected
            ? 'Take another selfie so people know your photos are you.'
            : 'Verify your selfie so people know your photos are you.'
        }
        onPress={() => router.push('/me/verify')}
      />
    </ListGroup>
  );
}
