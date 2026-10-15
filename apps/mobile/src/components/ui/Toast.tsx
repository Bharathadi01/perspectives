import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';

type Tone = 'info' | 'success' | 'error';
interface ToastMessage {
  id: number;
  text: string;
  tone: Tone;
}

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => undefined);

/** In-app feedback that works on iOS, Android and web (replaces Alert.alert). */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const show = useCallback((text: string, tone: Tone = 'info') => {
    setMessage({ id: Date.now(), text, tone });
    AccessibilityInfo.announceForAccessibility?.(text);
  }, []);

  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setMessage(null));
    }, 3200);
    return () => clearTimeout(timer);
  }, [message, opacity]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[s.toast, s[message.tone], { opacity, top: insets.top + theme.spacing.sm }]}
        >
          <Text style={s.text}>{message.text}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const s = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: theme.spacing.base,
    right: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.base,
    borderRadius: theme.radius.control,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  info: { backgroundColor: theme.colors.ink },
  success: { backgroundColor: theme.colors.success },
  error: { backgroundColor: theme.colors.danger },
  text: { color: theme.colors.onDark, fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium },
});
