import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CANONICAL_INTERESTS,
  InterestCategory,
  INTEREST_CATEGORY_CONFIG,
} from '@perspective/contracts';
import { useOnboardingStore } from '../../session/onboardingStore';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { Label, Muted } from '../ui/Text';

const CATEGORY_KEYS = [
  'all',
  'creativity',
  'music',
  'active_outdoors',
  'food_drink',
  'entertainment',
  'knowledge_tech',
  'vibe_lifestyle',
  'community_values',
] as const;

type FilterCategory = (typeof CATEGORY_KEYS)[number];

export function StepInterests({ onNext }: { onNext: () => void }) {
  const { selectedInterests, setField } = useOnboardingStore();
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [search, setSearch] = useState('');

  const toggleInterest = (id: string) => {
    if (selectedInterests.includes(id)) {
      setField(
        'selectedInterests',
        selectedInterests.filter((x) => x !== id),
      );
    } else {
      if (selectedInterests.length >= 10) return;
      setField('selectedInterests', [...selectedInterests, id]);
    }
  };

  const filteredInterests = useMemo(() => {
    let items = CANONICAL_INTERESTS;
    if (activeCategory !== 'all') {
      items = items.filter((i) => i.category === activeCategory);
    }
    if (search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      items = items.filter((i) => i.label.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    return items;
  }, [activeCategory, search]);

  const count = selectedInterests.length;
  const isMinSatisfied = count >= 3;

  return (
    <View style={s.container}>
      {/* Header counter badge */}
      <View style={s.counterBox}>
        <View style={s.counterRow}>
          <Label>Your Passions & Hobbies</Label>
          <View style={[s.badge, isMinSatisfied ? s.badgeSuccess : s.badgeBrand]}>
            <Text style={[s.badgeText, isMinSatisfied ? s.badgeTextSuccess : s.badgeTextBrand]}>
              {count >= 3 ? `✓ ${count} / 10 selected` : `${count} of 3 required`}
            </Text>
          </View>
        </View>
        <Muted>
          Select at least 3 to connect over common interests. People with shared interests match 3× more often.
        </Muted>
      </View>

      {/* Search Input */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color={theme.colors.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search passions (e.g. coffee, hiking, indie)..."
          placeholderTextColor={theme.colors.muted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={theme.colors.muted} />
          </Pressable>
        )}
      </View>

      {/* Horizontal Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.catScroll}
      >
        {CATEGORY_KEYS.map((cat) => {
          const isSelected = activeCategory === cat;
          const label = cat === 'all' ? 'All Passions' : INTEREST_CATEGORY_CONFIG[cat as InterestCategory].label;
          return (
            <Pressable
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[s.catPill, isSelected && s.catPillSelected]}
            >
              <Text style={[s.catPillText, isSelected && s.catPillTextSelected]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Interest Grid */}
      <View style={s.gridContainer}>
        {filteredInterests.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="sparkles-outline" size={32} color={theme.colors.muted} />
            <Text style={s.emptyText}>No matching interests found for "{search}"</Text>
            <Pressable onPress={() => setSearch('')} style={s.clearBtn}>
              <Text style={s.clearBtnText}>Clear Search</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.chipsGrid}>
            {filteredInterests.map((interest) => {
              const selected = selectedInterests.includes(interest.id);
              return (
                <Pressable
                  key={interest.id}
                  onPress={() => toggleInterest(interest.id)}
                  style={[s.interestCard, selected && s.interestCardSelected]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={interest.label}
                >
                  <Ionicons
                    name={interest.icon as any}
                    size={16}
                    color={selected ? theme.colors.surface : theme.colors.ink}
                  />
                  <Text style={[s.interestLabel, selected && s.interestLabelSelected]}>
                    {interest.label}
                  </Text>
                  {selected && (
                    <Ionicons name="checkmark-circle" size={14} color={theme.colors.surface} />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <Button
        title={count < 3 ? `Select ${3 - count} more to continue` : 'Continue to Lifestyle'}
        onPress={onNext}
        disabled={!isMinSatisfied}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: theme.spacing.md },
  counterBox: { gap: 4 },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  badgeBrand: {
    backgroundColor: theme.colors.brandSoft,
  },
  badgeSuccess: {
    backgroundColor: '#E8F5E9',
  },
  badgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  badgeTextBrand: {
    color: theme.colors.brand,
  },
  badgeTextSuccess: {
    color: theme.colors.success,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    paddingHorizontal: theme.spacing.md,
    height: 44,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.ink,
  },
  catScroll: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingVertical: 2,
  },
  catPill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  catPillSelected: {
    backgroundColor: theme.colors.ink,
  },
  catPillText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.ink,
  },
  catPillTextSelected: {
    color: theme.colors.surface,
  },
  gridContainer: {
    minHeight: 200,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  interestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
  },
  interestCardSelected: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  interestLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.ink,
  },
  interestLabelSelected: {
    color: theme.colors.surface,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  clearBtn: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  clearBtnText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.brand,
  },
});
