import Ionicons from '@expo/vector-icons/Ionicons';
import { CATEGORY_CATALOG, PostCategory, PostKind, RULES } from '@perspective/contracts';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCreatePost, useUploadMedia } from '../../features/hooks';
import { errorMessage } from '../../lib/errors';
import { PickedMedia, pickPhoto, useVoiceRecorder } from '../../lib/media';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Label, Muted } from '../ui/Text';
import { TextField } from '../ui/TextField';
import { useToast } from '../ui/Toast';

interface PostFormProps {
  /** The first post must be a photo. */
  photoOnly?: boolean;
  onCreated: () => void;
}

/**
 * A post is what people give perspectives on: a photo or a voice clip (15s max), a prompt or
 * question, a category, and the focus areas you want covered (they become the givers' hints).
 */
export function PostForm({ photoOnly, onCreated }: PostFormProps) {
  const [kind, setKind] = useState<PostKind>('photo');
  const [photo, setPhoto] = useState<PickedMedia | null>(null);
  const recorder = useVoiceRecorder();
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<PostCategory>('style');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const upload = useUploadMedia();
  const create = useCreatePost();
  const toast = useToast();

  const media = kind === 'photo' ? photo : recorder.result;
  const promptOk = prompt.trim().length >= RULES.promptMinLength;
  const ready = !!media && promptOk && focusAreas.length >= RULES.minFocusAreas;

  const chooseCategory = (c: PostCategory) => {
    setCategory(c);
    setFocusAreas([]);
  };
  const toggleFocus = (key: string) =>
    setFocusAreas((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : cur.length < RULES.maxFocusAreas ? [...cur, key] : cur));

  const choosePhoto = async () => {
    try {
      const picked = await pickPhoto('library');
      if (picked) setPhoto(picked);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not open your photos.', 'error');
    }
  };

  const publish = async () => {
    if (!media) return;
    try {
      const { mediaId } = await upload.run({
        kind,
        mimeType: media.mimeType,
        dataBase64: media.dataBase64,
        ...(kind === 'audio' && recorder.result ? { durationSec: recorder.result.durationSec } : {}),
      });
      await create.run({ kind, mediaId, prompt: prompt.trim(), category, focusAreas });
      toast('Post published.', 'success');
      onCreated();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <View style={s.form}>
      {!photoOnly ? (
        <View style={s.chips}>
          <Chip label="Photo" selected={kind === 'photo'} onPress={() => setKind('photo')} />
          <Chip label="Voice" selected={kind === 'audio'} onPress={() => setKind('audio')} />
        </View>
      ) : null}

      {kind === 'photo' ? (
        <Pressable onPress={() => void choosePhoto()} accessibilityRole="button" accessibilityLabel={photo ? 'Change photo' : 'Add a photo'} style={s.photoPick}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={s.preview} accessibilityIgnoresInvertColors />
          ) : (
            <View style={s.placeholder}>
              <Ionicons name="image-outline" size={36} color={theme.colors.muted} />
              <Text style={s.placeholderText}>Add a photo</Text>
            </View>
          )}
        </Pressable>
      ) : (
        <View style={s.recorder}>
          <Text style={s.timer}>
            {recorder.isRecording
              ? `Recording… ${Math.ceil(RULES.audioMaxSeconds - recorder.elapsed)}s left`
              : recorder.result
                ? `Recorded ${recorder.result.durationSec.toFixed(1)}s`
                : `Up to ${RULES.audioMaxSeconds} seconds`}
          </Text>
          <Button
            title={recorder.isRecording ? 'Stop' : recorder.result ? 'Record again' : 'Start recording'}
            variant={recorder.isRecording ? 'danger' : 'secondary'}
            onPress={() => void (recorder.isRecording ? recorder.stop() : recorder.start())}
          />
          {recorder.error ? <Text style={s.error}>{recorder.error}</Text> : null}
        </View>
      )}

      <TextField
        label="Your prompt or question"
        value={prompt}
        onChangeText={setPrompt}
        placeholder={kind === 'photo' ? 'e.g. Does this outfit work for a first date?' : 'e.g. How does my voice come across?'}
        maxLength={RULES.promptMaxLength}
        counter={{ min: RULES.promptMinLength, max: RULES.promptMaxLength }}
      />

      <View style={s.group}>
        <Label>Category</Label>
        <View style={s.chips}>
          {PostCategory.options.map((c) => (
            <Chip key={c} label={CATEGORY_CATALOG[c].label} selected={category === c} onPress={() => chooseCategory(c)} />
          ))}
        </View>
      </View>

      <View style={s.group}>
        <Label>What should people focus on?</Label>
        <Muted>Pick up to {RULES.maxFocusAreas}. These become the hints givers see.</Muted>
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

      <Button title="Publish post" onPress={() => void publish()} disabled={!ready} loading={upload.isPending || create.isPending} />
    </View>
  );
}

const s = StyleSheet.create({
  form: { gap: theme.spacing.lg },
  group: { gap: theme.spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  photoPick: { borderRadius: theme.radius.media, overflow: 'hidden', backgroundColor: theme.colors.surface },
  preview: { width: '100%', aspectRatio: 4 / 5 },
  placeholder: { aspectRatio: 4 / 5, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed', borderRadius: theme.radius.media },
  placeholderText: { color: theme.colors.muted, fontSize: theme.typography.fontSize.base },
  recorder: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.media, padding: theme.spacing.lg, gap: theme.spacing.md, alignItems: 'stretch' },
  timer: { fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.ink, textAlign: 'center' },
  error: { color: theme.colors.danger, fontSize: theme.typography.fontSize.sm, textAlign: 'center' },
});
