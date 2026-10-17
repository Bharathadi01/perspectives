import Ionicons from '@expo/vector-icons/Ionicons';
import { CATEGORY_CATALOG, PostCategory, RULES } from '@perspective/contracts';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api, newKey } from '../../api/client';
import { useMe } from '../../features/hooks';
import { errorMessage } from '../../lib/errors';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Label, Muted } from '../ui/Text';
import { TextField } from '../ui/TextField';
import { useToast } from '../ui/Toast';
import { PromptLibraryModal } from './PromptLibraryModal';

interface WrittenPerspectiveModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function WrittenPerspectiveModal({
  visible,
  onClose,
  onSaved,
}: WrittenPerspectiveModalProps) {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<PostCategory>('looks');
  const [focusAreas, setFocusAreas] = useState<string[]>([
    CATEGORY_CATALOG.looks.focusAreas[0].key,
  ]);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [saving, setSaving] = useState(false);

  const me = useMe();
  const toast = useToast();

  const handlePromptSelected = (selectedPrompt: string, selectedCategory?: string) => {
    setPrompt(selectedPrompt);
    if (selectedCategory && selectedCategory in CATEGORY_CATALOG) {
      const cat = selectedCategory as PostCategory;
      setCategory(cat);
      setFocusAreas([CATEGORY_CATALOG[cat].focusAreas[0].key]);
    }
    setShowPromptLibrary(false);
  };

  const toggleFocus = (key: string) => {
    if (focusAreas.includes(key)) {
      if (focusAreas.length <= RULES.minFocusAreas) {
        toast(`Pick at least ${RULES.minFocusAreas} focus area hint.`, 'error');
        return;
      }
      setFocusAreas(focusAreas.filter((f) => f !== key));
    } else {
      if (focusAreas.length >= RULES.maxFocusAreas) {
        toast(`You can pick up to ${RULES.maxFocusAreas} hints.`, 'error');
        return;
      }
      setFocusAreas([...focusAreas, key]);
    }
  };

  const handleClose = () => {
    setPrompt('');
    onClose();
  };

  const ready =
    prompt.trim().length >= RULES.promptMinLength &&
    focusAreas.length >= RULES.minFocusAreas;

  const save = async () => {
    if (!ready || saving) return;
    setSaving(true);
    try {
      await api.posts.create(
        {
          kind: 'text',
          prompt: prompt.trim(),
          category,
          focusAreas,
        },
        newKey(),
      );

      toast('Written perspective added to profile.', 'success');
      setPrompt('');
      await me.refetch();
      onSaved();
      onClose();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Add Written Perspective</Text>
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close written perspective"
            style={s.closeButton}
          >
            <Ionicons name="close" size={24} color={theme.colors.ink} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {/* Header Card Intro */}
          <View style={s.introBox}>
            <View style={s.introIconCircle}>
              <Ionicons name="chatbubble-ellipses" size={22} color={theme.colors.brand} />
            </View>
            <View style={s.introTextWrap}>
              <Text style={s.introTitle}>Ask a Thoughtful Question</Text>
              <Text style={s.introSubtitle}>
                Add a question to get honest feedback or start a genuine conversation.
              </Text>
            </View>
          </View>

          {/* Perspective Question */}
          <View style={s.section}>
            <View style={s.labelRow}>
              <Label>Perspective Question</Label>
              <Pressable onPress={() => setShowPromptLibrary(true)} style={s.browseLink}>
                <Ionicons name="sparkles" size={14} color={theme.colors.brand} />
                <Text style={s.browseLinkText}>Browse Questions</Text>
              </Pressable>
            </View>
            <TextField
              accessibilityLabel="Perspective question"
              value={prompt}
              onChangeText={setPrompt}
              placeholder="e.g. What would you assume about me from my vibe?"
              maxLength={RULES.promptMaxLength}
              counter={{ min: RULES.promptMinLength, max: RULES.promptMaxLength }}
            />
          </View>

          {/* Category Chips */}
          <View style={s.section}>
            <Label>Category</Label>
            <View style={s.chips}>
              {PostCategory.options
                .filter((c) => c !== 'voice')
                .map((c) => (
                  <Chip
                    key={c}
                    label={CATEGORY_CATALOG[c].label}
                    selected={category === c}
                    onPress={() => {
                      setCategory(c);
                      setFocusAreas([CATEGORY_CATALOG[c].focusAreas[0].key]);
                    }}
                  />
                ))}
            </View>
          </View>

          {/* Focus Areas */}
          <View style={s.section}>
            <Label>What should people focus on?</Label>
            <Muted>Choose 1 to {RULES.maxFocusAreas} hints to guide thoughtful perspectives.</Muted>
            <View style={s.chips}>
              {CATEGORY_CATALOG[category].focusAreas.map((f) => (
                <Chip
                  key={f.key}
                  label={f.label}
                  selected={focusAreas.includes(f.key)}
                  onPress={() => toggleFocus(f.key)}
                />
              ))}
            </View>
          </View>

          {/* Save Button */}
          <View style={s.footer}>
            <Button
              title={saving ? 'Saving…' : 'Add to Profile'}
              loading={saving}
              disabled={!ready}
              onPress={() => void save()}
            />
          </View>
        </ScrollView>

        <PromptLibraryModal
          visible={showPromptLibrary}
          filterKind="photo"
          onClose={() => setShowPromptLibrary(false)}
          onSelect={handlePromptSelected}
        />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.ink,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  content: {
    padding: theme.spacing.base,
    gap: theme.spacing.lg,
  },
  introBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.brandSoft,
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    gap: theme.spacing.md,
  },
  introIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTextWrap: {
    flex: 1,
    gap: 2,
  },
  introTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.brand,
  },
  introSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.ink,
    opacity: 0.8,
  },
  section: {
    gap: theme.spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  browseLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.brandSoft,
  },
  browseLinkText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.brand,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  footer: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
});
