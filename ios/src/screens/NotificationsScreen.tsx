import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../lib/theme';
import { Notification } from '../lib/types';
import Badge from '../components/Badge';
import api from '../lib/api';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const result = await api.getNotifications({ pageSize: 50 });
      setNotifications(result.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent': return <Badge label="Sent" variant="info" />;
      case 'delivered': return <Badge label="Delivered" variant="success" />;
      case 'failed': return <Badge label="Failed" variant="error" />;
      case 'pending': return <Badge label="Pending" variant="warning" />;
      default: return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return 'mail-outline';
      case 'sms': return 'chatbubble-outline';
      default: return 'notifications-outline';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <View style={styles.notifCard}>
      <View style={styles.notifIcon}>
        <Ionicons
          name={getTypeIcon(item.type) as any}
          size={20}
          color={colors.primary}
        />
      </View>
      <View style={styles.notifContent}>
        <View style={styles.notifHeader}>
          <Text style={styles.notifRecipient} numberOfLines={1}>{item.recipientName}</Text>
          <Text style={styles.notifTime}>{formatTime(item.sentAt)}</Text>
        </View>
        <Text style={styles.notifSubject} numberOfLines={1}>{item.subject}</Text>
        <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
        <View style={styles.notifFooter}>
          <Badge label={item.type.toUpperCase()} variant="info" />
          {getStatusBadge(item.status)}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptyText}>Notifications will appear here when sent.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, gap: spacing.sm },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    gap: spacing.md,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifContent: { flex: 1, gap: spacing.xs },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifRecipient: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  notifTime: { fontSize: fontSize.xs, color: colors.textMuted },
  notifSubject: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSecondary },
  notifBody: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 18 },
  notifFooter: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: spacing.md },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textSecondary },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted },
});
