import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { PublicProfile } from '@perspective/contracts';
import { theme } from '../theme';
import { LensChip } from './LensChip';

interface PersonHeaderProps {
  profile?: PublicProfile;
  fallbackName?: string;
}

export const PersonHeader: React.FC<PersonHeaderProps> = ({ profile, fallbackName = 'Anonymous' }) => {
  const name = profile?.displayName || fallbackName;
  const avatarUrl = profile?.photoUrls?.[0];
  const location = profile?.cityId;
  const ageBand = profile?.ageBand;
  const isVerified = profile?.verification?.contact;

  return (
    <View style={styles.container}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarText}>{name.charAt(0)}</Text>
        </View>
      )}

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{name}</Text>
          {isVerified && <Text style={styles.verifiedBadge}>✓</Text>}
          {ageBand && <Text style={styles.meta}> • {ageBand}</Text>}
          {location && <Text style={styles.meta}> • {location}</Text>}
        </View>

        {profile?.lenses && profile.lenses.length > 0 && (
          <View style={styles.lensRow}>
            {profile.lenses.slice(0, 3).map((lens) => (
              <LensChip key={lens} label={lens} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAE6DC',
    marginRight: theme.spacing.md,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAE6DC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    color: theme.colors.ink,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  name: {
    color: theme.colors.ink,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  verifiedBadge: {
    color: theme.colors.brand,
    marginLeft: 4,
    fontSize: 14,
    fontWeight: 'bold',
  },
  meta: {
    color: theme.colors.muted,
    fontSize: theme.typography.fontSize.xs,
  },
  lensRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.xs,
  },
});
