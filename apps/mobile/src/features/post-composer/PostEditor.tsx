import Ionicons from '@expo/vector-icons/Ionicons';
import { RULES, type Post, type PostCategory } from '@perspective/contracts';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api, newKey } from '../../api/client';
import { PromptLibraryModal } from '../../components/profile/PromptLibraryModal';
import { useToast } from '../../components/ui/Toast';
import { useUpdatePost } from '../hooks';
import { errorMessage } from '../../lib/errors';
import { success } from '../../lib/haptics';
import { useVoiceRecorder } from '../../lib/media';
import { theme } from '../../theme';
import { VoiceStrip } from '../profile-editor/VoiceStrip';
import { CategorySheet } from './CategorySheet';
import { ComposerShell } from './ComposerShell';
import { FocusAreaSheet } from './FocusAreaSheet';
import { StepQuestion } from './StepQuestion';
import { StepVoice } from './StepVoice';
import { problemWithStep, reconcileFocusAreas, STEP_PROBLEM_MESSAGE } from './composer';

interface PostEditorProps {
  visible: boolean;
  post: Post | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

/**
 * Changing a card you already have.
 *
 * Editing is not a wizard — you came here to change one thing — so it is a
 * single screen. It reuses the composer's steps so the question looks the same
 * whether you are writing it or rewriting it.
 */
export function PostEditor({ visible, post, onClose, onSaved }: PostEditorProps) {
  const toast = useToast();
  const update = useUpdatePost();
  const recorder = useVoiceRecorder();

  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<PostCategory>('looks');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [removeAudio, setRemoveAudio] = useState(false);
  const [sheet, setSheet] = useState<'none' | 'library' | 'category' | 'focus' | 'voice'>('none');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !post) return;
    setPrompt(post.prompt);
    setCategory(post.category);
    setFocusAreas([...post.focusAreas]);
    setRemoveAudio(false);
    setSheet('none');
    recorder.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, post?.id]);

  // A voice-only card keeps its clip in mediaUrl; a photo card keeps an attached
  // clip in audioMediaUrl.
  const existingAudio = (post?.kind === 'audio' ? post.mediaUrl : post?.audioMediaUrl) ?? null;

  if (!post) return null;

  const hasAudio = !!recorder.result || (!!existingAudio && !removeAudio);
  const problem = problemWithStep('question', {
    kind: post.kind,
    prompt,
    category,
    focusAreas,
    hasPhoto: !!post.mediaUrl,
    hasRecording: hasAudio,
  });

  const changeCategory = (next: PostCategory) => {
    setCategory(next);
    setFocusAreas((current) => reconcileFocusAreas(next, current));
  };

  const save = async () => {
    if (problem) {
      toast(STEP_PROBLEM_MESSAGE[problem], 'info');
      return;
    }
    setSaving(true);
    try {
      let audioMediaId: string | null | undefined;
      if (recorder.result) {
        const uploaded = await api.media.upload(
          {
            kind: 'audio',
            mimeType: recorder.result.mimeType,
            dataBase64: recorder.result.dataBase64,
            durationSec: recorder.result.durationSec,
          },
          newKey(),
        );
        audioMediaId = uploaded.mediaId;
      } else if (removeAudio && existingAudio) {
        audioMediaId = null;
      }

      await update.run({
        postId: post.id,
        input: { prompt: prompt.trim(), audioMediaId, category, focusAreas },
      });
      success();
      toast('Card updated.', 'success');
      await onSaved();
      onClose();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const recordingVoice = sheet === 'voice';

  const overlays = (
    <>
      <CategorySheet
        visible={sheet === 'category'}
        value={category}
        exclude={post.kind === 'text' ? ['voice'] : []}
        onClose={() => setSheet('none')}
        onChange={changeCategory}
      />
      <FocusAreaSheet
        visible={sheet === 'focus'}
        category={category}
        value={focusAreas}
        onClose={() => setSheet('none')}
        onChange={setFocusAreas}
      />
      <PromptLibraryModal
        visible={sheet === 'library'}
        filterKind={post.kind === 'audio' ? 'audio' : 'photo'}
        onClose={() => setSheet('none')}
        onSelect={(selected, selectedCategory, selectedFocus) => {
          setPrompt(selected);
          setCategory(selectedCategory);
          setFocusAreas(reconcileFocusAreas(selectedCategory, selectedFocus));
        }}
      />
    </>
  );

  // One modal for the whole screen. Recording a voice note swaps what is inside
  // it rather than mounting a second modal, which would close and reopen the screen.
  return (
    <ComposerShell
      visible={visible}
      title={recordingVoice ? (recorder.isRecording ? 'Listening…' : 'Your voice note') : 'Edit this card'}
      subtitle={recordingVoice && !recorder.isRecording ? `Up to ${RULES.audioMaxSeconds} seconds.` : undefined}
      stepIndex={recordingVoice ? 1 : 0}
      stepCount={1}
      onBack={() => {
        if (recorder.isRecording) return;
        if (recordingVoice) setSheet('none');
        else onClose();
      }}
      primary={
        recordingVoice
          ? {
              title: recorder.isRecording ? 'Stop recording' : 'Use this recording',
              onPress: recorder.isRecording ? () => void recorder.stop() : () => setSheet('none'),
              incomplete: !recorder.isRecording && !recorder.result,
            }
          : { title: 'Save', onPress: () => void save(), loading: saving, incomplete: !!problem }
      }
      overlays={overlays}
    >
      {recordingVoice ? (
        <StepVoice
          prompt={prompt}
          recording={recorder.result}
          isRecording={recorder.isRecording}
          elapsed={recorder.elapsed}
          error={recorder.error}
          onStart={() => void recorder.start()}
          onStop={() => void recorder.stop()}
          onReset={() => recorder.reset()}
        />
      ) : (
        <>
          <StepQuestion
            prompt={prompt}
            category={category}
            focusAreas={focusAreas}
            lockCategory={post.kind === 'audio'}
            onChangePrompt={setPrompt}
            onOpenLibrary={() => setSheet('library')}
            onOpenCategory={() => setSheet('category')}
            onOpenFocus={() => setSheet('focus')}
          />

          {post.kind === 'text' ? null : (
            <View style={s.voice}>
              <Text style={s.kicker}>VOICE NOTE</Text>
              {hasAudio ? (
                <View style={s.row}>
                  {recorder.result || !existingAudio ? (
                    <>
                      <Text style={s.rowText}>New recording ready</Text>
                      <View style={s.spacer} />
                    </>
                  ) : (
                    // The same player as on the cards, so a voice note looks the same everywhere.
                    <View style={s.spacer}>
                      <VoiceStrip
                        path={existingAudio}
                        durationSec={post.kind === 'audio' ? post.durationSec : post.audioDurationSec}
                        active
                        onPlay={() => undefined}
                        variant="bare"
                      />
                    </View>
                  )}
                  {post.kind === 'audio' ? null : (
                    <Pressable
                      // Removing unmounts the player, which stops and releases the clip.
                      onPress={() => {
                        recorder.reset();
                        setRemoveAudio(true);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Remove the voice note"
                      style={({ pressed }) => [s.remove, pressed && s.pressed]}
                    >
                      <Text style={s.removeText}>Remove</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <Pressable
                  onPress={() => setSheet('voice')}
                  accessibilityRole="button"
                  accessibilityLabel="Add a voice note"
                  style={({ pressed }) => [s.add, pressed && s.pressed]}
                >
                  <Ionicons name="mic-outline" size={theme.iconSize.lg} color={theme.editorial.colors.accent} />
                  <Text style={s.addText}>Add a voice note</Text>
                </Pressable>
              )}
            </View>
          )}
        </>
      )}
    </ComposerShell>
  );
}

const s = StyleSheet.create({
  voice: { gap: theme.spacing.sm },
  kicker: { ...theme.editorialText.overline, color: theme.editorial.colors.muted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: theme.touchTarget.min + 8,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.editorial.colors.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.editorial.colors.line,
    borderRadius: theme.radius.control,
  },
  rowText: { ...theme.editorialText.callout, color: theme.editorial.colors.ink },
  spacer: { flex: 1 },
  remove: { minHeight: theme.touchTarget.comfortable, justifyContent: 'center' },
  removeText: { ...theme.editorialText.calloutStrong, color: theme.editorial.colors.accentText },
  pressed: { opacity: theme.opacity.pressed },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: theme.touchTarget.min + 8,
    paddingHorizontal: theme.spacing.md,
    borderWidth: theme.borderWidth.thick,
    borderStyle: 'dashed',
    borderColor: theme.editorial.colors.line,
    borderRadius: theme.radius.control,
  },
  addText: { ...theme.editorialText.calloutStrong, fontSize: theme.typography.fontSize.base, color: theme.editorial.colors.ink },
});
