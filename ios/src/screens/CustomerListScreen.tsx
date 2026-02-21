import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../lib/theme';
import { Customer } from '../lib/types';
import Badge from '../components/Badge';
import api from '../lib/api';

interface Props {
  navigation: any;
}

export default function CustomerListScreen({ navigation }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const fetchCustomers = useCallback(async (pageNum: number = 1, searchTerm?: string) => {
    try {
      const result = await api.getCustomers({
        search: searchTerm || search,
        page: pageNum,
        pageSize: 25,
      });
      if (pageNum === 1) {
        setCustomers(result.data);
      } else {
        setCustomers((prev) => [...prev, ...result.data]);
      }
      setHasMore(result.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCustomers(1);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers(1);
    setRefreshing(false);
  };

  const onSearch = () => {
    setLoading(true);
    fetchCustomers(1, search);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchCustomers(page + 1);
    }
  };

  const getComplianceBadge = (status: string) => {
    switch (status) {
      case 'compliant': return <Badge label="Compliant" variant="success" />;
      case 'expiring_soon': return <Badge label="Expiring" variant="warning" />;
      case 'expired': return <Badge label="Expired" variant="error" />;
      case 'missing': return <Badge label="Missing" variant="error" />;
      default: return null;
    }
  };

  const renderCustomer = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.customerLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.firstName[0]}{item.lastName[0]}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.customerName}>{item.firstName} {item.lastName}</Text>
          <Text style={styles.customerMeta}>PMB {item.pmb} · {item.email}</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statText}>📦 {item.packageCount}</Text>
            <Text style={styles.statText}>📬 {item.mailCount}</Text>
          </View>
        </View>
      </View>
      <View style={styles.customerRight}>
        {getComplianceBadge(item.complianceStatus)}
        <Badge label={item.source} variant="info" />
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <View style={[styles.searchInput, isTablet && { maxWidth: 500 }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchTextInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, PMB, email..."
            placeholderTextColor={colors.placeholder}
            returnKeyType="search"
            onSubmitEditing={onSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); fetchCustomers(1, ''); }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Customer List */}
      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        renderItem={renderCustomer}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No customers found</Text>
              <Text style={styles.emptyText}>Try adjusting your search criteria.</Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore && customers.length > 0 ? (
            <ActivityIndicator color={colors.primary} style={{ padding: spacing.lg }} />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.divider },
  searchInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, gap: spacing.sm },
  searchTextInput: { flex: 1, paddingVertical: spacing.md, fontSize: fontSize.md, color: colors.textPrimary },
  listContent: { padding: spacing.lg, gap: spacing.sm },
  customerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.lg },
  customerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  customerName: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  customerMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  statText: { fontSize: fontSize.xs, color: colors.textMuted },
  customerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: spacing.md },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textSecondary },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted },
});
