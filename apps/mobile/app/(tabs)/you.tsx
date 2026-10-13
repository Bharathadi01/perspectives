import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useProfile } from '../../src/features/profile/useProfile';
import { PersonHeader } from '../../src/components/PersonHeader';
import { ProfileCompletenessMeter } from '../../src/components/ProfileCompletenessMeter';
import { PromptBlock } from '../../src/components/PromptBlock';
import { LensChip } from '../../src/components/LensChip';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { SecondaryButton } from '../../src/components/SecondaryButton';
import { theme } from '../../src/theme';

export default function YouScreen() {
  const { data: userProfile, isLoading, isError, refetch, deleteAccount } = useProfile();

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.brand} />
      </View>
    );
  }

  if (isError || !userProfile) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Could not load profile.</Text>
        <SecondaryButton title="Retry" onPress={() => refetch()} />
      </View>
    );
  }

  const profile = userProfile.publicProfile;

  const handleDeleteAccount = async () => {
    if (deletePhrase !== 'DELETE MY ACCOUNT') {
      Alert.alert('Phrase Mismatch', 'Please type DELETE MY ACCOUNT exactly to confirm.');
      return;
    }

    try {
      await deleteAccount('DELETE MY ACCOUNT');
      setDeleteModalVisible(false);
      Alert.alert(
        'Account Deleted',
        'Your profile, active requests, responses, and sessions have been permanently deleted.'
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <PersonHeader profile={profile} />

      {/* Profile Completeness Meter */}
      <ProfileCompletenessMeter profile={profile} />

      {/* Bio */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>BIO</Text>
        <Text style={styles.bioText}>{profile.bio}</Text>
      </View>

      {/* Perspective Lenses */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PERSPECTIVE LENSES OFFERED</Text>
        <View style={styles.lensesRow}>
          {profile.lenses.map((lens) => (
            <LensChip key={lens} label={lens} />
          ))}
        </View>
      </View>

      {/* Prompts */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PROFILE PROMPTS</Text>
        {profile.prompts.map((p) => (
          <PromptBlock key={p.promptId} question={p.question} answer={p.answer} />
        ))}
      </View>

      {/* Allowed Connection Modes */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CONNECTION MODES OPEN TO YOU</Text>
        <View style={styles.modesRow}>
          {profile.connectionModes.map((m) => (
            <View key={m} style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>{m.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Privacy & Safety Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PRIVACY & DATA CONTROLS</Text>
        <View style={styles.controlBox}>
          <Text style={styles.controlTitle}>Digital Data Protection (DPDP Compliant)</Text>
          <Text style={styles.controlDesc}>
            Your email, phone, and exact birthday are never shared publicly. Only coarse city and age-band are visible.
          </Text>
        </View>

        <View style={styles.deleteBtnContainer}>
          <SecondaryButton
            title="Delete Account & Data"
            onPress={() => setDeleteModalVisible(true)}
            variant="outline"
          />
        </View>
      </View>

      {/* Delete Account Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Delete Account Permanently</Text>
            <Text style={styles.modalText}>
              In accordance with Google Play, Apple App Store, and DPDP regulations, this action immediately revokes all sessions, hides your profile, and cascades complete deletion of your requests, responses, and messages.
            </Text>
            <Text style={styles.modalInstruction}>
              Type <Text style={{ fontWeight: 'bold' }}>DELETE MY ACCOUNT</Text> to proceed:
            </Text>

            <TextInput
              style={styles.modalInput}
              value={deletePhrase}
              onChangeText={setDeletePhrase}
              placeholder="DELETE MY ACCOUNT"
              autoCapitalize="characters"
            />

            <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
              <PrimaryButton
                title="Confirm Account Deletion"
                onPress={handleDeleteAccount}
              />
              <SecondaryButton
                title="Cancel"
                onPress={() => setDeleteModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl * 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  errorText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.danger,
    marginBottom: theme.spacing.md,
  },
  section: {
    marginVertical: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.muted,
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  bioText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.ink,
    lineHeight: 22,
  },
  lensesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  modesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: 4,
  },
  modeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EAE6DC',
  },
  modeBadgeText: {
    fontSize: 11,
    color: theme.colors.brand,
    fontWeight: 'bold',
  },
  controlBox: {
    backgroundColor: '#FAF8F5',
    padding: theme.spacing.md,
    borderRadius: theme.radius.control,
    borderWidth: 1,
    borderColor: '#EAE6DC',
    marginBottom: theme.spacing.md,
  },
  controlTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: 'bold',
    color: theme.colors.ink,
    marginBottom: 4,
  },
  controlDesc: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    lineHeight: 18,
  },
  deleteBtnContainer: {
    marginTop: theme.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.card,
    borderTopRightRadius: theme.radius.card,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
  },
  modalText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.ink,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  modalInstruction: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    marginBottom: theme.spacing.xs,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#EAE6DC',
    borderRadius: theme.radius.control,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    backgroundColor: '#FAF8F5',
    color: theme.colors.ink,
  },
});
