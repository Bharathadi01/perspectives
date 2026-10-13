import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useCreateRequest } from '../../src/features/create/useCreateRequest';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { theme } from '../../src/theme';
import {
  RequestCategory,
  ResponseStyle,
  ConnectionMode,
} from '@perspective/contracts';
import { router } from 'expo-router';

export default function CreateRequestScreen() {
  const { createRequest, isCreating } = useCreateRequest();

  const [category, setCategory] = useState<RequestCategory>('style');
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>('direct_practical' as any);
  const [allowsConnection, setAllowsConnection] = useState(true);
  const [selectedModes, setSelectedModes] = useState<ConnectionMode[]>([
    'network',
    'friends',
  ]);

  const categories: { key: RequestCategory; label: string }[] = [
    { key: 'style', label: 'Style & Outfits' },
    { key: 'fitness', label: 'Fitness & Posture' },
    { key: 'dating_profile', label: 'Dating Profile' },
    { key: 'career', label: 'Career & Bio' },
    { key: 'creative_work', label: 'Creative Work' },
    { key: 'idea_feedback', label: 'Idea Feedback' },
    { key: 'social_situation', label: 'Social Situation' },
    { key: 'other', label: 'Other' },
  ];

  const stylesList: { key: ResponseStyle; label: string }[] = [
    { key: 'direct', label: 'Direct' },
    { key: 'gentle', label: 'Gentle' },
    { key: 'practical', label: 'Practical' },
    { key: 'first_impression', label: 'First Impression' },
    { key: 'expert', label: 'Expert' },
    { key: 'open_ended', label: 'Open-ended' },
  ];

  const availableModes: ConnectionMode[] = ['friends', 'network', 'collaborate', 'date', 'chat'];

  const toggleMode = (mode: ConnectionMode) => {
    if (selectedModes.includes(mode)) {
      setSelectedModes(selectedModes.filter((m) => m !== mode));
    } else {
      setSelectedModes([...selectedModes, mode]);
    }
  };

  const handlePublish = async () => {
    if (question.trim().length < 5) {
      Alert.alert('Question Required', 'Please enter a clear question of at least 5 characters.');
      return;
    }

    try {
      await createRequest({
        category,
        question: question.trim(),
        context: context.trim() || undefined,
        responseStyle: responseStyle || 'direct',
        allowsConnection,
        allowedConnectionModes: allowsConnection ? selectedModes : [],
        idempotencyKey: `req_crt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      });

      Alert.alert(
        'Request Published! 🎉',
        'Your Perspective Request is now active and being matched with qualified responders.',
        [
          {
            text: 'View in Explore',
            onPress: () => router.push('/(tabs)/explore'),
          },
        ]
      );

      // Reset form
      setQuestion('');
      setContext('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to publish request.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Ask for Perspective</Text>
      <Text style={styles.subtitle}>
        Frame a specific question. Qualified people will give structured, private feedback.
      </Text>

      {/* Category Picker */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>CATEGORY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.pill, category === c.key && styles.pillActive]}
              onPress={() => setCategory(c.key)}
            >
              <Text style={[styles.pillText, category === c.key && styles.pillTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Exact Question */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          EXACT QUESTION <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.questionInput]}
          placeholder="e.g. What first impression does this outfit give for a casual client meeting?"
          placeholderTextColor={theme.colors.muted}
          value={question}
          onChangeText={setQuestion}
          multiline
          maxLength={200}
        />
        <Text style={styles.charCount}>{question.length}/200</Text>
      </View>

      {/* Context */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>BACKGROUND & CONTEXT (OPTIONAL)</Text>
        <TextInput
          style={[styles.input, styles.contextInput]}
          placeholder="Explain who you are meeting, what you're trying to communicate, or specific doubts..."
          placeholderTextColor={theme.colors.muted}
          value={context}
          onChangeText={setContext}
          multiline
          maxLength={500}
        />
      </View>

      {/* Response Style */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>DESIRED RESPONSE STYLE</Text>
        <View style={styles.stylesGrid}>
          {stylesList.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.styleBtn, responseStyle === s.key && styles.styleBtnActive]}
              onPress={() => setResponseStyle(s.key)}
            >
              <Text
                style={[
                  styles.styleBtnText,
                  responseStyle === s.key && styles.styleBtnTextActive,
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Connection Permission */}
      <View style={styles.formGroup}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>ALLOW CONNECTION INTEREST</Text>
            <Text style={styles.hint}>
              Allow responders to express mutual interest if your feedback lands well.
            </Text>
          </View>
          <Switch
            value={allowsConnection}
            onValueChange={setAllowsConnection}
            trackColor={{ false: '#EAE6DC', true: theme.colors.brand }}
          />
        </View>

        {allowsConnection && (
          <View style={styles.modesContainer}>
            <Text style={styles.sublabel}>Allowed Connection Modes:</Text>
            <View style={styles.modesRow}>
              {availableModes.map((m) => {
                const active = selectedModes.includes(m);
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.modeChip, active && styles.modeChipActive]}
                    onPress={() => toggleMode(m)}
                  >
                    <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>
                      {m.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      <View style={styles.submitContainer}>
        <PrimaryButton
          title="Publish Perspective Request"
          onPress={handlePublish}
          loading={isCreating}
        />
      </View>
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
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.ink,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.muted,
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  sublabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.ink,
    marginBottom: theme.spacing.xs,
  },
  hint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    lineHeight: 18,
  },
  required: {
    color: theme.colors.danger,
  },
  pillsRow: {
    flexDirection: 'row',
  },
  pill: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EAE6DC',
    marginRight: theme.spacing.sm,
  },
  pillActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  pillText: {
    fontSize: 12,
    color: theme.colors.ink,
  },
  pillTextActive: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: '#EAE6DC',
    borderRadius: theme.radius.control,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.ink,
  },
  questionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: theme.typography.fontSize.md,
    lineHeight: 24,
  },
  contextInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 4,
  },
  stylesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  styleBtn: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EAE6DC',
  },
  styleBtnActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  styleBtnText: {
    fontSize: 12,
    color: theme.colors.ink,
  },
  styleBtnTextActive: {
    color: theme.colors.surface,
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modesContainer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: '#FAF8F5',
    borderRadius: theme.radius.control,
  },
  modesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: 4,
  },
  modeChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: '#EAE6DC',
  },
  modeChipActive: {
    backgroundColor: theme.colors.brand,
  },
  modeChipText: {
    fontSize: 11,
    color: theme.colors.ink,
  },
  modeChipTextActive: {
    color: theme.colors.surface,
    fontWeight: 'bold',
  },
  submitContainer: {
    marginTop: theme.spacing.lg,
  },
});
