import React, { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme } from '../../theme';
import { Label } from './Text';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  /** Shows "current/limit" under the field. */
  counter?: { min?: number; max: number };
}

/** The native text input instance, for imperative focus. */
export type TextFieldRef = React.ComponentRef<typeof TextInput>;

export const TextField = forwardRef<TextFieldRef, TextFieldProps>(function TextField(
  { label, error, hint, counter, style, multiline, ...rest },
  ref,
) {
  const length = typeof rest.value === 'string' ? rest.value.trim().length : 0;
  const belowMin = counter?.min !== undefined && length > 0 && length < counter.min;
  return (
    <View style={s.wrap}>
      <Label>{label}</Label>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.muted}
        multiline={multiline}
        style={[s.input, multiline && s.multiline, !!error && s.inputError, style]}
        {...rest}
      />
      <View style={s.footer}>
        <Text style={[s.hint, !!error && s.error]}>{error ?? hint ?? ''}</Text>
        {counter && (
          <Text style={[s.hint, belowMin && s.error]}>
            {counter.min !== undefined && length < counter.min ? `${counter.min - length} more` : `${length}/${counter.max}`}
          </Text>
        )}
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  wrap: { gap: theme.spacing.xs },
  input: {
    minHeight: theme.touchTarget.min,
    borderRadius: theme.radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.ink,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  inputError: { borderColor: theme.colors.danger },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm },
  hint: { fontSize: theme.typography.fontSize.xs, color: theme.colors.muted, flexShrink: 1 },
  error: { color: theme.colors.danger },
});
