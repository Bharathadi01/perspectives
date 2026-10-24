import { RULES, type PostCategory, type PostKind } from '@perspective/contracts';
import React, { useEffect, useMemo, useState } from 'react';
import { api, newKey } from '../../api/client';
import { PromptLibraryModal } from '../../components/profile/PromptLibraryModal';
import { useToast } from '../../components/ui/Toast';
import { useCreatePost } from '../hooks';
import { errorMessage } from '../../lib/errors';
import { success, tap } from '../../lib/haptics';
import { pickPhoto, useVoiceRecorder, type PickedMedia } from '../../lib/media';
import { CategorySheet } from './CategorySheet';
import { ComposerShell } from './ComposerShell';
import { FocusAreaSheet } from './FocusAreaSheet';
import { StepPhoto } from './StepPhoto';
import { StepQuestion } from './StepQuestion';
import { StepVoice } from './StepVoice';
import {
  buildCreateInput,
  defaultFocusAreas,
  problemWithStep,
  reconcileFocusAreas,
  stepsFor,
  STEP_PROBLEM_MESSAGE,
} from './composer';

interface PostComposerProps {
  visible: boolean;
  kind: PostKind;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

const STARTING_CATEGORY: Record<PostKind, PostCategory> = {
  photo: 'looks',
  audio: 'voice',
  text: 'vibe',
};

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  photo: { title: 'Pick a photo', subtitle: 'This is what people will respond to.' },
  question: { title: 'What should people answer?' },
  voiceOptional: { title: 'Add your voice', subtitle: 'Optional. It sits on the same card.' },
  voiceRequired: { title: 'Record your voice', subtitle: `Up to ${RULES.audioMaxSeconds} seconds.` },
  recording: { title: 'Listening…' },
};

/**
 * Making one card, one question per screen.
 *
 * The old modal asked everything at once and made Written and Voice look like a
 * choice between two kinds of card. They never were: a photo card always has a
 * written question, and a voice note is something you can add on top. Here that
 * is what it looks like — the voice note is the last, skippable step.
 */
export function PostComposer({ visible, kind, onClose, onSaved }: PostComposerProps) {
  const toast = useToast();
  const createPost = useCreatePost();
  const recorder = useVoiceRecorder();

  const steps = useMemo(() => stepsFor(kind), [kind]);
  const [stepIndex, setStepIndex] = useState(0);
  const [photo, setPhoto] = useState<PickedMedia | null>(null);
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<PostCategory>(STARTING_CATEGORY[kind]);
  const [focusAreas, setFocusAreas] = useState<string[]>(defaultFocusAreas(STARTING_CATEGORY[kind]));
  const [sheet, setSheet] = useState<'none' | 'library' | 'category' | 'focus'>('none');
  const [saving, setSaving] = useState(false);

  // Every open starts clean. The old modal kept its state between opens, so the
  // question and category from one card leaked into the next.
  useEffect(() => {
    if (!visible) return;
    setStepIndex(0);
    setPhoto(null);
    setPrompt('');
    setCategory(STARTING_CATEGORY[kind]);
    setFocusAreas(defaultFocusAreas(STARTING_CATEGORY[kind]));
    setSheet('none');
    recorder.reset();
    // recorder identity is stable for the life of the component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, kind]);

  const step = steps[stepIndex];
  const state = {
    kind,
    prompt,
    category,
    focusAreas,
    hasPhoto: !!photo,
    hasRecording: !!recorder.result,
  };
  const problem = problemWithStep(step, state);
  const last = stepIndex === steps.length - 1;

  const changeCategory = (next: PostCategory) => {
    setCategory(next);
    // Focus areas belong to a category; carrying the old ones over produced a
    // payload the server refuses.
    setFocusAreas((current) => reconcileFocusAreas(next, current));
  };

  const choosePhoto = async () => {
    try {
      const picked = await pickPhoto('library');
      if (picked) setPhoto(picked);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const back = () => {
    if (recorder.isRecording) return;
    if (stepIndex === 0) {
      onClose();
      return;
    }
    setStepIndex((i) => i - 1);
  };

  const save = async () => {
    setSaving(true);
    try {
      let mediaId: string | null = null;
      if (photo) {
        const uploaded = await api.media.upload(
          { kind: 'photo', mimeType: photo.mimeType, dataBase64: photo.dataBase64 },
          newKey(),
        );
        mediaId = uploaded.mediaId;
      }

      let audioMediaId: string | null = null;
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
      }

      await createPost.run(buildCreateInput(state, { mediaId, audioMediaId }));
      success();
      toast('Card added to your profile.', 'success');
      await onSaved();
      onClose();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (problem) {
      toast(STEP_PROBLEM_MESSAGE[problem], 'info');
      return;
    }
    if (last) {
      void save();
      return;
    }
    tap();
    setStepIndex((i) => i + 1);
  };

  const copyKey =
    step === 'voice'
      ? recorder.isRecording
        ? 'recording'
        : kind === 'audio'
          ? 'voiceRequired'
          : 'voiceOptional'
      : step;
  const copy = TITLES[copyKey] ?? TITLES.question;

  const primaryTitle = recorder.isRecording
    ? 'Stop recording'
    : last
      ? kind === 'text'
        ? 'Add the card'
        : 'Add the card'
      : 'Next';

  const overlays = (
    <>
      <CategorySheet
        visible={sheet === 'category'}
        value={category}
        // Same as before the redesign: a photo may be filed under Voice (the old
        // screen did this itself when a clip was attached); a written card may not.
        exclude={kind === 'text' ? ['voice'] : []}
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
        filterKind={kind === 'audio' ? 'audio' : 'photo'}
        onClose={() => setSheet('none')}
        onSelect={(selected, selectedCategory, selectedFocus) => {
          setPrompt(selected);
          setCategory(selectedCategory);
          setFocusAreas(reconcileFocusAreas(selectedCategory, selectedFocus));
        }}
      />
    </>
  );

  return (
    <ComposerShell
      visible={visible}
      title={copy.title}
      subtitle={copy.subtitle}
      stepIndex={stepIndex}
      stepCount={steps.length}
      onBack={back}
      primary={{
        title: primaryTitle,
        onPress: recorder.isRecording ? () => void recorder.stop() : next,
        loading: saving,
        incomplete: !recorder.isRecording && !!problem,
      }}
      secondary={
        step === 'voice' && kind !== 'audio' && !recorder.result && !recorder.isRecording
          ? { title: 'Skip the voice note', onPress: () => void save() }
          : undefined
      }
      overlays={overlays}
    >
      {step === 'photo' ? <StepPhoto photo={photo} onPick={() => void choosePhoto()} /> : null}

      {step === 'question' ? (
        <StepQuestion
          photo={photo}
          prompt={prompt}
          category={category}
          focusAreas={focusAreas}
          lockCategory={kind === 'audio'}
          onChangePrompt={setPrompt}
          onOpenLibrary={() => setSheet('library')}
          onOpenCategory={() => setSheet('category')}
          onOpenFocus={() => setSheet('focus')}
          onChangePhoto={photo ? () => void choosePhoto() : undefined}
        />
      ) : null}

      {step === 'voice' ? (
        <StepVoice
          photo={photo}
          prompt={prompt}
          recording={recorder.result}
          isRecording={recorder.isRecording}
          elapsed={recorder.elapsed}
          error={recorder.error}
          onStart={() => void recorder.start()}
          onStop={() => void recorder.stop()}
          onReset={() => recorder.reset()}
        />
      ) : null}
    </ComposerShell>
  );
}
