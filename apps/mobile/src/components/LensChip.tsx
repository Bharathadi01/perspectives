import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface LensChipProps {
  label: string;
  selected?: boolean;
}

export const LensChip: React.FC<LensChipProps> = ({ label, selected = false }) => {
  const formattedLabel = label
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <View style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.text, selected && styles.textSelected]}>
        {formattedLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    backgroundColor: '#EAE6DC',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  chipSelected: {
    backgroundColor: theme.colors.brand,
  },
  text: {
    color: theme.colors.ink,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  textSelected: {
    color: theme.colors.surface,
  },
});
