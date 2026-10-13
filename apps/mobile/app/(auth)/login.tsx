import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { theme } from '../../src/theme';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { useAuthStore } from '../../src/stores/authStore';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [contact, setContact] = useState('');
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
  const { login, setAgeVerified } = useAuthStore();

  const handleContinue = () => {
    if (!isAdultConfirmed) {
      Alert.alert('Age Verification Required', 'Perspective is an 18+ community only.');
      return;
    }
    if (!contact.trim()) {
      Alert.alert('Contact Required', 'Please enter your phone number or email.');
      return;
    }

    setAgeVerified(true);
    login();
    router.replace('/(tabs)/explore');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brand}>Perspective</Text>
        <Text style={styles.tagline}>
          See yourself through other people's eyes—and connect through what you notice.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>PHONE NUMBER OR EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 98765 43210 or you@domain.com"
            placeholderTextColor={theme.colors.muted}
            value={contact}
            onChangeText={setContact}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={styles.ageGateRow}
            onPress={() => setIsAdultConfirmed(!isAdultConfirmed)}
          >
            <View style={[styles.checkbox, isAdultConfirmed && styles.checkboxActive]} />
            <Text style={styles.ageGateText}>
              I confirm that I am 18 years of age or older.
            </Text>
          </TouchableOpacity>

          <PrimaryButton
            title="Continue to Perspective"
            onPress={handleContinue}
          />
        </View>

        <Text style={styles.disclaimer}>
          By continuing, you agree to our Community Guidelines, constructive feedback policy, and Privacy Notice.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  content: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: '#EAE6DC',
  },
  brand: {
    fontSize: theme.typography.fontSize.hero,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.ink,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  tagline: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  form: {
    gap: theme.spacing.md,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.muted,
    letterSpacing: 0.5,
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
  ageGateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.xs,
    minHeight: 44,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#C7C4B8',
    marginRight: theme.spacing.sm,
  },
  checkboxActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  ageGateText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.ink,
    flex: 1,
  },
  disclaimer: {
    fontSize: 11,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: theme.spacing.lg,
  },
});
