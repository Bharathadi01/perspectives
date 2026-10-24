import Ionicons from '@expo/vector-icons/Ionicons';
import { Goal } from '@perspective/contracts';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GOAL_LABEL } from '../../lib/labels';
import { theme } from '../../theme';

const ICON: Record<Goal, 'chatbubbles-outline' | 'people-outline'> = {
  get_perspectives: 'chatbubbles-outline',
  meet_people: 'people-outline',
};

/** Pick one or both goals. Used in onboarding and in Edit profile. */
export function GoalPicker({ value, onChange }: { value: readonly Goal[]; onChange: (goals: Goal[]) => void }) {
  const toggle = (g: Goal) => {
    const next = value.includes(g) ? value.filter((x) => x !== g) : [...value, g];
    // Keep the canonical order so "both" always reads the same.
    onChange(Goal.options.filter((o) => next.includes(o)));
  };

  return (
    <View style={s.list}>
      {Goal.options.map((g) => {
        const selected = value.includes(g);
        return (
          <Pressable
            key={g}
            onPress={() => toggle(g)}
            style={[s.card, selected && s.cardSelected]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`${GOAL_LABEL[g].title}. ${GOAL_LABEL[g].description}`}
          >
            <View style={[s.iconBox, selected && s.iconBoxSelected]}>
              <Ionicons name={ICON[g]} size={20} color={selected ? theme.colors.surface : theme.colors.brand} />
            </View>
            <View style={s.text}>
              <Text style={[s.title, selected && s.titleSelected]}>{GOAL_LABEL[g].title}</Text>
              <Text style={s.description}>{GOAL_LABEL[g].description}</Text>
            </View>
            <Ionicons
              name={selected ? 'checkbox' : 'square-outline'}
              size={22}
              color={selected ? theme.colors.brand : theme.colors.border}
            />
          </Pressable>
        );
      })}
      <Text style={s.both}>Pick one or both.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  list: { gap: theme.spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.touchTarget.min,
    padding: theme.spacing.md,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  cardSelected: { borderColor: theme.colors.brand, backgroundColor: theme.colors.brandSoft },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxSelected: { backgroundColor: theme.colors.brand },
  text: { flex: 1, gap: 2 },
  title: { fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.ink },
  titleSelected: { color: theme.colors.brand },
  description: { fontSize: theme.typography.fontSize.xs, color: theme.colors.muted },
  both: { fontSize: theme.typography.fontSize.xs, color: theme.colors.muted },
});
