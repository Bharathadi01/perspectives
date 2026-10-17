import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CANONICAL_PERSONALITY_PROMPTS,
  PersonalityPromptAnswer,
} from '@perspective/contracts';
import { useOnboardingStore } from '../../session/onboardingStore';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { Label, Muted } from '../ui/Text';

export function StepPersonality({ onNext }: { onNext: () => void }) {
  const { personalityPrompts, setField } = useOnboardingStore();
  const initialSelected = personalityPrompts[0]?.promptId ?? CANONICAL_PERSONALITY_PROMPTS[0].id;
  const initialAnswer = personalityPrompts[0]?.answer ?? '';

  const [selectedPromptId, setSelectedPromptId] = useState<string>(initialSelected);
  const [answer, setAnswer] = useState<string>(initialAnswer);

  const currentPrompt =
    CANONICAL_PERSONALITY_PROMPTS.find((p) => p.id === selectedPromptId) ??
    CANONICAL_PERSONALITY_PROMPTS[0];

  const handleContinue = () => {
    if (answer.trim().length >= 2) {
      const entry: PersonalityPromptAnswer = {
        promptId: currentPrompt.id,
        question: currentPrompt.question,
        answer: answer.trim(),
      };
      setField('personalityPrompts', [entry]);
    }
    onNext();
  };

  const handleSkip = () => {
    onNext();
  };

  return (
    <View style={s.container}>
      <View style={s.headerBox}>
        <View style={s.labelRow}>
          <Label>Written Perspective Prompt</Label>
          <Muted style={s.optionalTag}>Optional</Muted>
        </View>
        <Muted>
          Select a prompt to give potential matches a window into your voice, humor, or curiosities.
        </Muted>
      </View>

      {/* Prompt Selector Pills */}
      <View style={s.promptsList}>
        {CANONICAL_PERSONALITY_PROMPTS.map((p) => {
          const isSelected = p.id === selectedPromptId;
          return (
            <Pressable
              key={p.id}
              onPress={() => {
                setSelectedPromptId(p.id);
                // Clear or keep answer if switching
              }}
              style={[s.promptCard, isSelected && s.promptCardSelected]}
            >
              <Text style={[s.promptQuestion, isSelected && s.promptQuestionSelected]}>
                {p.question}
              </Text>
              {isSelected ? (
                <Ionicons name="create-outline" size={16} color={theme.colors.brand} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Answer Input Card */}
      <View style={s.answerCard}>
        <Text style={s.activeQuestion}>{currentPrompt.question}</Text>
        <TextInput
          style={s.answerInput}
          multiline
          maxLength={300}
          placeholder={currentPrompt.placeholder}
          placeholderTextColor={theme.colors.muted}
          value={answer}
          onChangeText={setAnswer}
          textAlignVertical="top"
        />
        <View style={s.charCountRow}>
          <Text style={s.charCount}>{answer.length}/300</Text>
        </View>
      </View>

      <View style={s.actions}>
        <Button
          title={answer.trim().length >= 2 ? 'Save & Review' : 'Continue to Review'}
          onPress={handleContinue}
        />
        <Button title="Skip for now" variant="ghost" onPress={handleSkip} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: theme.spacing.md },
  headerBox: { gap: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionalTag: { fontSize: theme.typography.fontSize.xs, color: theme.colors.muted },
  promptsList: { gap: theme.spacing.xs },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
  },
  promptCardSelected: {
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.brandSoft,
  },
  promptQuestion: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.ink,
  },
  promptQuestionSelected: {
    color: theme.colors.brand,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  answerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.base,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  activeQuestion: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.brand,
  },
  answerInput: {
    minHeight: 100,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.ink,
    lineHeight: theme.typography.fontSize.base * 1.4,
  },
  charCountRow: {
    alignItems: 'flex-end',
  },
  charCount: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
  },
  actions: { gap: theme.spacing.xs, marginTop: theme.spacing.sm },
});
