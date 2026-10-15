import Ionicons from '@expo/vector-icons/Ionicons';
import type { PublicProfile } from '@perspective/contracts';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { GENDER_LABEL, ORIENTATION_LABEL, formatHeight } from '../../lib/labels';
import { theme } from '../../theme';
import type { IconName } from '../ui/IconButton';

/** The profile "basics" strip: age, gender, orientation, height, city. */
export function BasicsRow({ profile }: { profile: PublicProfile }) {
  const items: { icon: IconName; label: string; a11y: string }[] = [
    { icon: 'calendar-clear-outline', label: String(profile.age), a11y: `Age ${profile.age}` },
    { icon: 'person-outline', label: GENDER_LABEL[profile.gender], a11y: GENDER_LABEL[profile.gender] },
    { icon: 'heart-outline', label: ORIENTATION_LABEL[profile.orientation], a11y: ORIENTATION_LABEL[profile.orientation] },
    { icon: 'resize-outline', label: formatHeight(profile.heightCm), a11y: `Height ${profile.heightCm} centimetres` },
    { icon: 'location-outline', label: profile.city, a11y: `Lives in ${profile.city}` },
  ];
  return (
    <View style={s.card}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        {items.map((item, i) => (
          <View key={item.icon} style={[s.item, i > 0 && s.divider]} accessible accessibilityLabel={item.a11y}>
            <Ionicons name={item.icon} size={18} color={theme.colors.ink} />
            <Text style={s.text}>{item.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.media,
    paddingVertical: theme.spacing.base,
  },
  row: { paddingHorizontal: theme.spacing.base },
  item: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md },
  divider: { borderLeftWidth: 1, borderLeftColor: theme.colors.border },
  text: { fontSize: theme.typography.fontSize.base, color: theme.colors.ink, fontWeight: theme.typography.fontWeight.medium },
});
