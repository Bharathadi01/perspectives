import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useExplore } from '../../src/features/explore/useExplore';
import { PerspectiveRequestCard } from '../../src/components/PerspectiveRequestCard';
import { EmptyState } from '../../src/components/EmptyState';
import { SafetyOverflowMenu } from '../../src/components/SafetyOverflowMenu';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { SecondaryButton } from '../../src/components/SecondaryButton';
import { theme } from '../../src/theme';
import { ResponseTone, ConnectionMode } from '@perspective/contracts';

export default function ExploreScreen() {
  const {
    data: batch,
    isLoading,
    isError,
    refetch,
    skip,
    submitResponse,
    report,
    blockUser,
    isSubmitting,
  } = useExplore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [safetyTarget, setSafetyTarget] = useState<{ id: string; authorId: string } | null>(null);

  // Response composer sheet state
  const [composing, setComposing] = useState(false);
  const [firstImpression, setFirstImpression] = useState('');
  const [reason, setReason] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tone, setTone] = useState<ResponseTone>('constructive');
  const [connectionIntent, setConnectionIntent] = useState<ConnectionMode | null>(null);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.brand} />
        <Text style={styles.loadingText}>Fetching thoughtful requests...</Text>
      </View>
    );
  }

  if (isError || !batch) {
    return (
      <View style={styles.centerContainer}>
        <EmptyState
          emoji="⚠️"
          title="Could not load requests"
          description="Check your network connection and try again."
          actionTitle="Retry"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  const requests = batch.requests;
  const currentRequest = requests[currentIndex];

  const handleSkip = async () => {
    if (!currentRequest) return;
    await skip({
      requestId: currentRequest.id,
      idempotencyKey: `skip_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    });
    setCurrentIndex((prev) => prev + 1);
  };

  const handleOpenComposer = () => {
    setFirstImpression('');
    setReason('');
    setSuggestion('');
    setTags([]);
    setTagInput('');
    setTone('constructive');
    setConnectionIntent(null);
    setComposing(true);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && tags.length < 3) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput('');
    }
  };

  const handleSubmitResponse = async () => {
    if (!currentRequest) return;
    if (!firstImpression.trim()) {
      Alert.alert('Required', 'Please enter your first impression statement.');
      return;
    }

    try {
      await submitResponse({
        requestId: currentRequest.id,
        firstImpression: firstImpression.trim(),
        reason: reason.trim() || undefined,
        suggestion: suggestion.trim() || undefined,
        tags,
        tone,
        connectionIntent,
        impressionToken: batch.impressionToken,
        idempotencyKey: `resp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      });

      setComposing(false);
      Alert.alert('Perspective Delivered', 'Your structured perspective was sent privately to the requester.');
      setCurrentIndex((prev) => prev + 1);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit response.');
    }
  };

  return (
    <View style={styles.screen}>
      {/* Finite Daily Batch Progress Header */}
      <View style={styles.batchHeader}>
        <Text style={styles.batchTitle}>{batch.dailyHeadline}</Text>
        <Text style={styles.batchSubtitle}>
          {Math.min(currentIndex + 1, requests.length)} of {requests.length} requests
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {currentRequest ? (
          <PerspectiveRequestCard
            request={currentRequest}
            onGivePerspective={handleOpenComposer}
            onSkip={handleSkip}
            onOpenSafetyMenu={() =>
              setSafetyTarget({
                id: currentRequest.id,
                authorId: currentRequest.authorId,
              })
            }
          />
        ) : (
          <EmptyState
            emoji="🌟"
            title="You're all caught up today"
            description="You have thoughtfully reviewed all eligible requests in today's finite batch. Check back tomorrow!"
            actionTitle="Refresh Batch"
            onAction={() => {
              setCurrentIndex(0);
              refetch();
            }}
          />
        )}
      </ScrollView>

      {/* Safety Menu Modal */}
      {safetyTarget && (
        <SafetyOverflowMenu
          visible={!!safetyTarget}
          targetType="request"
          targetId={safetyTarget.id}
          targetUserId={safetyTarget.authorId}
          onClose={() => setSafetyTarget(null)}
          onReport={(reason) => report({ targetId: safetyTarget.id, reason })}
          onBlock={(userId) => blockUser(userId)}
        />
      )}

      {/* Structured Give Perspective Composer Modal */}
      <Modal visible={composing} animationType="slide" onRequestClose={() => setComposing(false)}>
        <View style={styles.composerContainer}>
          <View style={styles.composerHeader}>
            <Text style={styles.composerTitle}>Give Perspective</Text>
            <TouchableOpacity onPress={() => setComposing(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.composerBody}>
            <Text style={styles.requestContextHint}>
              Question: "{currentRequest?.question}"
            </Text>

            {/* Field 1: First Impression (Required) */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>
                FIRST IMPRESSION <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="One clear sentence of how this lands..."
                placeholderTextColor={theme.colors.muted}
                value={firstImpression}
                onChangeText={setFirstImpression}
                maxLength={150}
              />
            </View>

            {/* Field 2: Explanation (Optional) */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>WHAT LED TO THAT IMPRESSION?</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Give context, observations, or details..."
                placeholderTextColor={theme.colors.muted}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
                maxLength={400}
              />
            </View>

            {/* Field 3: Suggestion (Optional) */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>PRACTICAL SUGGESTION (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Try a warmer crop, or tighten the intro sentence..."
                placeholderTextColor={theme.colors.muted}
                value={suggestion}
                onChangeText={setSuggestion}
                maxLength={300}
              />
            </View>

            {/* Field 4: Helpful Tags (Up to 3) */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>HELPFUL TAGS (UP TO 3)</Text>
              <View style={styles.tagInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="e.g. approachable, confident..."
                  placeholderTextColor={theme.colors.muted}
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={handleAddTag}
                />
                <TouchableOpacity
                  style={styles.addTagBtn}
                  onPress={handleAddTag}
                  disabled={tags.length >= 3}
                >
                  <Text style={styles.addTagText}>+ Add</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.tagList}>
                {tags.map((t, i) => (
                  <View key={i} style={styles.tagBadge}>
                    <Text style={styles.tagBadgeText}>#{t}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Field 5: Tone */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>TONE CHECK</Text>
              <View style={styles.toneRow}>
                {(['constructive', 'direct', 'encouraging', 'expert'] as ResponseTone[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.toneBtn, tone === t && styles.toneBtnActive]}
                    onPress={() => setTone(t)}
                  >
                    <Text style={[styles.toneBtnText, tone === t && styles.toneBtnTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Field 6: Connection Intent */}
            {currentRequest?.allowsConnection && (
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>CONNECTION INTENT (OFF BY DEFAULT)</Text>
                <Text style={styles.fieldHint}>
                  Only expressed if both of you share mutual compatible intent.
                </Text>
                <View style={styles.intentRow}>
                  {currentRequest.allowedConnectionModes.map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.intentBtn,
                        connectionIntent === mode && styles.intentBtnActive,
                      ]}
                      onPress={() =>
                        setConnectionIntent(connectionIntent === mode ? null : mode)
                      }
                    >
                      <Text
                        style={[
                          styles.intentBtnText,
                          connectionIntent === mode && styles.intentBtnTextActive,
                        ]}
                      >
                        {mode.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.submitContainer}>
              <PrimaryButton
                title="Submit Perspective"
                onPress={handleSubmitResponse}
                loading={isSubmitting}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  batchHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE6DC',
    backgroundColor: '#FAF8F5',
  },
  batchTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.ink,
  },
  batchSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    marginTop: 2,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.muted,
    fontSize: theme.typography.fontSize.sm,
  },
  composerContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingTop: 50,
  },
  composerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE6DC',
  },
  composerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.ink,
  },
  closeBtn: {
    fontSize: 22,
    color: theme.colors.muted,
    padding: theme.spacing.xs,
  },
  composerBody: {
    padding: theme.spacing.lg,
  },
  requestContextHint: {
    fontSize: theme.typography.fontSize.base,
    fontStyle: 'italic',
    color: theme.colors.brand,
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  formGroup: {
    marginBottom: theme.spacing.lg,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.muted,
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  fieldHint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    marginBottom: theme.spacing.xs,
  },
  required: {
    color: theme.colors.danger,
  },
  input: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EAE6DC',
    borderRadius: theme.radius.control,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.ink,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  addTagBtn: {
    backgroundColor: '#EAE6DC',
    borderRadius: theme.radius.control,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
  },
  addTagText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  tagBadge: {
    backgroundColor: '#FAF8F5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: '#EAE6DC',
  },
  tagBadgeText: {
    fontSize: 12,
    color: theme.colors.brand,
    fontWeight: '500',
  },
  toneRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  toneBtn: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EAE6DC',
  },
  toneBtnActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  toneBtnText: {
    fontSize: 12,
    color: theme.colors.ink,
    textTransform: 'capitalize',
  },
  toneBtnTextActive: {
    color: theme.colors.surface,
    fontWeight: 'bold',
  },
  intentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  intentBtn: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EAE6DC',
  },
  intentBtnActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  intentBtnText: {
    fontSize: 11,
    color: theme.colors.ink,
    fontWeight: '600',
  },
  intentBtnTextActive: {
    color: theme.colors.surface,
  },
  submitContainer: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xxl * 2,
  },
});
