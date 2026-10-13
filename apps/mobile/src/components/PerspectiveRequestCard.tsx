import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { PerspectiveRequest } from '@perspective/contracts';
import { theme } from '../theme';
import { PersonHeader } from './PersonHeader';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { LensChip } from './LensChip';

const { width } = Dimensions.get('window');

interface PerspectiveRequestCardProps {
  request: PerspectiveRequest;
  onGivePerspective: () => void;
  onSkip: () => void;
  onOpenSafetyMenu?: () => void;
}

export const PerspectiveRequestCard: React.FC<PerspectiveRequestCardProps> = ({
  request,
  onGivePerspective,
  onSkip,
  onOpenSafetyMenu,
}) => {
  const imageUrl = request.media?.find((m) => m.type === 'image')?.storagePath;
  const categoryLabel = request.category.replace('_', ' ').toUpperCase();
  const responseStyleLabel = request.responseStyle.replace('_', ' ');

  return (
    <View style={styles.card}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <PersonHeader profile={request.author} />
        {onOpenSafetyMenu && (
          <SecondaryButton
            title="•••"
            onPress={onOpenSafetyMenu}
            variant="subtle"
            accessibilityLabel="Safety options: report or block"
          />
        )}
      </View>

      {/* Category & Style Badges */}
      <View style={styles.badgeRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{categoryLabel}</Text>
        </View>
        <Text style={styles.styleHint}>Seeking {responseStyleLabel} perspective</Text>
      </View>

      {/* Main Question (Large Editorial Text) */}
      <Text style={styles.questionText}>{request.question}</Text>

      {/* Media if present */}
      {imageUrl && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.mediaImage} resizeMode="cover" />
        </View>
      )}

      {/* Context */}
      {request.context && (
        <View style={styles.contextBox}>
          <Text style={styles.contextLabel}>CONTEXT</Text>
          <Text style={styles.contextText}>{request.context}</Text>
        </View>
      )}

      {/* Audience Constraints */}
      {request.audience?.lensesAny && request.audience.lensesAny.length > 0 && (
        <View style={styles.audienceRow}>
          <Text style={styles.audienceLabel}>Desired lenses: </Text>
          {request.audience.lensesAny.map((lens) => (
            <LensChip key={lens} label={lens} />
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsRow}>
        <View style={styles.actionBtn}>
          <SecondaryButton
            title="Skip"
            onPress={onSkip}
            accessibilityLabel="Skip this request"
          />
        </View>
        <View style={styles.actionBtnWide}>
          <PrimaryButton
            title="Give Perspective"
            onPress={onGivePerspective}
            accessibilityLabel="Give structured perspective on this request"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#EAE6DC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  categoryBadge: {
    backgroundColor: '#EAE6DC',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.radius.pill,
    marginRight: theme.spacing.sm,
  },
  categoryText: {
    color: theme.colors.ink,
    fontSize: 11,
    fontWeight: theme.typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  styleHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.fontSize.xs,
    fontStyle: 'italic',
  },
  questionText: {
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.ink,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: 30,
    marginBottom: theme.spacing.md,
  },
  imageContainer: {
    width: '100%',
    height: 240,
    borderRadius: theme.radius.control,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    backgroundColor: '#EAE6DC',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  contextBox: {
    backgroundColor: '#FAF8F5',
    padding: theme.spacing.md,
    borderRadius: theme.radius.control,
    marginBottom: theme.spacing.md,
  },
  contextLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.muted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  contextText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.ink,
    lineHeight: 20,
  },
  audienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.lg,
  },
  audienceLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    marginRight: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
  actionBtnWide: {
    flex: 2,
  },
});
