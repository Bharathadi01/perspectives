import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { inCommonTitle, type InCommonItem } from '../../features/explore/inCommon';
import { theme } from '../../theme';

/** Explore, after the first post: what you share with this person. Hidden when nothing is shared. */
export function InCommonCard({ name, items }: { name: string; items: InCommonItem[] }) {
  if (items.length === 0) return null;
  const title = inCommonTitle(name, items.length);
  return (
    <View style={s.card} accessible accessibilityLabel={`${title}: ${items.map((i) => i.label).join(', ')}`}>
      <View style={s.head}>
        <Ionicons name="flash-outline" size={theme.iconSize.lg} color={theme.colors.onDark} />
        <Text style={s.title}>{title}</Text>
      </View>
      <View style={s.chips}>
        {items.map((item) => (
          <View key={`${item.kind}:${item.label}`} style={s.chip}>
            <Text style={s.chipText}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radius.card,
    padding: theme.spacing.base,
    gap: theme.spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  title: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.onDark,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: {
    borderRadius: theme.radius.pill,
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.onDarkMuted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
  },
  chipText: { fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium, color: theme.colors.onDark },
});
