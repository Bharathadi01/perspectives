import Ionicons from '@expo/vector-icons/Ionicons';
import { CATEGORY_CATALOG, PostCategory, RULES } from '@perspective/contracts';
import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCreatePost, useUploadMedia } from '../../features/hooks';
import { errorMessage } from '../../lib/errors';
import { PickedMedia, pickPhoto } from '../../lib/media';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Label, Muted } from '../ui/Text';
import { TextField } from '../ui/TextField';
import { useToast } from '../ui/Toast';
import { PromptLibraryModal } from './PromptLibraryModal';

interface PhotoUploadModalProps {
  visible: boolean;
  isPrimary?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function PhotoUploadModal({
  visible,
  isPrimary,
  onClose,
  onSaved,
}: PhotoUploadModalProps) {
  const [photo, setPhoto] = useState<PickedMedia | null>(null);
  const [prompt, setPrompt] = useState(
    isPrimary ? 'What vibe does this photo give you?' : 'What would you assume about me from this picture?',
  );
  const [category, setCategory] = useState<PostCategory>('looks');
  const [focusAreas, setFocusAreas] = useState<string[]>(['first_look']);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);

  const upload = useUploadMedia();
  const create = useCreatePost();
  const toast = useToast();

  const busy = upload.isPending || create.isPending;
  const ready = !!photo && prompt.trim().length >= RULES.promptMinLength && focusAreas.length >= RULES.minFocusAreas;

  const choosePhoto = async () => {
    try {
      const picked = await pickPhoto('library');
      if (picked) setPhoto(picked);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not open your photos.', 'error');
    }
  };

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
    if (!photo) return;
    try {
      const { mediaId } = await upload.run({
        kind: 'photo',
        mimeType: photo.mimeType,
        dataBase64: photo.dataBase64,
      });

      await create.run({
        kind: 'photo',
        mediaId,
        prompt: prompt.trim(),
        category,
        focusAreas,
      });

      toast(isPrimary ? 'Featured photo saved.' : 'Photo post added.', 'success');
      setPhoto(null);
      onSaved();
      onClose();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const handleClose = () => {
    setPhoto(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.headerTitle}>{isPrimary ? 'Add Featured Photo' : 'Add Photo & Question'}</Text>
          <Pressable onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close photo upload" style={s.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.ink} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => void choosePhoto()}
            accessibilityRole="button"
            accessibilityLabel={photo ? 'Change photo' : 'Select a photo from library'}
            style={s.photoPicker}
          >
            {photo ? (
              <View style={s.previewContainer}>
                <Image source={{ uri: photo.uri }} style={s.previewImage} accessibilityIgnoresInvertColors />
                <View style={s.changeBadge}>
                  <Ionicons name="camera" size={16} color={theme.colors.onDark} />
                  <Text style={s.changeBadgeText}>Change</Text>
                </View>
              </View>
            ) : (
              <View style={s.placeholder}>
                <Ionicons name="image-outline" size={44} color={theme.colors.muted} />
                <Text style={s.placeholderTitle}>Tap to select a photo</Text>
                <Text style={s.placeholderSub}>Choose a clear photo that expresses your personality</Text>
              </View>
            )}
          </Pressable>

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

          <View style={s.section}>
            <Label>What should givers focus on?</Label>
            <Muted>Choose 1 to {RULES.maxFocusAreas} hints to guide thoughtful perspectives.</Muted>
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
              title={isPrimary ? 'Save Featured Photo' : 'Add to Profile'}
              disabled={!ready}
              loading={busy}
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
  photoPicker: {
    borderRadius: theme.radius.media,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  previewContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 5,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  changeBadge: {
    position: 'absolute',
    bottom: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
  },
  changeBadgeText: {
    color: theme.colors.onDark,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  placeholder: {
    aspectRatio: 4 / 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.radius.media,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  placeholderTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.ink,
    marginTop: theme.spacing.xs,
  },
  placeholderSub: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    textAlign: 'center',
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
