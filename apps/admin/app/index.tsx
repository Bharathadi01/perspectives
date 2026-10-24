import { Redirect } from 'expo-router';
import React from 'react';
import { session } from '../src/api';

export default function Index() {
  return <Redirect href={session.get() ? '/queue' : '/login'} />;
}
