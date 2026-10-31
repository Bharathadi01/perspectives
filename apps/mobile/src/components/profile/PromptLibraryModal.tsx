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
import { ChoiceChip, NO_WEB_OUTLINE, PillButton } from '../../features/onboarding/ui';
import { theme } from '../../theme';

import { PROMPT_LIBRARY, type PromptItem } from '../../lib/promptLibrary';

const CATEGORY_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All questions' },
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
          <Text style={s.headerTitle} accessibilityRole="header">
            Pick a question
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={s.closeButton}>
            <Ionicons name="close" size={24} color={theme.editorial.colors.ink} />
          </Pressable>
        </View>

        <View style={s.searchRow}>
          <Ionicons name="search" size={18} color={theme.editorial.colors.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search questions"
            accessibilityLabel="Search questions"
            placeholderTextColor={theme.editorial.colors.muted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={theme.editorial.colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {filterKind !== 'audio' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
            {CATEGORY_TABS.map((tab) => (
              <ChoiceChip
                key={tab.key}
                size="sm"
                role="radio"
                label={tab.label}
                selected={selectedCategory === tab.key}
                onPress={() => setSelectedCategory(tab.key)}
              />
            ))}
          </ScrollView>
        ) : null}

        <ScrollView contentContainerStyle={s.list} keyboardShouldPersistTaps="handled">
          <View style={s.customBox}>
            <Text style={s.customLabel}>Or write your own question</Text>
            <TextInput
              style={s.customInput}
              placeholder="e.g. What does this moment say about me?"
              placeholderTextColor={theme.editorial.colors.muted}
              value={customText}
              onChangeText={setCustomText}
              maxLength={140}
            />
            {customText.trim().length >= 5 ? (
              <PillButton label="Use this question" wide onPress={submitCustom} />
            ) : null}
          </View>

          {filtered.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [s.promptCard, pressed && s.promptCardPressed]}
              onPress={() => pickPrompt(item)}
              accessibilityRole="button"
              accessibilityLabel={`Use this question: ${item.text}`}
            >
              <Text style={s.promptText}>{item.text}</Text>
              <View style={s.promptFooter}>
                <Text style={s.categoryTag}>{item.postCategory === 'voice' ? 'For a voice card' : 'For a photo'}</Text>
                <Ionicons name="add-circle-outline" size={20} color={theme.editorial.colors.ink} />
              </View>
            </Pressable>
          ))}

          {filtered.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="chatbubbles-outline" size={40} color={theme.editorial.colors.muted} />
              <Text style={s.emptyText}>No questions match your search.</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.editorial.colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerTitle: { fontFamily: theme.editorial.fonts.display, fontSize: 22, color: theme.editorial.colors.ink },
  closeButton: {
    width: theme.touchTarget.min,
    height: theme.touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.editorial.colors.sand,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    height: 46,
    borderRadius: theme.radius.pill,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.editorial.fonts.body,
    fontSize: 15,
    color: theme.editorial.colors.ink,
    ...NO_WEB_OUTLINE,
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
    backgroundColor: theme.editorial.colors.surface,
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.editorial.colors.line,
    gap: theme.spacing.sm,
  },
  customLabel: { fontFamily: theme.editorial.fonts.bodySemibold, fontSize: 14, color: theme.editorial.colors.ink },
  customInput: {
    borderWidth: 1,
    borderColor: theme.editorial.colors.line,
    borderRadius: 14,
    padding: theme.spacing.md,
    fontFamily: theme.editorial.fonts.display,
    fontSize: 18,
    color: theme.editorial.colors.ink,
    backgroundColor: theme.editorial.colors.paper,
    ...NO_WEB_OUTLINE,
  },
  promptCard: {
    backgroundColor: theme.editorial.colors.surface,
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.editorial.colors.line,
    gap: theme.spacing.sm,
  },
  promptCardPressed: {
    backgroundColor: theme.editorial.colors.sand,
    borderColor: theme.editorial.colors.ink,
  },
  promptText: { fontFamily: theme.editorial.fonts.display, fontSize: 18, lineHeight: 24, color: theme.editorial.colors.ink },
  promptFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  categoryTag: {
    fontFamily: theme.editorial.fonts.bodySemibold,
    fontSize: 11,
    color: theme.editorial.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyText: { fontFamily: theme.editorial.fonts.body, fontSize: 16, color: theme.editorial.colors.muted },
});
