import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { theme } from '../theme';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { ReportReason } from '@perspective/contracts';

interface SafetyOverflowMenuProps {
  visible: boolean;
  targetType: 'request' | 'response' | 'message' | 'user';
  targetId: string;
  targetUserId?: string;
  onClose: () => void;
  onReport: (reason: ReportReason) => void;
  onBlock?: (userId: string) => void;
}

export const SafetyOverflowMenu: React.FC<SafetyOverflowMenuProps> = ({
  visible,
  targetType,
  targetId,
  targetUserId,
  onClose,
  onReport,
  onBlock,
}) => {
  const [reporting, setReporting] = useState(false);

  const reasons: { label: string; reason: ReportReason }[] = [
    { label: 'Sexual or explicit content', reason: 'sexual_content' },
    { label: 'Harassment, hate or degraded identity', reason: 'harassment_hate' },
    { label: 'Threat or violent encouragement', reason: 'threat_violence' },
    { label: 'Impersonation or deceptive media', reason: 'scam_impersonation' },
    { label: 'Spam or irrelevant feedback', reason: 'spam_irrelevant' },
  ];

  const handleSelectReason = (reason: ReportReason) => {
    onReport(reason);
    setReporting(false);
    onClose();
    Alert.alert('Report Received', 'Thank you for protecting our community. Content hidden locally.');
  };

  const handleBlockPress = () => {
    if (targetUserId && onBlock) {
      onBlock(targetUserId);
      onClose();
      Alert.alert('User Blocked', 'This user has been blocked and removed bidirectionally.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              {!reporting ? (
                <>
                  <Text style={styles.sheetTitle}>Safety & Moderation</Text>
                  
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setReporting(true)}
                  >
                    <Text style={styles.menuItemTextDanger}>Report {targetType}</Text>
                  </TouchableOpacity>

                  {targetUserId && onBlock && (
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={handleBlockPress}
                    >
                      <Text style={styles.menuItemTextDanger}>Block this user</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.cancelContainer}>
                    <SecondaryButton title="Cancel" onPress={onClose} />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.sheetTitle}>Why are you reporting this?</Text>
                  <Text style={styles.sheetSubtitle}>
                    All reports are prioritized by community safety.
                  </Text>

                  {reasons.map((r) => (
                    <TouchableOpacity
                      key={r.reason}
                      style={styles.reasonItem}
                      onPress={() => handleSelectReason(r.reason)}
                    >
                      <Text style={styles.reasonText}>{r.label}</Text>
                    </TouchableOpacity>
                  ))}

                  <View style={styles.cancelContainer}>
                    <SecondaryButton title="Back" onPress={() => setReporting(false)} />
                  </View>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
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
  },
  menuItem: {
    minHeight: theme.touchTarget.min,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EAE6DC',
  },
  menuItemTextDanger: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.danger,
    fontWeight: theme.typography.fontWeight.semibold,
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
  cancelContainer: {
    marginTop: theme.spacing.md,
  },
});
