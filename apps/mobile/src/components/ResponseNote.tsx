import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PerspectiveResponse } from '@perspective/contracts';
import { theme } from '../theme';
import { PersonHeader } from './PersonHeader';
import { LensChip } from './LensChip';

interface ResponseNoteProps {
  response: PerspectiveResponse;
}

export const ResponseNote: React.FC<ResponseNoteProps> = ({ response }) => {
  return (
    <View style={styles.card}>
      <PersonHeader profile={response.author} fallbackName="Thoughtful Responder" />

      <View style={styles.toneContainer}>
        <Text style={styles.toneLabel}>Tone: {response.tone}</Text>
        {response.connectionIntent && (
          <Text style={styles.intentBadge}>Open to: {response.connectionIntent}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>FIRST IMPRESSION</Text>
        <Text style={styles.firstImpressionText}>"{response.firstImpression}"</Text>
      </View>

      {response.reason && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WHY IT CAME ACROSS THIS WAY</Text>
          <Text style={styles.bodyText}>{response.reason}</Text>
        </View>
      )}

      {response.suggestion && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SUGGESTION</Text>
          <Text style={styles.suggestionText}>{response.suggestion}</Text>
        </View>
      )}

      {response.tags && response.tags.length > 0 && (
        <View style={styles.tagRow}>
          {response.tags.map((tag) => (
            <LensChip key={tag} label={tag} />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#EAE6DC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  toneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  toneLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    textTransform: 'capitalize',
  },
  intentBadge: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.brand,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    color: theme.colors.muted,
    fontWeight: theme.typography.fontWeight.bold,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  firstImpressionText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.ink,
    fontStyle: 'italic',
    lineHeight: 24,
    fontWeight: theme.typography.fontWeight.medium,
  },
  bodyText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.ink,
    lineHeight: 22,
  },
  suggestionText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.brand,
    lineHeight: 22,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.xs,
  },
});
