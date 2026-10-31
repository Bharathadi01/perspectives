import Ionicons from '@expo/vector-icons/Ionicons';
import {
  CATEGORY_CATALOG,
  PostCategory,
  RULES,
  type MyProfile,
  type Post,
} from '@perspective/contracts';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../api/client';
import { useAudioPlayer } from '../../../components/profile/useAudioPlayer';
import { errorMessage } from '../../../lib/errors';
import { success, warn } from '../../../lib/haptics';
import { pickPhoto, useVoiceRecorder } from '../../../lib/media';
import { theme } from '../../../theme';
import { useCreatePost, useUploadMedia } from '../../hooks';
import { defaultFocusAreas, reconcileFocusAreas, toggleFocusArea } from '../../post-composer/composer';
import { PhotoGlyph, Spark } from '../art';
import { usePhotoPostDraft } from '../drafts';
import { STEP_PROGRESS } from '../flow';
import { Animate, Float, Pop, PulseRing, Rise, Tap, keyframes, useMotionAllowed, useTypewriter } from '../motion';
import { stepHref, useStepNav } from '../nav';
import { CheckBox, ChoiceChip, FieldCard, PillButton, SHOWN, StepScreen, Stagger, ob } from '../ui';

const e = theme.editorial;
const c = e.colors;
const f = e.fonts;

const SAMPLE_QUESTION = 'Does this jacket work on me, or is it wearing me?';

// ---------- 23 · posts intro ----------

export function PostsIntro() {
  const { next } = useStepNav('posts');
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const stage = Math.min(400, Math.max(300, height * 0.45));
  const typed = useTypewriter(SAMPLE_QUESTION, { delay: 500, duration: 1100 });
  return (
    <View style={[s.introScreen, { paddingTop: insets.top + 40, paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
      <View style={{ height: stage }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={s.introCardTilt}>
          <Rise delay={100}>
            <View style={s.introCard}>
              <Text style={s.introQuestion}>{typed}</Text>
              <Rise delay={900} duration={600}>
                <View style={[s.photo, { height: stage - 170 }]}>
                  <PhotoGlyph size={36} />
                </View>
              </Rise>
            </View>
          </Rise>
        </View>
        <View style={[s.introBubble, { top: stage - 152 }]}>
          <Pop delay={1500} duration={550}>
            <Float duration={4000} delay={2200} distance={6}>
              <View style={s.inkBubble}>
                <Text style={[ob.clayLabel, { color: c.onInkMuted }]}>A perspective</Text>
                <Text style={s.inkBubbleText}>“It works on you. Roll the sleeves once and it’s perfect.”</Text>
              </View>
            </Float>
          </Pop>
        </View>
      </View>
      <Rise delay={1900}>
        <Text style={[ob.title, s.introTitle]} accessibilityRole="header">
          Now show people what you’d like perspectives on
        </Text>
      </Rise>
      <Rise delay={2000}>
        <Text style={[ob.bodyMuted, s.introBody]}>Each post is a photo or a short voice clip, with a question for the people who see it.</Text>
      </Rise>
      <View style={s.flex} />
      <PillButton label="Continue" onPress={() => next()} delay={2200} pulseDelay={3000} />
    </View>
  );
}

// ---------- 24 · the photo and its question ----------

export function PhotoPostStep() {
  const { goTo, extra } = useStepNav('first-post');
  const draft = usePhotoPostDraft();
  const [error, setError] = useState<string | null>(null);
  const { height } = useWindowDimensions();
  const photoH = Math.min(330, Math.max(220, height * 0.36));
  const valid = !!draft.photo && draft.prompt.trim().length >= RULES.promptMinLength;

  const choose = async () => {
    setError(null);
    try {
      const picked = await pickPhoto('library');
      if (picked) draft.set({ photo: picked });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <StepScreen
      progress={STEP_PROGRESS['first-post']}
      title={extra ? 'Add a photo' : 'Add your first photo'}
      subtitle={extra ? 'Ask what you’d like to know about it.' : 'Your first post needs a photo. Ask what you’d like to know about it.'}
      note={SHOWN}
      error={error ?? (draft.photo && draft.prompt.trim().length > 0 && !valid ? `Your question needs at least ${RULES.promptMinLength} characters.` : null)}
      next={{ onPress: () => goTo('focus', extra ? { extra: '1' } : {}), disabled: !valid }}
    >
      <View style={s.postBody}>
        <FieldCard
          label="Your question"
          big
          multiline
          value={draft.prompt}
          onChangeText={(prompt) => draft.set({ prompt })}
          placeholder={SAMPLE_QUESTION}
          maxLength={RULES.promptMaxLength}
          count={`${draft.prompt.length} / ${RULES.promptMaxLength}`}
          style={s.questionField}
        />
        <Rise delay={280}>
          <Tap
            onPress={() => void choose()}
            accessibilityRole="button"
            accessibilityLabel={draft.photo ? 'Your photo. Tap to replace it' : 'Choose a photo'}
            style={[s.photoSlot, { height: photoH }]}
          >
            {draft.photo ? (
              <>
                <Image source={{ uri: draft.photo.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
                <Pop delay={300} style={s.replace}>
                  <Text style={s.replaceText}>Replace</Text>
                </Pop>
              </>
            ) : (
              <>
                <Shimmer />
                <PhotoGlyph size={40} />
                <Text style={s.photoHint}>Choose a photo</Text>
              </>
            )}
          </Tap>
        </Rise>
      </View>
    </StepScreen>
  );
}

/** A soft light sweeping across the empty photo slot: "something goes here". */
function Shimmer() {
  const allowed = useMotionAllowed();
  if (!allowed) return null;
  return (
    <Animate
      pointerEvents="none"
      frames={keyframes.sweep(700)}
      duration={2400}
      delay={1000}
      iterations="infinite"
      easing="linear"
      style={s.shimmer}
    />
  );
}

// ---------- 25 · what to focus on ----------

/** The categories that fit a photo, first; the rest behind "More…". */
const PHOTO_CATEGORIES: PostCategory[] = ['style', 'grooming', 'looks', 'vibe', 'fitness'];

export function FocusStep() {
  const { extra } = useStepNav('focus');
  const draft = usePhotoPostDraft();
  const upload = useUploadMedia();
  const create = useCreatePost();
  const category = draft.category ?? 'looks';
  const focusAreas = draft.focusAreas.length > 0 ? draft.focusAreas : defaultFocusAreas(category);
  const [more, setMore] = useState(!PHOTO_CATEGORIES.includes(category));
  const [error, setError] = useState<string | null>(null);
  const saving = upload.isPending || create.isPending;

  const shown = more ? PostCategory.options : PHOTO_CATEGORIES;
  const defs = CATEGORY_CATALOG[category].focusAreas;
  const hint = defs.find((d) => d.key === focusAreas[0])?.hint;

  const pickCategory = (next: PostCategory) => {
    draft.set({ category: next, focusAreas: reconcileFocusAreas(next, focusAreas) });
  };
  const toggle = (key: string) => {
    const result = toggleFocusArea(focusAreas, key);
    if (result === 'at_min' || result === 'at_max') {
      warn();
      setError(result === 'at_max' ? `Pick up to ${RULES.maxFocusAreas}.` : 'Keep at least one.');
      return;
    }
    setError(null);
    draft.set({ category, focusAreas: result });
  };

  const save = async () => {
    const photo = draft.photo;
    if (!photo) {
      router.back();
      return;
    }
    setError(null);
    try {
      const { mediaId } = await upload.run({ kind: 'photo', mimeType: photo.mimeType, dataBase64: photo.dataBase64 });
      await create.run({ kind: 'photo', mediaId, audioMediaId: null, prompt: draft.prompt.trim(), category, focusAreas });
      success();
      draft.clear();
      if (extra) router.dismissTo(stepHref('more-posts'));
      else router.replace(stepHref('more-posts'));
    } catch (err) {
      warn();
      setError(errorMessage(err));
    }
  };

  return (
    <StepScreen
      progress={STEP_PROGRESS.focus}
      title="What should people focus on?"
      subtitle={`Pick what this post is about, then 1 to ${RULES.maxFocusAreas} things you want covered.`}
      note={<Text style={s.picked}>{`${focusAreas.length} of ${RULES.maxFocusAreas} picked`}</Text>}
      error={error}
      next={{ onPress: () => void save(), loading: saving, label: 'Save post', delay: 600 }}
    >
      <View style={s.focusBody}>
        <Stagger style={s.chips} start={120} step={45} kind="pop">
          {[
            ...shown.map((cat) => (
              <ChoiceChip key={cat} size="sm" role="radio" label={CATEGORY_CATALOG[cat].label} selected={category === cat} onPress={() => pickCategory(cat)} />
            )),
            ...(more ? [] : [<ChoiceChip key="more" size="sm" dashed label="More…" selected={false} onPress={() => setMore(true)} />]),
          ]}
        </Stagger>
        <Rise delay={400} duration={600}>
          <View style={s.focusList} accessibilityLabel="Focus areas">
            {defs.map((d, i) => {
              const on = focusAreas.includes(d.key);
              return (
                <Tap
                  key={d.key}
                  onPress={() => toggle(d.key)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={d.label}
                  style={[s.focusRow, i < defs.length - 1 && s.focusDivider]}
                >
                  <Text style={s.focusLabel}>{d.label}</Text>
                  <CheckBox on={on} />
                </Tap>
              );
            })}
          </View>
        </Rise>
        {hint ? (
          <Rise delay={700} duration={600}>
            <View style={s.hintBox}>
              <Animate frames={keyframes.twinkle()} duration={1800} delay={1300} iterations="infinite" easing="ease-in-out">
                <Spark />
              </Animate>
              <Text style={s.hintText}>{`People will see ideas like “${hint}” to help them write.`}</Text>
            </View>
          </Rise>
        ) : null}
      </View>
    </StepScreen>
  );
}

// ---------- 26 · more posts ----------

export function MorePostsStep({ me }: { me: MyProfile }) {
  const { next, goTo } = useStepNav('more-posts');
  const clearDraft = usePhotoPostDraft((d) => d.clear);
  const posts = [...me.posts].sort((a, b) => a.position - b.position);
  const free = RULES.maxPosts - posts.length;
  const emptySlots = Array.from({ length: Math.max(0, free - 1) }, (_, i) => posts.length + 2 + i);

  return (
    <StepScreen
      progress={STEP_PROGRESS['more-posts']}
      title={free > 0 ? `Add up to ${free} more` : 'Your posts are full'}
      subtitle={free > 0 ? 'Optional. More posts give people more to respond to.' : `That’s all ${RULES.maxPosts}. You can change them later from your profile.`}
      onBack={() => router.dismissTo(stepHref('posts'))}
      onSkip={free > 0 ? () => next() : undefined}
      footer={<PillButton label="Continue" onPress={() => next()} delay={600} pulseDelay={1400} />}
    >
      <View style={s.slots}>
        {posts.map((post, i) => (
          <Rise key={post.id} delay={140 + i * 60} duration={550}>
            <PostRow post={post} index={i} />
          </Rise>
        ))}
        {free > 0 ? (
          <Rise delay={140 + posts.length * 60} duration={550}>
            <NextSlot
              number={posts.length + 1}
              onPhoto={() => {
                clearDraft();
                goTo('first-post', { extra: '1' });
              }}
              onVoice={() => goTo('voice')}
            />
          </Rise>
        ) : null}
        {emptySlots.map((n, i) => (
          <Rise key={n} delay={200 + (posts.length + i) * 60} duration={550}>
            <View style={s.emptySlot}>
              <Text style={s.emptySlotText}>{`Post ${n}`}</Text>
            </View>
          </Rise>
        ))}
      </View>
    </StepScreen>
  );
}

function PostRow({ post, index }: { post: Post; index: number }) {
  return (
    <View style={[ob.card, s.postRow]}>
      <View style={s.thumb}>
        {post.kind === 'photo' && post.mediaUrl ? (
          <Image source={{ uri: api.mediaUrl(post.mediaUrl) }} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
        ) : post.kind === 'audio' ? (
          <Ionicons name="mic-outline" size={22} color={c.muted} />
        ) : (
          <PhotoGlyph size={22} />
        )}
      </View>
      <View style={s.postRowText}>
        <Text style={s.postRowPrompt} numberOfLines={2}>
          {post.prompt}
        </Text>
        <Text style={s.postRowMeta}>
          {[String(index + 1), CATEGORY_CATALOG[post.category].label, index === 0 ? 'Main post' : null].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </View>
  );
}

/** The next free slot: its dashed edge breathes between ink and clay to invite a tap. */
function NextSlot({ number, onPhoto, onVoice }: { number: number; onPhoto: () => void; onVoice: () => void }) {
  return (
    <View style={s.nextSlot}>
      <Animate frames={keyframes.edgeBreathe()} duration={2000} delay={1000} iterations="infinite" easing="ease-in-out" style={s.nextSlotEdge} pointerEvents="none" />
      <Text style={s.nextSlotTitle}>{`Post ${number}`}</Text>
      <View style={s.slotButtons}>
        <Tap onPress={onPhoto} accessibilityRole="button" accessibilityLabel={`Add a photo as post ${number}`} style={[s.slotButton, s.slotButtonInk]}>
          <Ionicons name="add" size={16} color={c.onInk} />
          <Text style={[s.slotButtonText, { color: c.onInk }]}>Photo</Text>
        </Tap>
        <Tap onPress={onVoice} accessibilityRole="button" accessibilityLabel={`Add a voice clip as post ${number}`} style={[s.slotButton, s.slotButtonOutline]}>
          <Ionicons name="mic-outline" size={16} color={c.ink} />
          <Text style={s.slotButtonText}>Voice</Text>
        </Tap>
      </View>
    </View>
  );
}

// ---------- 27 · a voice post ----------

const BAR_HEIGHTS = [8, 14, 22, 30, 18, 12, 26, 40, 52, 36, 20, 14, 28, 46, 58, 44, 30, 18, 24, 38, 50, 34, 22, 16, 30, 44, 36, 24, 14, 10, 18, 28, 20, 12, 8, 14, 22, 16, 10, 8, 12, 10, 8, 6];
const VOICE_FOCUS_START = defaultFocusAreas('voice');

export function VoiceStep() {
  const recorder = useVoiceRecorder();
  const upload = useUploadMedia();
  const create = useCreatePost();
  const [prompt, setPrompt] = useState('');
  const [focusAreas, setFocusAreas] = useState<string[]>(VOICE_FOCUS_START);
  const [error, setError] = useState<string | null>(null);
  const clip = recorder.result;
  const player = useAudioPlayer(clip?.uri ?? '');
  const saving = upload.isPending || create.isPending;
  const valid = !!clip && prompt.trim().length >= RULES.promptMinLength && !recorder.isRecording;
  const live = recorder.isRecording || player.playing;
  const seconds = recorder.isRecording ? recorder.elapsed : (clip?.durationSec ?? 0);
  const played = clip ? (player.playing ? player.progress : 1) : 0;

  const toggleFocus = (key: string) => {
    const result = toggleFocusArea(focusAreas, key);
    if (result === 'at_min' || result === 'at_max') {
      warn();
      return;
    }
    setFocusAreas(result);
  };

  const main = () => {
    if (recorder.isRecording) void recorder.stop();
    else if (clip) void player.toggle();
    else void recorder.start();
  };

  const save = async () => {
    if (!clip) return;
    setError(null);
    try {
      const { mediaId } = await upload.run({ kind: 'audio', mimeType: clip.mimeType, dataBase64: clip.dataBase64, durationSec: clip.durationSec });
      await create.run({ kind: 'audio', mediaId: null, audioMediaId: mediaId, prompt: prompt.trim(), category: 'voice', focusAreas });
      success();
      // Back to the list of posts, where the new one now shows.
      router.back();
    } catch (err) {
      warn();
      setError(errorMessage(err));
    }
  };

  return (
    <StepScreen
      progress={STEP_PROGRESS.voice}
      title="Let people hear you"
      subtitle={`A voice post is up to ${RULES.audioMaxSeconds} seconds. People give perspectives on how you sound.`}
      error={error ?? recorder.error}
      onBack={() => router.back()}
      footer={
        <>
          <PillButton
            label="Redo"
            variant="outline"
            icon="refresh"
            disabled={!clip || recorder.isRecording}
            onPress={() => {
              player.pause();
              recorder.reset();
            }}
          />
          <PillButton label="Save post" onPress={() => void save()} disabled={!valid} loading={saving} pulseDelay={600} />
        </>
      }
    >
      <View style={s.voiceBody}>
        <FieldCard
          label="Your question"
          big
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Do I sound as calm as I think I do?"
          maxLength={RULES.promptMaxLength}
          right={<Ionicons name="pencil-outline" size={18} color={c.ink} style={s.pencil} />}
        />
        <Rise delay={260}>
          <View style={s.recorderCard}>
            <Text style={s.time}>
              {`0:${String(Math.floor(seconds)).padStart(2, '0')}`}
              <Text style={{ color: c.muted }}>{` / 0:${RULES.audioMaxSeconds}`}</Text>
            </Text>
            <View
              style={s.wave}
              accessible
              accessibilityRole="image"
              accessibilityLabel={clip ? `Recorded clip, ${Math.round(clip.durationSec)} seconds` : recorder.isRecording ? 'Recording' : 'No clip yet'}
            >
              {BAR_HEIGHTS.map((h, i) => (
                <WaveBar key={i} height={h} index={i} live={live} on={clip ? i / BAR_HEIGHTS.length < played : recorder.isRecording} />
              ))}
            </View>
            <Pop delay={700} style={s.mainButtonWrap}>
              {!saving ? <PulseRing width={68} height={68} radius={34} delay={1400} iterations="infinite" duration={1800} /> : null}
              <Tap
                onPress={main}
                accessibilityRole="button"
                accessibilityLabel={recorder.isRecording ? 'Stop recording' : clip ? (player.playing ? 'Pause' : 'Play') : 'Start recording'}
                style={s.mainButton}
              >
                <Ionicons
                  name={recorder.isRecording ? 'stop' : clip ? (player.playing ? 'pause' : 'play') : 'mic'}
                  size={26}
                  color={c.onInk}
                />
              </Tap>
            </Pop>
          </View>
        </Rise>
        <Rise delay={420} style={s.voiceFocus}>
          <Text style={ob.overline}>People will focus on</Text>
          <View style={s.chips}>
            {CATEGORY_CATALOG.voice.focusAreas.map((d) => (
              <ChoiceChip key={d.key} size="sm" role="checkbox" label={d.label} selected={focusAreas.includes(d.key)} onPress={() => toggleFocus(d.key)} />
            ))}
          </View>
        </Rise>
      </View>
    </StepScreen>
  );
}

function WaveBar({ height, index, live, on }: { height: number; index: number; live: boolean; on: boolean }) {
  const bar = <View style={[s.bar, { height, backgroundColor: on ? c.wavePlayed : c.waveRest }]} />;
  if (!live) return bar;
  return (
    <Animate frames={keyframes.bar()} duration={700} delay={((index * 7) % 11) * 70} iterations="infinite" direction="alternate" easing="ease-in-out">
      {bar}
    </Animate>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  introScreen: { flex: 1, backgroundColor: c.paper, paddingHorizontal: theme.spacing.lg + theme.spacing.xs },
  introCardTilt: { marginHorizontal: 30, transform: [{ rotate: '1.5deg' }] },
  introCard: {
    backgroundColor: c.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    borderRadius: 24,
    padding: theme.spacing.base,
    gap: theme.spacing.md,
    shadowColor: c.ink,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 16 },
    elevation: 6,
  },
  introQuestion: { minHeight: 50, fontFamily: f.display, fontSize: 19, lineHeight: 25, color: c.ink },
  photo: { borderRadius: 16, backgroundColor: c.line, alignItems: 'center', justifyContent: 'center' },
  introBubble: { position: 'absolute', right: -6, width: 210, transform: [{ rotate: '-3deg' }] },
  inkBubble: {
    backgroundColor: c.ink,
    borderRadius: 18,
    borderBottomRightRadius: 6,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: 14,
    gap: theme.spacing.xs,
    shadowColor: c.ink,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  inkBubbleText: { fontFamily: f.body, fontSize: 13, lineHeight: 18, color: c.onInk },
  introTitle: { marginTop: theme.spacing.lg, lineHeight: 38 },
  introBody: { marginTop: theme.spacing.md },
  postBody: { paddingHorizontal: 20, paddingTop: 20, gap: theme.spacing.md },
  questionField: {},
  photoSlot: {
    borderRadius: 22,
    backgroundColor: c.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    overflow: 'hidden',
  },
  photoHint: { fontFamily: f.bodyMedium, fontSize: 14, color: c.muted },
  replace: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.md,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    backgroundColor: c.inkGlass,
    justifyContent: 'center',
  },
  replaceText: { fontFamily: f.bodySemibold, fontSize: 13, color: c.onInk },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -160,
    width: 120,
    backgroundColor: c.surface,
    opacity: 0.35,
  },
  picked: { fontFamily: f.bodyMedium, fontSize: 14, color: c.muted },
  focusBody: { paddingHorizontal: 20, paddingTop: 18, gap: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  focusList: { backgroundColor: c.surface, borderWidth: theme.borderWidth.hairline, borderColor: c.line, borderRadius: 20, overflow: 'hidden' },
  focusRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.base },
  focusDivider: { borderBottomWidth: theme.borderWidth.hairline, borderBottomColor: c.sand },
  focusLabel: { fontFamily: f.bodyMedium, fontSize: 15, color: c.ink },
  hintBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: theme.spacing.md, paddingHorizontal: 14, borderRadius: 16, backgroundColor: c.sand },
  hintText: { flex: 1, fontFamily: f.body, fontSize: 13, lineHeight: 19, color: c.ink },
  slots: { paddingHorizontal: 20, paddingTop: 20, gap: 10 },
  postRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10 },
  thumb: { width: 64, height: 80, borderRadius: theme.spacing.md, backgroundColor: c.line, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  postRowText: { flex: 1, gap: 6 },
  postRowPrompt: { fontFamily: f.display, fontSize: 16, lineHeight: 21, color: c.ink },
  postRowMeta: { fontFamily: f.bodyMedium, fontSize: 12, color: c.muted },
  nextSlot: { borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  nextSlotEdge: { ...StyleSheet.absoluteFill, borderRadius: 18, borderWidth: theme.borderWidth.thick, borderStyle: 'dashed', borderColor: c.muted },
  nextSlotTitle: { fontFamily: f.bodySemibold, fontSize: 15, color: c.ink },
  slotButtons: { flexDirection: 'row', gap: theme.spacing.sm },
  slotButton: { height: 40, paddingHorizontal: 14, borderRadius: theme.radius.pill, flexDirection: 'row', alignItems: 'center', gap: 6 },
  slotButtonInk: { backgroundColor: c.ink },
  slotButtonOutline: { borderWidth: theme.borderWidth.hairline, borderColor: c.ink },
  slotButtonText: { fontFamily: f.bodySemibold, fontSize: 14, color: c.ink },
  emptySlot: {
    height: 70,
    borderRadius: 18,
    borderWidth: theme.borderWidth.thick,
    borderStyle: 'dashed',
    borderColor: c.waveRest,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  emptySlotText: { fontFamily: f.bodySemibold, fontSize: 15, color: c.muted },
  voiceBody: { paddingHorizontal: 20, paddingTop: 22, gap: theme.spacing.md },
  pencil: { marginRight: theme.spacing.sm },
  recorderCard: {
    backgroundColor: c.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    borderRadius: 22,
    paddingTop: 22,
    paddingHorizontal: 18,
    paddingBottom: 54,
    alignItems: 'center',
    gap: 26,
    marginBottom: 34,
  },
  time: { fontFamily: f.bodyMedium, fontSize: 15, color: c.ink },
  wave: { height: 64, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  bar: { width: 3, borderRadius: 2 },
  mainButtonWrap: { position: 'absolute', bottom: -34, width: 68, height: 68 },
  mainButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: c.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.ink,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  voiceFocus: { gap: 10 },
});
