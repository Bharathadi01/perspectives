import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useUploadMedia, useVerifySelfie } from '../../features/hooks';
import { errorMessage } from '../../lib/errors';
import { pickPhoto } from '../../lib/media';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { Body, Muted } from '../ui/Text';
import { useToast } from '../ui/Toast';

/**
 * Selfie verification. The selfie is private: it is never shown on your profile.
 * v1 uses a stub verifier on the server; a real liveness check replaces it later.
 */
export function SelfieStep({ onVerified }: { onVerified: () => void }) {
  const upload = useUploadMedia();
  const verify = useVerifySelfie();
  const toast = useToast();
  const busy = upload.isPending || verify.isPending;

  const take = async () => {
    try {
      const photo = await pickPhoto('camera');
      if (!photo) return;
      const { mediaId } = await upload.run({ kind: 'photo', mimeType: photo.mimeType, dataBase64: photo.dataBase64 });
      const me = await verify.run(mediaId);
      if (me.selfieStatus === 'verified') {
        toast('You’re verified.', 'success');
        onVerified();
      } else {
        toast('We couldn’t verify that selfie. Try again in good light.', 'error');
      }
    } catch (err) {
      toast(err instanceof Error && !('code' in err) ? err.message : errorMessage(err), 'error');
    }
  };

  return (
    <View style={s.wrap}>
      <View style={s.icon}>
        <Ionicons name="scan-circle-outline" size={64} color={theme.colors.brand} />
      </View>
      <Body>Everyone on Perspective is a verified adult. Take a quick selfie so we know it’s really you.</Body>
      <Muted>Your selfie stays private and is never shown on your profile.</Muted>
      <Button
        title={Platform.OS === 'web' ? 'Choose a selfie photo' : 'Take a selfie'}
        onPress={() => void take()}
        loading={busy}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: theme.spacing.base },
  icon: { alignItems: 'center', paddingVertical: theme.spacing.lg },
});
