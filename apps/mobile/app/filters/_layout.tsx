import { Stack } from 'expo-router';
import React from 'react';
import { theme } from '../../src/theme';

/** Explore → filter button. One modal holding the "Your feed" list and its editors. */
export default function FiltersLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }} />;
}
