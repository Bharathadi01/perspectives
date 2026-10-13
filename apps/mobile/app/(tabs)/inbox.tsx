import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useInbox } from '../../src/features/inbox/useInbox';
import { ResponseNote } from '../../src/components/ResponseNote';
import { EmptyState } from '../../src/components/EmptyState';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { SecondaryButton } from '../../src/components/SecondaryButton';
import { ConnectionIntentSheet } from '../../src/components/ConnectionIntentSheet';
import { theme } from '../../src/theme';
import {
  PerspectiveResponse,
  ResponseFeedbackReason,
  ConnectionMode,
} from '@perspective/contracts';

export default function InboxScreen() {
  const { data: responses, isLoading, isError, refetch, submitFeedback, isSubmitting } = useInbox();

  const [activeResponse, setActiveResponse] = useState<PerspectiveResponse | null>(null);
  const [connectSheetVisible, setConnectSheetVisible] = useState(false);
  const [unhelpfulSheetVisible, setUnhelpfulSheetVisible] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.brand} />
        <Text style={styles.loadingText}>Loading received perspectives...</Text>
      </View>
    );
  }

  if (isError || !responses) {
    return (
      <View style={styles.centerContainer}>
        <EmptyState
          emoji="⚠️"
          title="Could not load Inbox"
          description="Please check your connection and retry."
          actionTitle="Retry"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  const handleMarkHelpful = async (resp: PerspectiveResponse) => {
    try {
      await submitFeedback({
        responseId: resp.id,
        rating: 'helpful',
        idempotencyKey: `fb_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      });
      Alert.alert('Marked Helpful', 'Thank you! Helpful perspectives reward thoughtful feedback.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleMarkUnhelpfulReason = async (reason: ResponseFeedbackReason) => {
    if (!activeResponse) return;
    try {
      await submitFeedback({
        responseId: activeResponse.id,
        rating: 'not_helpful',
        unhelpfulReason: reason,
        idempotencyKey: `fb_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      });
      setUnhelpfulSheetVisible(false);
      Alert.alert('Feedback Recorded', 'This response has been archived privately.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleThankPrivately = async (resp: PerspectiveResponse) => {
    try {
      await submitFeedback({
        responseId: resp.id,
        rating: 'helpful',
        thankPrivately: true,
        idempotencyKey: `thk_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      });
      Alert.alert('Thank You Sent', 'A private thank you note was delivered.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleConnectConfirm = async (mode: ConnectionMode) => {
    if (!activeResponse) return;
    try {
      const result = await submitFeedback({
        responseId: activeResponse.id,
        rating: 'helpful',
        connectionIntent: mode,
        idempotencyKey: `conn_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      });

      setConnectSheetVisible(false);
      if (result.connectionCreated) {
        Alert.alert(
          'Mutual Connection Opened! 🎉',
          `Both of you expressed interest in ${mode}. You can now message them in the Connections tab.`
        );
      } else {
        Alert.alert(
          'Connection Interest Expressed',
          `Your interest in connecting via ${mode} has been recorded. Once they express compatible intent, chat will open.`
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const unhelpfulReasons: { label: string; key: ResponseFeedbackReason }[] = [
    { label: 'Vague or too generic', key: 'vague' },
    { label: 'Irrelevant to my question', key: 'irrelevant' },
    { label: 'Insulting or unconstructive', key: 'insulting' },
    { label: 'Sexual or inappropriate', key: 'sexual' },
    { label: 'Spam', key: 'spam' },
    { label: 'Unsafe or violates community standard', key: 'unsafe' },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {responses.length === 0 ? (
          <EmptyState
            emoji="📬"
            title="Your Inbox is empty"
            description="When people review your Perspective Requests, their structured feedback will appear here."
          />
        ) : (
          responses.map((resp) => (
            <View key={resp.id} style={styles.inboxItem}>
              {/* Context header: The original request this is for */}
              {resp.request && (
                <View style={styles.requestBanner}>
                  <Text style={styles.requestBannerLabel}>FOR YOUR REQUEST:</Text>
                  <Text style={styles.requestBannerText}>"{resp.request.question}"</Text>
                </View>
              )}

              {/* The Response Note */}
              <ResponseNote response={resp} />

              {/* Four Actions */}
              <View style={styles.actionsContainer}>
                <View style={styles.primaryActionRow}>
                  <View style={{ flex: 1, marginRight: theme.spacing.sm }}>
                    <PrimaryButton
                      title="✓ Helpful"
                      onPress={() => handleMarkHelpful(resp)}
                      disabled={resp.status === 'helpful'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SecondaryButton
                      title="Connect"
                      onPress={() => {
                        setActiveResponse(resp);
                        setConnectSheetVisible(true);
                      }}
                    />
                  </View>
                </View>

                <View style={styles.secondaryActionRow}>
                  <TouchableOpacity
                    style={styles.textAction}
                    onPress={() => handleThankPrivately(resp)}
                  >
                    <Text style={styles.textActionLabel}>💌 Thank privately</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.textAction}
                    onPress={() => {
                      setActiveResponse(resp);
                      setUnhelpfulSheetVisible(true);
                    }}
                  >
                    <Text style={styles.textActionLabelMuted}>✕ Not helpful</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Connection Intent Modal Sheet */}
      {activeResponse && (
        <ConnectionIntentSheet
          visible={connectSheetVisible}
          responderIntent={activeResponse.connectionIntent}
          onClose={() => setConnectSheetVisible(false)}
          onConfirm={handleConnectConfirm}
        />
      )}

      {/* Not Helpful Reasons Modal Sheet */}
      <Modal
        visible={unhelpfulSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUnhelpfulSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reasonSheet}>
            <Text style={styles.sheetTitle}>Why was this not helpful?</Text>
            <Text style={styles.sheetSubtitle}>
              Private feedback informs our recommendation quality and protects safety.
            </Text>

            {unhelpfulReasons.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={styles.reasonItem}
                onPress={() => handleMarkUnhelpfulReason(r.key)}
              >
                <Text style={styles.reasonText}>{r.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={{ marginTop: theme.spacing.md }}>
              <SecondaryButton
                title="Cancel"
                onPress={() => setUnhelpfulSheetVisible(false)}
              />
            </View>
          </View>
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
  inboxItem: {
    marginBottom: theme.spacing.xl,
  },
  requestBanner: {
    backgroundColor: '#FAF8F5',
    padding: theme.spacing.md,
    borderRadius: theme.radius.control,
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: '#EAE6DC',
  },
  requestBannerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.muted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  requestBannerText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.ink,
  },
  actionsContainer: {
    marginTop: theme.spacing.sm,
  },
  primaryActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  secondaryActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xs,
  },
  textAction: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  textActionLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.brand,
  },
  textActionLabelMuted: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  reasonSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.card,
    borderTopRightRadius: theme.radius.card,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  sheetTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.ink,
    marginBottom: theme.spacing.xs,
  },
  sheetSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  reasonItem: {
    minHeight: theme.touchTarget.min,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EAE6DC',
  },
  reasonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.ink,
  },
});
