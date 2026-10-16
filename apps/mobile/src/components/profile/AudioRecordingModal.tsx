import Ionicons from '@expo/vector-icons/Ionicons';
import { RULES } from '@perspective/contracts';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCreatePost, useUploadMedia } from '../../features/hooks';
import { errorMessage } from '../../lib/errors';
import { useVoiceRecorder } from '../../lib/media';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { useToast } from '../ui/Toast';
import { PromptLibraryModal } from './PromptLibraryModal';
import { useAudioPlayer } from './useAudioPlayer';

interface AudioRecordingModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AudioRecordingModal({ visible, onClose, onSaved }: AudioRecordingModalProps) {
  const [prompt, setPrompt] = useState('What do you notice about my voice and tone?');
  const [showPromptPicker, setShowPromptPicker] = useState(false);
  const recorder = useVoiceRecorder();
  const upload = useUploadMedia();
  const create = useCreatePost();
  const toast = useToast();

  const player = useAudioPlayer(recorder.result?.uri ?? '');
  const busy = upload.isPending || create.isPending;

  const save = async () => {
    if (!recorder.result) return;
    try {
      const { mediaId } = await upload.run({
        kind: 'audio',
        mimeType: recorder.result.mimeType,
        dataBase64: recorder.result.dataBase64,
        durationSec: recorder.result.durationSec,
      });

      await create.run({
        kind: 'audio',
        mediaId,
        prompt: prompt.trim(),
        category: 'voice',
        focusAreas: ['tone', 'warmth'],
      });

      toast('Voice perspective saved to profile.', 'success');
      recorder.reset();
      onSaved();
      onClose();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const handleClose = () => {
    if (recorder.isRecording) {
      void recorder.stop();
    }
    recorder.reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Add Voice Perspective</Text>
          <Pressable onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close voice perspective" style={s.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.ink} />
          </Pressable>
        </View>

        <View style={s.content}>
          <View style={s.promptBox}>
            <Text style={s.promptLabel}>Perspective Question</Text>
            <Pressable
              style={s.promptSelector}
              onPress={() => setShowPromptPicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Change voice perspective"
            >
              <Text style={s.promptText}>"{prompt}"</Text>
              <View style={s.changeRow}>
                <Text style={s.changeText}>Change perspective</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.brand} />
              </View>
            </Pressable>
          </View>

          <View style={s.recordingArea}>
            <View style={[s.visualizerCircle, recorder.isRecording && s.visualizerActive]}>
              <Ionicons
                name={recorder.isRecording ? 'mic' : recorder.result ? 'checkmark-circle' : 'mic-outline'}
                size={48}
                color={recorder.isRecording ? theme.colors.danger : theme.colors.brand}
              />
            </View>

            <Text style={s.timerText}>
              {recorder.isRecording
                ? `${Math.max(0, Math.ceil(RULES.audioMaxSeconds - recorder.elapsed))}s remaining`
                : recorder.result
                  ? `Recorded ${recorder.result.durationSec.toFixed(1)} seconds`
                  : `Up to ${RULES.audioMaxSeconds} seconds`}
            </Text>

            {recorder.error ? <Text style={s.errorText}>{recorder.error}</Text> : null}

            {recorder.result ? (
              <View style={s.playbackCard}>
                <IconButton
                  icon={player.playing ? 'pause' : 'play'}
                  tone="brand"
                  size="small"
                  onPress={() => void player.toggle()}
                  accessibilityLabel={player.playing ? 'Pause audio preview' : 'Play audio preview'}
                />
                <View style={s.playbackProgressTrack}>
                  <View style={[s.playbackProgressBar, { width: `${Math.round(player.progress * 100)}%` }]} />
                </View>
                <Text style={s.playbackDuration}>{recorder.result.durationSec.toFixed(0)}s</Text>
              </View>
            ) : null}

            <View style={s.buttonRow}>
              {recorder.isRecording ? (
                <Button title="Stop Recording" variant="danger" onPress={() => void recorder.stop()} />
              ) : recorder.result ? (
                <Button title="Record Again" variant="secondary" onPress={() => recorder.reset()} />
              ) : (
                <Button title="Start Recording" onPress={() => void recorder.start()} />
              )}
            </View>
          </View>

          <View style={s.footer}>
            <Button
              title="Save Voice Prompt"
              disabled={!recorder.result || recorder.isRecording}
              loading={busy}
              onPress={() => void save()}
            />
          </View>
        </View>

        <PromptLibraryModal
          visible={showPromptPicker}
          filterKind="audio"
          onClose={() => setShowPromptPicker(false)}
          onSelect={(selectedPrompt) => setPrompt(selectedPrompt)}
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
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  promptBox: {
    gap: theme.spacing.xs,
  },
  promptLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptSelector: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  promptText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.ink,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  changeText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.brand,
    fontWeight: theme.typography.fontWeight.medium,
  },
  recordingArea: {
    alignItems: 'center',
    gap: theme.spacing.base,
    paddingVertical: theme.spacing.xl,
  },
  visualizerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  visualizerActive: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.brandSoft,
  },
  timerText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.ink,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.danger,
  },
  playbackCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  playbackProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  playbackProgressBar: {
    height: '100%',
    backgroundColor: theme.colors.brand,
  },
  playbackDuration: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    minWidth: 24,
  },
  buttonRow: {
    width: '100%',
    marginTop: theme.spacing.md,
  },
  footer: {
    paddingBottom: theme.spacing.lg,
  },
});
