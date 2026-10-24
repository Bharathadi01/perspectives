import { CATEGORY_CATALOG, RULES, type PostCategory } from '@perspective/contracts';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip } from '../../components/ui/Chip';
import { Sheet } from '../../components/ui/Sheet';
import { Muted } from '../../components/ui/Text';
import { useToast } from '../../components/ui/Toast';
import { theme } from '../../theme';
import { toggleFocusArea } from './composer';

interface FocusAreaSheetProps {
  visible: boolean;
  category: PostCategory;
  value: readonly string[];
  onClose: () => void;
  onChange: (focusAreas: string[]) => void;
}

/** Optional detail, kept folded away until someone asks for it. */
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
    <Sheet
      visible={visible}
      onClose={onClose}
      title="What should people focus on?"
      subtitle={`Pick up to ${RULES.maxFocusAreas}. It steers what they write about.`}
    >
      <View style={s.chips}>
        {areas.map((area) => (
          <Chip
            key={area.key}
            label={area.label}
            selected={value.includes(area.key)}
            onPress={() => press(area.key)}
          />
        ))}
      </View>
      <Muted>{CATEGORY_CATALOG[category].label}</Muted>
    </Sheet>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, paddingVertical: theme.spacing.xs },
});
