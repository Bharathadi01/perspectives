import Ionicons from '@expo/vector-icons/Ionicons';
import { CATEGORY_CATALOG, PostCategory, type PostCategory as Category } from '@perspective/contracts';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Sheet } from '../../components/ui/Sheet';
import { theme } from '../../theme';

interface CategorySheetProps {
  visible: boolean;
  value: Category;
  /** Voice-only cards are always the voice category, so the list is hidden for them. */
  exclude?: readonly Category[];
  onClose: () => void;
  onChange: (category: Category) => void;
}

/**
 * The eleven categories, opened on request rather than spread across the screen
 * as eleven chips competing with the question itself.
 */
export function CategorySheet({ visible, value, exclude = [], onClose, onChange }: CategorySheetProps) {
  const options = PostCategory.options.filter((c) => !exclude.includes(c));

  return (
    <Sheet visible={visible} onClose={onClose} title="Category" subtitle="What is this card about?">
      {options.map((category) => {
        const selected = category === value;
        return (
          <Pressable
            key={category}
            onPress={() => {
              onChange(category);
              onClose();
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={CATEGORY_CATALOG[category].label}
            style={({ pressed }) => [s.row, pressed && s.pressed]}
          >
            <Text style={[s.label, selected && s.labelSelected]}>
              {CATEGORY_CATALOG[category].label}
            </Text>
            {selected ? (
              <Ionicons name="checkmark" size={theme.iconSize.lg} color={theme.colors.brand} />
            ) : (
              <View style={s.spacer} />
            )}
          </Pressable>
        );
      })}
    </Sheet>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: theme.touchTarget.min,
    paddingHorizontal: theme.spacing.xs,
  },
  pressed: { opacity: theme.opacity.pressed },
  label: { ...theme.textStyles.body, color: theme.colors.ink },
  labelSelected: { fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.brand },
  spacer: { width: theme.iconSize.lg },
});
