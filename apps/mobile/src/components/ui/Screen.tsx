import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface ScreenProps {
  children: React.ReactNode;
  edges?: Edge[];
  style?: ViewStyle;
  surface?: 'background' | 'surface';
}

export function Screen({ children, edges = ['top'], style, surface = 'background' }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={[s.flex, { backgroundColor: theme.colors[surface] }]}>
      <View style={[s.flex, style]}>{children}</View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({ flex: { flex: 1 } });
