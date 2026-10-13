import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useChat } from '../../src/features/chat/useChat';
import { useConnections } from '../../src/features/connections/useConnections';
import { OriginContextCard } from '../../src/components/OriginContextCard';
import { theme } from '../../src/theme';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const connectionId = Array.isArray(id) ? id[0] : id || '';

  const { data: messages, isLoading, sendMessage, isSending } = useChat(connectionId);
  const { data: connections } = useConnections();
  const connection = connections?.find((c) => c.id === connectionId);

  const [inputText, setInputText] = useState('');

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    await sendMessage(text);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Pinned Origin Card */}
        {connection && <OriginContextCard origin={connection.origin} />}

        {isLoading ? (
          <ActivityIndicator
            style={{ marginTop: theme.spacing.xl }}
            color={theme.colors.brand}
          />
        ) : (
          messages?.map((msg) => {
            const isMe = msg.senderId !== connection?.partner.id && msg.senderId !== 'system';
            const isSystem = msg.senderId === 'system';

            if (isSystem) {
              return (
                <View key={msg.id} style={styles.systemBubble}>
                  <Text style={styles.systemText}>{msg.text}</Text>
                </View>
              );
            }

            return (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  isMe ? styles.messageRowMe : styles.messageRowThem,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isMe ? styles.bubbleMe : styles.bubbleThem,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isMe ? styles.messageTextMe : styles.messageTextThem,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Input bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a thoughtful reply..."
          placeholderTextColor={theme.colors.muted}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  systemBubble: {
    backgroundColor: '#EAE6DC',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.control,
    marginVertical: theme.spacing.sm,
    alignSelf: 'center',
  },
  systemText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowThem: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: theme.colors.brand,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#EAE6DC',
  },
  messageText: {
    fontSize: theme.typography.fontSize.base,
    lineHeight: 22,
  },
  messageTextMe: {
    color: theme.colors.surface,
  },
  messageTextThem: {
    color: theme.colors.ink,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#EAE6DC',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: theme.touchTarget.min,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EAE6DC',
    borderRadius: theme.radius.control,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.ink,
  },
  sendBtn: {
    minHeight: theme.touchTarget.min,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.control,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: theme.colors.surface,
    fontWeight: '600',
    fontSize: theme.typography.fontSize.base,
  },
});
