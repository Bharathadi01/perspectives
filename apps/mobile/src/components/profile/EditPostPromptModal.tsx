import Ionicons from '@expo/vector-icons/Ionicons';
import { CATEGORY_CATALOG, Post, PostCategory, RULES } from '@perspective/contracts';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useUpdatePost } from '../../features/hooks';
import { errorMessage } from '../../lib/errors';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Label, Muted } from '../ui/Text';
import { TextField } from '../ui/TextField';
import { useToast } from '../ui/Toast';
import { PromptLibraryModal } from './PromptLibraryModal';

interface EditPostPromptModalProps {
  visible: boolean;
  post: Post | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditPostPromptModal({
  visible,
  post,
  onClose,
  onSaved,
}: EditPostPromptModalProps) {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<PostCategory>('looks');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);

  const update = useUpdatePost();
  const toast = useToast();

  useEffect(() => {
    if (post) {
      setPrompt(post.prompt);
      setCategory(post.category);
      setFocusAreas(post.focusAreas);
    }
  }, [post]);

  if (!post) return null;

  const ready = prompt.trim().length >= RULES.promptMinLength && focusAreas.length >= RULES.minFocusAreas;

  const handlePromptSelected = (
    selectedPrompt: string,
    cat: PostCategory,
    focus: string[],
  ) => {
    setPrompt(selectedPrompt);
    setCategory(cat);
    setFocusAreas(focus);
  };

  const toggleFocus = (key: string) => {
    setFocusAreas((cur) =>
      cur.includes(key)
        ? cur.filter((k) => k !== key)
        : cur.length < RULES.maxFocusAreas
          ? [...cur, key]
          : cur,
    );
  };

  const save = async () => {
    try {
      await update.run({
        postId: post.id,
        input: {
          prompt: prompt.trim(),
          category,
          focusAreas,
        },
      });

      toast('Perspective updated.', 'success');
      onSaved();
      onClose();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Edit Perspective</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close edit perspective" style={s.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.ink} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.section}>
            <View style={s.labelRow}>
              <Label>Perspective Question</Label>
              <Pressable onPress={() => setShowPromptLibrary(true)} style={s.browseLink}>
                <Ionicons name="sparkles" size={14} color={theme.colors.brand} />
                <Text style={s.browseLinkText}>Browse Perspectives</Text>
              </Pressable>
            </View>
            <TextField
              label="Perspective question"
              value={prompt}
              onChangeText={setPrompt}
              placeholder="e.g. What vibe does this photo give you?"
              maxLength={RULES.promptMaxLength}
              counter={{ min: RULES.promptMinLength, max: RULES.promptMaxLength }}
            />
          </View>

          {post.kind !== 'audio' ? (
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
          ) : null}

          <View style={s.section}>
            <Label>What should givers focus on?</Label>
            <Muted>Choose 1 to {RULES.maxFocusAreas} hints.</Muted>
            <View style={s.chips}>
              {CATEGORY_CATALOG[category].focusAreas.map((f) => (
                <Chip
                  key={f.key}
                  label={f.label}
                  selected={focusAreas.includes(f.key)}
                  disabled={!focusAreas.includes(f.key) && focusAreas.length >= RULES.maxFocusAreas}
                  onPress={() => toggleFocus(f.key)}
                />
              ))}
            </View>
          </View>

          <View style={s.footer}>
            <Button
              title="Save Changes"
              disabled={!ready}
              loading={update.isPending}
              onPress={() => void save()}
            />
          </View>
        </ScrollView>

        <PromptLibraryModal
          visible={showPromptLibrary}
          filterKind={post.kind}
          onClose={() => setShowPromptLibrary(false)}
          onSelect={handlePromptSelected}
        />
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
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
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
    gap: theme.spacing.xs,
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
  },
});
