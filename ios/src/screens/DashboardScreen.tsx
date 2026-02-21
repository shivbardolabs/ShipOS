import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../lib/theme';
import { DashboardStats } from '../lib/types';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import api from '../lib/api';

interface Props {
  navigation: any;
}

export default function DashboardScreen({ navigation }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const columns = isTablet ? 4 : 2;

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const quickActions = [
    { icon: 'scan-outline' as const, label: 'Scan Package', screen: 'Scanner', color: colors.primary },
    { icon: 'add-circle-outline' as const, label: 'Check In', screen: 'PackageCheckIn', color: colors.success },
    { icon: 'exit-outline' as const, label: 'Check Out', screen: 'PackageCheckOut', color: colors.warning },
    { icon: 'people-outline' as const, label: 'Customers', screen: 'CustomerList', color: colors.info },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good {getTimeOfDay()}</Text>
        <Text style={styles.date}>{formatDate(new Date())}</Text>
      </View>

      {/* Stats Grid */}
      <View style={[styles.statsGrid, { flexDirection: 'row', flexWrap: 'wrap' }]}>
        <StatCard
          title="Packages Held"
          value={stats?.packagesHeld ?? '-'}
          icon="cube-outline"
          color={colors.primary}
          style={{ width: `${100 / columns}%` as any }}
        />
        <StatCard
          title="Checked In Today"
          value={stats?.checkedInToday ?? '-'}
          icon="arrow-down-circle-outline"
          color={colors.success}
          style={{ width: `${100 / columns}%` as any }}
        />
        <StatCard
          title="Checked Out Today"
          value={stats?.checkedOutToday ?? '-'}
          icon="arrow-up-circle-outline"
          color={colors.warning}
          style={{ width: `${100 / columns}%` as any }}
        />
        <StatCard
          title="Compliance Alerts"
          value={stats?.complianceAlerts ?? '-'}
          icon="alert-circle-outline"
          color={stats?.complianceAlerts ? colors.error : colors.success}
          style={{ width: `${100 / columns}%` as any }}
        />
      </View>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionButton}
              onPress={() => navigation.navigate(action.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Activity Summary */}
      <Card title="Today's Summary">
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Mail received</Text>
          <Text style={styles.summaryValue}>{stats?.mailReceived ?? '-'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Pending pickups</Text>
          <Text style={styles.summaryValue}>{stats?.pendingPickups ?? '-'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Active customers</Text>
          <Text style={styles.summaryValue}>{stats?.customersActive ?? '-'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Revenue today</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            ${stats?.revenueToday?.toFixed(2) ?? '-'}
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    marginBottom: spacing.sm,
  },
  greeting: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  date: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsGrid: {
    gap: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  summaryLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
});
