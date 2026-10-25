import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { inCommonTitle, type InCommonItem } from '../../features/explore/inCommon';
import { theme } from '../../theme';

const e = theme.editorial;

/**
 * Explore, after the first post: what you share with this person, in the editorial look
 * ("4 things you + Meera have in common"). Hidden when nothing is shared.
 */
export function InCommonCard({ name, items }: { name: string; items: InCommonItem[] }) {
  if (items.length === 0) return null;
  return (
    <View style={s.card} accessible accessibilityLabel={`${inCommonTitle(name, items.length)}: ${items.map((i) => i.label).join(', ')}`}>
      <View style={s.head}>
        <Text style={s.count}>{items.length}</Text>
        <Text style={s.title}>
          {items.length === 1 ? 'thing' : 'things'} you + {name} have in common
        </Text>
      </View>
      <View style={s.chips}>
        {items.map((item) => (
          <Text key={`${item.kind}:${item.label}`} style={s.chip}>
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: e.colors.ink,
    borderRadius: 20,
    padding: theme.spacing.base,
    paddingBottom: theme.spacing.base + 2,
    gap: theme.spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm },
  // Inter, not Fraunces: Fraunces' quirky numerals read oddly at this size.
  count: { fontFamily: e.fonts.bodyBold, fontSize: 26, lineHeight: 30, color: e.colors.onInk },
  title: { flex: 1, fontFamily: e.fonts.bodySemibold, fontSize: 15, color: e.colors.onInk },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: {
    fontFamily: e.fonts.bodyMedium,
    fontSize: 13,
    color: e.colors.onInk,
    backgroundColor: e.colors.onInkSoft,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
  },
});
