import { RULES } from '@perspective/contracts';
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { tap } from '../../../lib/haptics';
import { theme } from '../../../theme';
import { ArrowUpIcon } from '../icons';

const e = theme.editorial;
/** Show how much room is left only near the end, so it never nags. */
const COUNT_FROM = RULES.messageMaxLength - 120;

export interface ComposerHandle {
  /** Put text in the box (a conversation idea's first line) and open the keyboard to finish it. */
  fill: (text: string) => void;
}

/**
 * Where you write. A white pill on paper that grows to about five lines, and an
 * ink send button that only wakes up when there is something to send.
 */
export const Composer = forwardRef<ComposerHandle, {
  placeholder: string;
  autoFocus: boolean;
  onSend: (text: string) => void;
}>(function Composer({ placeholder, autoFocus, onSend }, ref) {
  const [text, setText] = useState('');
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  useImperativeHandle(ref, () => ({
    fill: (next: string) => {
      setText(next);
      input.current?.focus();
    },
  }));
  const [focused, setFocused] = useState(false);
  const body = text.trim();
  const ready = body.length > 0;

  const send = () => {
    if (!ready) return;
    tap();
    onSend(body);
    setText('');
  };

  return (
    <View style={s.bar}>
      <View style={[s.field, focused && s.fieldFocused]}>
        <TextInput
          ref={input}
          value={text}
          onChangeText={setText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          placeholder={placeholder}
          placeholderTextColor={e.colors.muted}
          accessibilityLabel="Message"
          maxLength={RULES.messageMaxLength}
          multiline
          style={s.input}
        />
        {text.length >= COUNT_FROM ? (
          <Text style={s.count} accessibilityLabel={`${RULES.messageMaxLength - text.length} characters left`}>
            {RULES.messageMaxLength - text.length}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={send}
        disabled={!ready}
        accessibilityRole="button"
        accessibilityLabel="Send"
        accessibilityState={{ disabled: !ready }}
        style={({ pressed }) => [s.send, !ready && s.sendOff, pressed && s.pressed]}
      >
        <ArrowUpIcon size={20} weight="bold" color={e.colors.onInk} />
      </Pressable>
    </View>
  );
});

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: theme.spacing.base,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: e.colors.line,
    backgroundColor: e.colors.paper,
  },
  field: {
    flex: 1,
    minHeight: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: e.colors.line,
    backgroundColor: e.colors.surface,
    paddingHorizontal: theme.spacing.base,
    justifyContent: 'center',
  },
  fieldFocused: { borderColor: e.colors.ink },
  input: {
    fontFamily: e.fonts.body,
    fontSize: 16,
    lineHeight: 21,
    color: e.colors.ink,
    maxHeight: 21 * 5 + 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  count: { position: 'absolute', right: 14, bottom: 4, fontFamily: e.fonts.body, fontSize: 10, color: e.colors.muted },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: e.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { opacity: 0.3 },
  pressed: { opacity: theme.opacity.pressed },
});
