import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useConnections } from '../../src/features/connections/useConnections';
import { PersonHeader } from '../../src/components/PersonHeader';
import { OriginContextCard } from '../../src/components/OriginContextCard';
import { EmptyState } from '../../src/components/EmptyState';
import { theme } from '../../src/theme';
import { router } from 'expo-router';

export default function ConnectionsScreen() {
  const { data: connections, isLoading, isError, refetch } = useConnections();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.brand} />
        <Text style={styles.loadingText}>Loading mutual connections...</Text>
      </View>
    );
  }

  if (isError || !connections) {
    return (
      <View style={styles.centerContainer}>
        <EmptyState
          emoji="⚠️"
          title="Could not load Connections"
          description="Please check your connection and retry."
          actionTitle="Retry"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {connections.length === 0 ? (
          <EmptyState
            emoji="🤝"
            title="No mutual connections yet"
            description="When both you and another person express compatible interest on a perspective, your connection opens here."
          />
        ) : (
          connections.map((conn) => (
            <TouchableOpacity
              key={conn.id}
              style={styles.connectionCard}
              onPress={() => router.push(`/chat/${conn.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.topRow}>
                <PersonHeader profile={conn.partner} fallbackName="Partner" />
                <View style={styles.modeBadge}>
                  <Text style={styles.modeBadgeText}>{conn.mode.toUpperCase()}</Text>
                </View>
              </View>

              <OriginContextCard origin={conn.origin} />

              <View style={styles.footerRow}>
                <Text style={styles.openChatPrompt}>Open conversation →</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.muted,
    fontSize: theme.typography.fontSize.sm,
  },
  connectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#EAE6DC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modeBadge: {
    backgroundColor: '#FAF8F5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.brand,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.brand,
  },
  footerRow: {
    marginTop: theme.spacing.sm,
    alignItems: 'flex-end',
  },
  openChatPrompt: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.brand,
  },
});
