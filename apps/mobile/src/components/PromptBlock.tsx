import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface PromptBlockProps {
  question: string;
  answer: string;
}

export const PromptBlock: React.FC<PromptBlockProps> = ({ question, answer }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.answer}>{answer}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAF8F5',
    borderRadius: theme.radius.control,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.brand,
  },
  question: {
    color: theme.colors.muted,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  answer: {
    color: theme.colors.ink,
    fontSize: theme.typography.fontSize.base,
    lineHeight: 22,
    fontWeight: theme.typography.fontWeight.regular,
  },
});
