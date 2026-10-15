import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { theme } from '../../theme';

const t = theme.typography;

export const Title = (p: TextProps) => <Text accessibilityRole="header" {...p} style={[s.title, p.style]} />;
export const Heading = (p: TextProps) => <Text accessibilityRole="header" {...p} style={[s.heading, p.style]} />;
export const Body = (p: TextProps) => <Text {...p} style={[s.body, p.style]} />;
export const Muted = (p: TextProps) => <Text {...p} style={[s.muted, p.style]} />;
export const Label = (p: TextProps) => <Text {...p} style={[s.label, p.style]} />;

const s = StyleSheet.create({
  title: { fontSize: t.fontSize.xl, fontWeight: t.fontWeight.bold, color: theme.colors.ink },
  heading: { fontSize: t.fontSize.md, fontWeight: t.fontWeight.semibold, color: theme.colors.ink },
  body: { fontSize: t.fontSize.base, color: theme.colors.ink, lineHeight: t.fontSize.base * t.lineHeight.normal },
  muted: { fontSize: t.fontSize.sm, color: theme.colors.muted, lineHeight: t.fontSize.sm * t.lineHeight.normal },
  label: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.semibold,
    color: theme.colors.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
