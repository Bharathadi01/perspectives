import React from 'react';
import { Redirect } from 'expo-router';

export default function RootIndex() {
  return <Redirect href="/(tabs)/explore" />;
}
