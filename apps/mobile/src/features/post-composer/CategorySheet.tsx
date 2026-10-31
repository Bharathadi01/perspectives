import Ionicons from '@expo/vector-icons/Ionicons';
import { CATEGORY_CATALOG, PostCategory, type PostCategory as Category } from '@perspective/contracts';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PaperSheet } from '../../components/editorial/PaperSheet';
import { theme } from '../../theme';

const e = theme.editorial;

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
 * as eleven chips competing with the question itself. A white list in the paper
 * sheet (2026-10-31).
 */
export function CategorySheet({ visible, value, exclude = [], onClose, onChange }: CategorySheetProps) {
  const options = PostCategory.options.filter((c) => !exclude.includes(c));

  return (
    <PaperSheet visible={visible} onClose={onClose} title="Category" subtitle="What is this card about?">
      <ScrollView style={s.scroll} bounces={false}>
        <View style={s.block} accessibilityRole="radiogroup">
          {options.map((category, i) => {
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
                style={({ pressed }) => [s.row, i < options.length - 1 && s.rowLine, pressed && s.pressed]}
              >
                <Text style={[s.label, selected && s.labelSelected]}>{CATEGORY_CATALOG[category].label}</Text>
                {selected ? <Ionicons name="checkmark" size={theme.iconSize.lg} color={e.colors.accent} /> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </PaperSheet>
  );
}

const s = StyleSheet.create({
  scroll: { maxHeight: 460 },
  block: {
    backgroundColor: e.colors.surface,
    borderRadius: 20,
    borderWidth: theme.borderWidth.hairline,
    borderColor: e.colors.line,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: theme.spacing.base,
  },
  rowLine: { borderBottomWidth: theme.borderWidth.hairline, borderBottomColor: e.colors.sand },
  pressed: { opacity: theme.opacity.pressed },
  label: { fontFamily: e.fonts.bodyMedium, fontSize: 16, color: e.colors.ink },
  labelSelected: { fontFamily: e.fonts.bodySemibold },
});
