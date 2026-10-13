import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OriginSnapshot } from '@perspective/contracts';
import { theme } from '../theme';

interface OriginContextCardProps {
  origin: OriginSnapshot;
}

export const OriginContextCard: React.FC<OriginContextCardProps> = ({ origin }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.badge}>ORIGIN CONNECTION CARD</Text>
      
      <View style={styles.item}>
        <Text style={styles.label}>REQUEST ASKED</Text>
        <Text style={styles.questionText}>"{origin.requestQuestion}"</Text>
      </View>

      <View style={styles.item}>
        <Text style={styles.label}>PERSPECTIVE GIVEN</Text>
        <Text style={styles.impressionText}>"{origin.responseFirstImpression}"</Text>
        {origin.responseReason && (
          <Text style={styles.reasonText}>{origin.responseReason}</Text>
        )}
      </View>
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
  badge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.brand,
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  item: {
    marginTop: theme.spacing.xs,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.muted,
    marginBottom: 2,
  },
  questionText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.ink,
  },
  impressionText: {
    fontSize: theme.typography.fontSize.sm,
    fontStyle: 'italic',
    color: theme.colors.ink,
  },
  reasonText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    marginTop: 2,
  },
});
