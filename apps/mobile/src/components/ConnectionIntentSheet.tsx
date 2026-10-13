import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { ConnectionMode } from '@perspective/contracts';
import { theme } from '../theme';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

interface ConnectionIntentSheetProps {
  visible: boolean;
  responderIntent?: ConnectionMode | null;
  onClose: () => void;
  onConfirm: (mode: ConnectionMode) => void;
}

export const ConnectionIntentSheet: React.FC<ConnectionIntentSheetProps> = ({
  visible,
  responderIntent,
  onClose,
  onConfirm,
}) => {
  const [selectedMode, setSelectedMode] = useState<ConnectionMode>(
    responderIntent || 'friends'
  );

  const modes: { key: ConnectionMode; label: string; desc: string }[] = [
    { key: 'friends', label: 'Friendship', desc: 'Connect for genuine conversations & mutual interests' },
    { key: 'collaborate', label: 'Collaborate', desc: 'Work together, give feedback, or build ideas' },
    { key: 'network', label: 'Network', desc: 'Professional knowledge sharing & career insights' },
    { key: 'date', label: 'Date', desc: 'Thoughtful connection centered on personal compatibility' },
    { key: 'chat', label: 'Casual Chat', desc: 'Continue the thread in private 1-on-1 discussion' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <Text style={styles.title}>Connect with Mutual Intent</Text>
              <Text style={styles.subtitle}>
                Private conversations open only when both of you share compatible intent.
              </Text>

              {responderIntent && (
                <View style={styles.responderHint}>
                  <Text style={styles.responderHintText}>
                    Responder suggested: <Text style={styles.bold}>{responderIntent.toUpperCase()}</Text>
                  </Text>
                </View>
              )}

              {modes.map((m) => {
                const isSelected = selectedMode === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.modeCard, isSelected && styles.modeCardSelected]}
                    onPress={() => setSelectedMode(m.key)}
                  >
                    <View style={styles.modeTextCol}>
                      <Text style={[styles.modeLabel, isSelected && styles.modeLabelSelected]}>
                        {m.label}
                      </Text>
                      <Text style={styles.modeDesc}>{m.desc}</Text>
                    </View>
                    <View style={[styles.radio, isSelected && styles.radioSelected]} />
                  </TouchableOpacity>
                );
              })}

              <View style={styles.actions}>
                <PrimaryButton
                  title="Accept & Connect"
                  onPress={() => {
                    onConfirm(selectedMode);
                    onClose();
                  }}
                />
                <View style={{ height: theme.spacing.sm }} />
                <SecondaryButton title="Decline Connection" onPress={onClose} />
              </View>
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
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.ink,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  responderHint: {
    backgroundColor: '#FAF8F5',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.control,
    marginBottom: theme.spacing.md,
  },
  responderHintText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.brand,
  },
  bold: {
    fontWeight: 'bold',
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderRadius: theme.radius.control,
    borderWidth: 1,
    borderColor: '#EAE6DC',
    marginBottom: theme.spacing.sm,
  },
  modeCardSelected: {
    borderColor: theme.colors.brand,
    backgroundColor: '#FAF8F5',
  },
  modeTextCol: {
    flex: 1,
  },
  modeLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.ink,
    marginBottom: 2,
  },
  modeLabelSelected: {
    color: theme.colors.brand,
  },
  modeDesc: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C7C4B8',
    marginLeft: theme.spacing.md,
  },
  radioSelected: {
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.brand,
  },
  actions: {
    marginTop: theme.spacing.md,
  },
});
