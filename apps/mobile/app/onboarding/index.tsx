import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { theme } from '../../src/theme';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { SecondaryButton } from '../../src/components/SecondaryButton';
import { LensChip } from '../../src/components/LensChip';
import { useAuthStore } from '../../src/stores/authStore';
import { router } from 'expo-router';
import { PerspectiveLens, ConnectionMode } from '@perspective/contracts';

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [selectedLenses, setSelectedLenses] = useState<string[]>(['designer', 'fitness_enthusiast']);
  const [selectedModes, setSelectedModes] = useState<ConnectionMode[]>(['friends', 'network']);
  const { completeOnboarding } = useAuthStore();

  const allLenses: PerspectiveLens[] = [
    'designer',
    'recruiter',
    'fitness_enthusiast',
    'fitness_beginner',
    'founder',
    'photographer',
    'stylist',
    'student',
    'engineer',
  ];

  const allModes: ConnectionMode[] = ['friends', 'network', 'collaborate', 'date', 'chat'];

  const toggleLens = (lens: string) => {
    if (selectedLenses.includes(lens)) {
      setSelectedLenses(selectedLenses.filter((l) => l !== lens));
    } else {
      setSelectedLenses([...selectedLenses, lens]);
    }
  };

  const toggleMode = (mode: ConnectionMode) => {
    if (selectedModes.includes(mode)) {
      setSelectedModes(selectedModes.filter((m) => m !== mode));
    } else {
      setSelectedModes([...selectedModes, mode]);
    }
  };

  const handleFinish = () => {
    completeOnboarding();
    Alert.alert('Welcome to Perspective! ✨', 'Your lenses and preferences have been established.');
    router.replace('/(tabs)/explore');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Progress pill */}
      <View style={styles.progressContainer}>
        <Text style={styles.stepIndicator}>STEP {step} OF 3</Text>
      </View>

      {step === 1 && (
        <View style={styles.stepContent}>
          <Text style={styles.title}>The Perspective Promise</Text>
          <Text style={styles.body}>
            Perspective is built around a calm, honest three-step cycle:
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardItem}>1. <Text style={styles.bold}>Ask</Text>: Frame a clear question on your outfit, profile, situation, or idea.</Text>
            <Text style={styles.cardItem}>2. <Text style={styles.bold}>Receive</Text>: Get structured, private feedback from people whose viewpoint matters.</Text>
            <Text style={styles.cardItem}>3. <Text style={styles.bold}>Connect</Text>: Chat opens only when both sides share compatible mutual interest.</Text>
          </View>

          <PrimaryButton title="Next: Select Lenses" onPress={() => setStep(2)} />
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepContent}>
          <Text style={styles.title}>Whose perspective can you offer?</Text>
          <Text style={styles.body}>
            Select the lenses and backgrounds you bring to the community.
          </Text>

          <View style={styles.chipGrid}>
            {allLenses.map((lens) => {
              const selected = selectedLenses.includes(lens);
              return (
                <TouchableOpacity key={lens} onPress={() => toggleLens(lens)}>
                  <LensChip label={lens} selected={selected} />
                </TouchableOpacity>
              );
            })}
          </View>

          <PrimaryButton title="Next: Connection Modes" onPress={() => setStep(3)} />
          <View style={{ height: theme.spacing.sm }} />
          <SecondaryButton title="Back" onPress={() => setStep(1)} />
        </View>
      )}

      {step === 3 && (
        <View style={styles.stepContent}>
          <Text style={styles.title}>Connection Preferences</Text>
          <Text style={styles.body}>
            Choose what kinds of mutual relationships you are open to. You can also disable all modes to use the product purely for feedback.
          </Text>

          <View style={styles.modesList}>
            {allModes.map((mode) => {
              const active = selectedModes.includes(mode);
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modeItem, active && styles.modeItemActive]}
                  onPress={() => toggleMode(mode)}
                >
                  <Text style={[styles.modeItemText, active && styles.modeItemTextActive]}>
                    {mode.toUpperCase()}
                  </Text>
                  <Text style={styles.modeCheck}>{active ? '✓' : '+'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <PrimaryButton title="Enter Explore" onPress={handleFinish} />
          <View style={{ height: theme.spacing.sm }} />
          <SecondaryButton title="Back" onPress={() => setStep(2)} />
        </View>
      )}
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
    paddingTop: 60,
    paddingBottom: theme.spacing.xxl,
  },
  progressContainer: {
    marginBottom: theme.spacing.lg,
  },
  stepIndicator: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.brand,
    letterSpacing: 1,
  },
  stepContent: {
    gap: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.ink,
  },
  body: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.muted,
    lineHeight: 22,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: '#EAE6DC',
    gap: theme.spacing.md,
    marginVertical: theme.spacing.md,
  },
  cardItem: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.ink,
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginVertical: theme.spacing.lg,
  },
  modesList: {
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.lg,
  },
  modeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: '#EAE6DC',
  },
  modeItemActive: {
    borderColor: theme.colors.brand,
    backgroundColor: '#FAF8F5',
  },
  modeItemText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  modeItemTextActive: {
    color: theme.colors.brand,
  },
  modeCheck: {
    fontSize: 16,
    color: theme.colors.brand,
    fontWeight: 'bold',
  },
});
