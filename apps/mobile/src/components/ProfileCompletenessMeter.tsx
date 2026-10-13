import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PublicProfile } from '@perspective/contracts';
import { theme } from '../theme';

interface ProfileCompletenessMeterProps {
  profile?: PublicProfile;
}

export const ProfileCompletenessMeter: React.FC<ProfileCompletenessMeterProps> = ({ profile }) => {
  if (!profile) return null;

  let score = 0;
  if (profile.verification?.contact) score += 20;
  if (profile.photoUrls?.length > 0) score += 20;
  if (profile.prompts?.length >= 2) score += 20;
  if (profile.lenses?.length > 0) score += 20;
  if (profile.bio?.length > 10) score += 20;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile Trust & Depth</Text>
        <Text style={styles.percentage}>{score}%</Text>
      </View>

      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${score}%` }]} />
      </View>

      <Text style={styles.hint}>
        {score === 100
          ? 'Your profile is trustworthy and ready for high-quality perspectives.'
          : 'Complete prompts and lenses to unlock high-intent request publishing.'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FAF8F5',
    borderRadius: theme.radius.control,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#EAE6DC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.ink,
  },
  percentage: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.brand,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#EAE6DC',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: theme.spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.brand,
  },
  hint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    marginTop: 4,
  },
});
