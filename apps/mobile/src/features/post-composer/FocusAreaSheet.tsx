import { CATEGORY_CATALOG, RULES, type PostCategory } from '@perspective/contracts';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PaperSheet, SheetAction } from '../../components/editorial/PaperSheet';
import { useToast } from '../../components/ui/Toast';
import { theme } from '../../theme';
import { ChoiceChip } from '../onboarding/ui';
import { toggleFocusArea } from './composer';

interface FocusAreaSheetProps {
  visible: boolean;
  category: PostCategory;
  value: readonly string[];
  onClose: () => void;
  onChange: (focusAreas: string[]) => void;
}

/** Optional detail, kept folded away until someone asks for it. Editorial chips (2026-10-31). */
export function FocusAreaSheet({ visible, category, value, onClose, onChange }: FocusAreaSheetProps) {
  const toast = useToast();
  const areas = CATEGORY_CATALOG[category].focusAreas;

  const press = (key: string) => {
    const next = toggleFocusArea(value, key);
    if (next === 'at_min') {
      toast('Keep at least one thing for people to focus on.', 'info');
      return;
    }
    if (next === 'at_max') {
      toast(`You can pick up to ${RULES.maxFocusAreas}.`, 'info');
      return;
    }
    onChange(next);
  };

  return (
    <PaperSheet
      visible={visible}
      onClose={onClose}
      title="What should people focus on?"
      subtitle={`Pick up to ${RULES.maxFocusAreas}. It steers what they write about.`}
    >
      <View style={s.chips}>
        {areas.map((area) => (
          <ChoiceChip
            key={area.key}
            role="checkbox"
            label={area.label}
            selected={value.includes(area.key)}
            onPress={() => press(area.key)}
          />
        ))}
      </View>
      <Text style={s.category}>{CATEGORY_CATALOG[category].label}</Text>
      <SheetAction label="Done" tone="primary" onPress={onClose} />
    </PaperSheet>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, paddingBottom: theme.spacing.sm },
  category: {
    fontFamily: theme.editorial.fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.editorial.colors.muted,
    marginBottom: theme.spacing.md,
  },
});
