import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../lib/theme';
import { Customer } from '../lib/types';
import Card from '../components/Card';
import Badge from '../components/Badge';
import api from '../lib/api';

interface Props {
  route: { params: { customerId: string } };
  navigation: any;
}

export default function CustomerDetailScreen({ route, navigation }: Props) {
  const { customerId } = route.params;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  const loadCustomer = async () => {
    try {
      const data = await api.getCustomer(customerId);
      setCustomer(data);
      navigation.setOptions({ title: `${data.firstName} ${data.lastName}` });
    } catch (error) {
      console.error('Failed to load customer:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Customer not found</Text>
      </View>
    );
  }

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return colors.success;
      case 'expiring_soon': return colors.warning;
      case 'expired': return colors.error;
      default: return colors.error;
    }
  };

  const getDaysUntilExpiry = () => {
    if (!customer.idExpirationDate) return null;
    const days = Math.ceil(
      (new Date(customer.idExpirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const expiryDays = getDaysUntilExpiry();

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, isTablet && styles.contentTablet]}>
      {/* Profile Header */}
      <Card>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {customer.firstName[0]}{customer.lastName[0]}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{customer.firstName} {customer.lastName}</Text>
            <Text style={styles.profilePmb}>PMB {customer.pmb}</Text>
            <View style={styles.badgeRow}>
              <Badge label={customer.source} variant="info" />
              <Badge
                label={customer.complianceStatus.replace('_', ' ')}
                variant={customer.complianceStatus === 'compliant' ? 'success' : customer.complianceStatus === 'expiring_soon' ? 'warning' : 'error'}
              />
            </View>
          </View>
        </View>
      </Card>

      {/* Contact Info */}
      <Card title="Contact Information">
        <InfoRow icon="mail-outline" label="Email" value={customer.email} />
        <InfoRow icon="call-outline" label="Phone" value={customer.phone} />
        <InfoRow icon="notifications-outline" label="Notifications" value={customer.notificationPreference.toUpperCase()} />
        <InfoRow icon="calendar-outline" label="Customer Since" value={new Date(customer.createdAt).toLocaleDateString()} />
      </Card>

      {/* Package & Mail Stats */}
      <Card title="Activity">
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{customer.packageCount}</Text>
            <Text style={styles.statLabel}>Packages</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{customer.mailCount}</Text>
            <Text style={styles.statLabel}>Mail Items</Text>
          </View>
        </View>
      </Card>

      {/* Compliance */}
      <Card title="CMRA Compliance">
        <InfoRow
          icon="id-card-outline"
          label="ID Expiration"
          value={customer.idExpirationDate
            ? `${new Date(customer.idExpirationDate).toLocaleDateString()}${expiryDays !== null ? ` (${expiryDays > 0 ? expiryDays + ' days left' : 'EXPIRED'})` : ''}`
            : 'Not set'
          }
          valueColor={expiryDays !== null ? getComplianceColor(customer.complianceStatus) : undefined}
        />
        <InfoRow
          icon="document-text-outline"
          label="Form 1583"
          value={customer.form1583Status || 'Not submitted'}
        />
        {customer.form1583Date && (
          <InfoRow icon="time-outline" label="Form 1583 Date" value={new Date(customer.form1583Date).toLocaleDateString()} />
        )}
      </Card>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, valueColor }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.left}>
        <Ionicons name={icon} size={18} color={colors.textMuted} />
        <Text style={infoStyles.label}>{label}</Text>
      </View>
      <Text style={[infoStyles.value, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontSize: fontSize.sm, color: colors.textSecondary },
  value: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  contentTablet: { maxWidth: 700, alignSelf: 'center', width: '100%' },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: fontSize.lg, color: colors.textMuted },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary },
  profileInfo: { flex: 1, gap: spacing.xs },
  profileName: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary },
  profilePmb: { fontSize: fontSize.md, color: colors.textSecondary },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  statsGrid: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  statNumber: { fontSize: fontSize.xxxl, fontWeight: '700', color: colors.textPrimary },
  statLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  statDivider: { width: 1, height: 48, backgroundColor: colors.divider },
});
