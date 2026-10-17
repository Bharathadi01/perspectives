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
import { api, newKey } from '../../api/client';
import { useUpdatePost } from '../../features/hooks';
import { errorMessage } from '../../lib/errors';
import { useVoiceRecorder } from '../../lib/media';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { IconButton } from '../ui/IconButton';
import { Label, Muted } from '../ui/Text';
import { TextField } from '../ui/TextField';
import { useToast } from '../ui/Toast';
import { PromptLibraryModal } from './PromptLibraryModal';
import { useAudioPlayer } from './useAudioPlayer';

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
  const [perspectiveKind, setPerspectiveKind] = useState<'text' | 'voice'>('text');
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [saving, setSaving] = useState(false);

  const recorder = useVoiceRecorder();
  const update = useUpdatePost();
  const toast = useToast();

  const isVoice = perspectiveKind === 'voice';

  // Audio source: either new local recording or existing server audio URL
  const audioSource = recorder.result?.uri
    ? recorder.result.uri
    : post?.audioMediaUrl
      ? api.mediaUrl(post.audioMediaUrl)
      : '';
  const player = useAudioPlayer(audioSource);

  useEffect(() => {
    if (post) {
      setPrompt(post.prompt);
      setCategory(post.category);
      setFocusAreas(post.focusAreas);
      setPerspectiveKind(post.audioMediaUrl ? 'voice' : 'text');
    }
  }, [post]);

  if (!post) return null;

  const audioValid = !isVoice || !!recorder.result || !!post.audioMediaUrl;
  const ready =
    prompt.trim().length >= RULES.promptMinLength &&
    focusAreas.length >= RULES.minFocusAreas &&
    audioValid &&
    !recorder.isRecording;
  const isBusy = saving || update.isPending;

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

  const cleanup = () => {
    if (recorder.isRecording) void recorder.stop();
    recorder.reset();
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  const save = async () => {
    if (isVoice && !recorder.result && !post.audioMediaUrl) {
      toast('Please record your voice perspective first.', 'info');
      return;
    }
    if (prompt.trim().length < RULES.promptMinLength) {
      toast(`Perspective question needs at least ${RULES.promptMinLength} characters.`, 'info');
      return;
    }
    if (focusAreas.length < RULES.minFocusAreas) {
      toast('Please select at least one focus area hint.', 'info');
      return;
    }

    setSaving(true);
    try {
      let audioMediaId: string | null | undefined = undefined;

      // If voice perspective with new recording: upload audio first
      if (isVoice && recorder.result) {
        const audioUpload = await api.media.upload(
          {
            kind: 'audio',
            mimeType: recorder.result.mimeType,
            dataBase64: recorder.result.dataBase64,
            durationSec: recorder.result.durationSec,
          },
          newKey(),
        );
        audioMediaId = audioUpload.mediaId;
      } else if (!isVoice && post.audioMediaUrl) {
        // Switched from voice to text: clear audio
        audioMediaId = null;
      }

      await update.run({
        postId: post.id,
        input: {
          prompt: prompt.trim(),
          audioMediaId,
          category,
          focusAreas,
        },
      });

      toast('Perspective updated.', 'success');
      cleanup();
      onSaved();
      onClose();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Edit Perspective</Text>
          <Pressable onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close edit perspective" style={s.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.ink} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {/* Format Toggle */}
          <View style={s.section}>
            <Label>Perspective Option</Label>
            <View style={s.formatToggleContainer}>
              <Pressable
                style={[s.formatTab, !isVoice && s.formatTabActive]}
                onPress={() => setPerspectiveKind('text')}
                accessibilityRole="button"
                accessibilityLabel="Written perspective option"
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={!isVoice ? theme.colors.ink : theme.colors.muted} />
                <Text style={[s.formatTabText, !isVoice && s.formatTabTextActive]}>Written Perspective</Text>
              </Pressable>

              <Pressable
                style={[s.formatTab, isVoice && s.formatTabActive]}
                onPress={() => setPerspectiveKind('voice')}
                accessibilityRole="button"
                accessibilityLabel="Voice perspective option"
              >
                <Ionicons name="mic" size={16} color={isVoice ? theme.colors.brand : theme.colors.muted} />
                <Text style={[s.formatTabText, isVoice && s.formatTabTextActive]}>Voice Perspective</Text>
                <View style={[s.formatPillBadge, isVoice && s.formatPillBadgeActive]}>
                  <Text style={[s.formatPillBadgeText, isVoice && s.formatPillBadgeTextActive]}>15s</Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Voice Recording / Preview in Edit Mode */}
          {isVoice && (
            <View style={s.voiceCard}>
              <View style={s.voiceCardHeader}>
                <View style={s.voiceHeaderLeft}>
                  <View style={s.micIconSmall}>
                    <Ionicons name="mic" size={14} color="#FFFFFF" />
                  </View>
                  <Text style={s.voiceCardTitle}>Voice Perspective</Text>
                </View>
                <Text style={s.voiceCardLimit}>Up to {RULES.audioMaxSeconds}s</Text>
              </View>

              {recorder.isRecording ? (
                /* Live Recording State */
                <View style={s.recordingLiveBox}>
                  <View style={s.pulsingMicWrapper}>
                    <Ionicons name="mic" size={32} color={theme.colors.danger} />
                  </View>
                  <Text style={s.recordingTimerText}>
                    {Math.max(0, Math.ceil(RULES.audioMaxSeconds - recorder.elapsed))}s remaining
                  </Text>
                  <Text style={s.recordingHintText}>Speak clearly into your microphone...</Text>
                  <View style={s.voiceButtonRow}>
                    <Button
                      title="Done Recording"
                      variant="danger"
                      onPress={() => void recorder.stop()}
                    />
                  </View>
                </View>
              ) : recorder.result || post.audioMediaUrl ? (
                /* Preview State with Audio Playback and Cancel/Redo */
                <View style={s.previewAudioBox}>
                  <Text style={s.previewLabel}>
                    {recorder.result ? 'New Recording Preview' : 'Current Voice Note'}
                  </Text>
                  <View style={s.audioPreviewRow}>
                    <IconButton
                      icon={player.playing ? 'pause' : 'play'}
                      tone="brand"
                      size="small"
                      onPress={() => void player.toggle()}
                      accessibilityLabel={player.playing ? 'Pause audio preview' : 'Play audio preview'}
                    />
                    <View style={s.previewWaveTrack}>
                      <View style={[s.previewWaveFill, { width: `${Math.round(player.progress * 100)}%` }]} />
                    </View>
                    <Text style={s.previewDurationText}>
                      {recorder.result
                        ? `${recorder.result.durationSec.toFixed(1)}s`
                        : `${(post.audioDurationSec ?? post.durationSec ?? 0).toFixed(0)}s`}
                    </Text>
                  </View>

                  <View style={s.previewActionsRow}>
                    <Pressable
                      style={s.rejectRedoBtn}
                      onPress={() => {
                        if (player.playing) player.pause();
                        recorder.reset();
                        void recorder.start();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Record new voice note"
                    >
                      <Ionicons name="refresh-outline" size={16} color={theme.colors.danger} />
                      <Text style={s.rejectRedoText}>
                        {recorder.result ? 'Cancel & Redo' : 'Record New Audio'}
                      </Text>
                    </Pressable>

                    <View style={s.recordedSuccessBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
                      <Text style={s.recordedSuccessText}>
                        {recorder.result ? 'New audio ready' : 'Attached'}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                /* Idle Recording State */
                <View style={s.startRecordingBox}>
                  <Pressable
                    style={s.micTapCircle}
                    onPress={() => void recorder.start()}
                    accessibilityRole="button"
                    accessibilityLabel="Tap to record voice perspective"
                  >
                    <Ionicons name="mic" size={28} color={theme.colors.brand} />
                  </Pressable>
                  <Text style={s.startRecordingPrompt}>
                    Record a voice note attached to this photo
                  </Text>
                  <Button
                    title="Start Recording"
                    onPress={() => void recorder.start()}
                  />
                </View>
              )}

              {recorder.error ? <Text style={s.voiceErrorText}>{recorder.error}</Text> : null}
            </View>
          )}

          {/* Perspective Question */}
          <View style={s.section}>
            <View style={s.labelRow}>
              <Label>{isVoice ? 'Voice Perspective Question' : 'Perspective Question'}</Label>
              <Pressable onPress={() => setShowPromptLibrary(true)} style={s.browseLink}>
                <Ionicons name="sparkles" size={14} color={theme.colors.brand} />
                <Text style={s.browseLinkText}>Browse Perspectives</Text>
              </Pressable>
            </View>
            <TextField
              accessibilityLabel={isVoice ? 'Voice perspective question' : 'Perspective question'}
              value={prompt}
              onChangeText={setPrompt}
              placeholder={isVoice ? 'e.g. Listen to this and tell me your thoughts' : 'e.g. What vibe does this photo give you?'}
              maxLength={RULES.promptMaxLength}
              counter={{ min: RULES.promptMinLength, max: RULES.promptMaxLength }}
            />
          </View>

          {/* Category Chips */}
          <View style={s.section}>
            <Label>Category</Label>
            <View style={s.chips}>
              {PostCategory.options.map((c) => (
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

          {/* Focus Areas Hints */}
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

          {/* Save Button */}
          <View style={s.footer}>
            <Button
              title={isBusy ? 'Saving…' : (isVoice ? 'Save Voice Perspective' : 'Save Perspective')}
              loading={isBusy}
              style={!ready ? s.saveBtnNotReady : undefined}
              onPress={() => void save()}
            />
            {!ready && (
              <Text style={s.missingHintText}>
                {isVoice && !recorder.result && !post.audioMediaUrl
                  ? '• Record your voice note above'
                  : prompt.trim().length < RULES.promptMinLength
                  ? `• Question must be at least ${RULES.promptMinLength} characters`
                  : '• Select a focus area hint'}
              </Text>
            )}
          </View>
        </ScrollView>

        <PromptLibraryModal
          visible={showPromptLibrary}
          filterKind={isVoice ? 'audio' : 'photo'}
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
  formatToggleContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.card,
    padding: 4,
    gap: 4,
  },
  formatTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.radius.card - 2,
    gap: 6,
  },
  formatTabActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  formatTabText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.muted,
  },
  formatTabTextActive: {
    color: theme.colors.ink,
  },
  formatPillBadge: {
    backgroundColor: theme.colors.border,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  formatPillBadgeActive: {
    backgroundColor: theme.colors.brandSoft,
  },
  formatPillBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.muted,
  },
  formatPillBadgeTextActive: {
    color: theme.colors.brand,
  },
  voiceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  voiceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  voiceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  micIconSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceCardTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.ink,
  },
  voiceCardLimit: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
  },
  recordingLiveBox: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
    backgroundColor: '#FFF2F2',
    borderRadius: theme.radius.card,
  },
  pulsingMicWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFE3E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingTimerText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.danger,
    marginTop: 4,
  },
  recordingHintText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
  },
  voiceButtonRow: {
    marginTop: theme.spacing.xs,
  },
  previewAudioBox: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.card,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  audioPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  previewWaveTrack: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  previewWaveFill: {
    height: '100%',
    backgroundColor: theme.colors.brand,
  },
  previewDurationText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.ink,
    minWidth: 32,
  },
  previewActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.xs,
  },
  rejectRedoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: '#FFF2F2',
  },
  rejectRedoText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.danger,
  },
  recordedSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recordedSuccessText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.success,
  },
  startRecordingBox: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  micTapCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  startRecordingPrompt: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 4,
  },
  voiceErrorText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.danger,
    textAlign: 'center',
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
  saveBtnNotReady: {
    opacity: 0.65,
  },
  missingHintText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
});
