import Ionicons from '@expo/vector-icons/Ionicons';
import { PostCategory } from '@perspective/contracts';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';

import { PROMPT_LIBRARY, type PromptItem } from '../../lib/promptLibrary';

const CATEGORY_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All Perspectives' },
  { key: 'first_impressions', label: 'First Impressions' },
  { key: 'personality', label: 'Personality' },
  { key: 'dating', label: 'Dating' },
  { key: 'interests', label: 'Interests' },
  { key: 'voice', label: 'Voice' },
];

interface PromptLibraryModalProps {
  visible: boolean;
  filterKind?: 'photo' | 'audio';
  onClose: () => void;
  onSelect: (prompt: string, category: PostCategory, focusAreas: string[]) => void;
}

export function PromptLibraryModal({
  visible,
  filterKind,
  onClose,
  onSelect,
}: PromptLibraryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    filterKind === 'audio' ? 'voice' : 'all',
  );
  const [search, setSearch] = useState('');
  const [customText, setCustomText] = useState('');

  const filtered = PROMPT_LIBRARY.filter((item) => {
    if (filterKind === 'audio' && item.postCategory !== 'voice') return false;
    if (filterKind === 'photo' && item.postCategory === 'voice') return false;
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (search.trim().length > 0) {
      return item.text.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const pickPrompt = (item: PromptItem) => {
    onSelect(item.text, item.postCategory, item.defaultFocusAreas);
    onClose();
  };

  const submitCustom = () => {
    if (customText.trim().length < 5) return;
    const cat: PostCategory = filterKind === 'audio' ? 'voice' : 'vibe';
    const focus = filterKind === 'audio' ? ['tone'] : ['first_look'];
    onSelect(customText.trim(), cat, focus);
    setCustomText('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Select a Perspective</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close perspective picker" style={s.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.ink} />
          </Pressable>
        </View>

        <View style={s.searchRow}>
          <Ionicons name="search" size={18} color={theme.colors.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search perspectives..."
            placeholderTextColor={theme.colors.muted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {filterKind !== 'audio' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
            {CATEGORY_TABS.map((tab) => (
              <Chip
                key={tab.key}
                label={tab.label}
                selected={selectedCategory === tab.key}
                onPress={() => setSelectedCategory(tab.key)}
              />
            ))}
          </ScrollView>
        ) : null}

        <ScrollView contentContainerStyle={s.list} keyboardShouldPersistTaps="handled">
          <View style={s.customBox}>
            <Text style={s.customLabel}>Or write a custom perspective question:</Text>
            <TextInput
              style={s.customInput}
              placeholder="e.g. What does this moment say about me?"
              placeholderTextColor={theme.colors.muted}
              value={customText}
              onChangeText={setCustomText}
              maxLength={140}
            />
            {customText.trim().length >= 5 ? (
              <Button title="Use Custom Perspective" onPress={submitCustom} />
            ) : null}
          </View>

          {filtered.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [s.promptCard, pressed && s.promptCardPressed]}
              onPress={() => pickPrompt(item)}
              accessibilityRole="button"
              accessibilityLabel={`Select perspective: ${item.text}`}
            >
              <Text style={s.promptText}>"{item.text}"</Text>
              <View style={s.promptFooter}>
                <Text style={s.categoryTag}>
                  {item.postCategory === 'voice' ? 'Voice perspective' : 'Photo perspective'}
                </Text>
                <Ionicons name="add-circle-outline" size={20} color={theme.colors.brand} />
              </View>
            </Pressable>
          ))}

          {filtered.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="chatbubbles-outline" size={40} color={theme.colors.muted} />
              <Text style={s.emptyText}>No perspectives match your search.</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.ink,
  },
  closeButton: {
    width: theme.touchTarget.min,
    height: theme.touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    height: 44,
    borderRadius: theme.radius.sm,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.ink,
  },
  tabs: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  list: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  customBox: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  customLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.ink,
  },
  customInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.ink,
    backgroundColor: theme.colors.surfaceMuted,
  },
  promptCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  promptCardPressed: {
    backgroundColor: theme.colors.brandSoft,
    borderColor: theme.colors.brand,
  },
  promptText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.ink,
    lineHeight: theme.typography.fontSize.base * 1.3,
  },
  promptFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  categoryTag: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.muted,
  },
});
