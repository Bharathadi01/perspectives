import type { ProfileSummary } from '@perspective/contracts';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { theme } from '../../theme';
import { SealCheckIcon } from '../ui/icons';

const e = theme.editorial;

/** The partner's photo, or their initial set in Fraunces when there is none. */
export function PaperAvatar({ person, size }: { person: Pick<ProfileSummary, 'displayName' | 'primaryPhotoUrl'>; size: number }) {
  const frame = { width: size, height: size, borderRadius: size / 2 };
  if (person.primaryPhotoUrl) {
    return <Image source={{ uri: api.mediaUrl(person.primaryPhotoUrl) }} style={[s.avatar, frame]} accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={[s.avatar, s.initialWrap, frame]}>
      <Text style={[s.initial, { fontSize: size * 0.42 }]}>{person.displayName.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

/** Name with the clay seal when verified, the same mark Explore uses. */
export function PartnerName({ person, size = 16 }: { person: Pick<ProfileSummary, 'displayName' | 'verified'>; size?: number }) {
  return (
    <View style={s.nameRow}>
      <Text style={[s.name, { fontSize: size }]} numberOfLines={1}>
        {person.displayName}
      </Text>
      {person.verified ? (
        <View accessible accessibilityRole="image" accessibilityLabel="Selfie verified">
          <SealCheckIcon size={size - 1} weight="fill" color={e.colors.accent} />
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  avatar: { backgroundColor: e.colors.line },
  initialWrap: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: e.fonts.display, color: e.colors.ink },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  name: { fontFamily: e.fonts.bodySemibold, color: e.colors.ink, flexShrink: 1 },
});
