import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../lib/theme';
import { Package, Customer } from '../lib/types';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';
import api from '../lib/api';

interface Props {
  navigation: any;
}

export default function PackageCheckOutScreen({ navigation }: Props) {
  const [pmbSearch, setPmbSearch] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const handleSearch = async () => {
    if (!pmbSearch.trim()) return;
    setSearching(true);
    try {
      const customers = await api.searchCustomersByPMB(pmbSearch.trim());
      if (customers.length === 1) {
        await selectCustomer(customers[0]);
      } else if (customers.length > 1) {
        // Show selection
        Alert.alert('Multiple Results', 'Multiple customers found. Please refine your search.');
      } else {
        Alert.alert('Not Found', `No customer found with PMB "${pmbSearch}".`);
      }
    } catch {
      Alert.alert('Error', 'Failed to search customers.');
    } finally {
      setSearching(false);
    }
  };

  const selectCustomer = async (c: Customer) => {
    setCustomer(c);
    try {
      const result = await api.getPackages({
        status: 'checked_in',
        search: c.pmb,
        pageSize: 50,
      });
      setPackages(result.data);
    } catch {
      Alert.alert('Error', 'Failed to load packages.');
    }
  };

  const togglePackage = (id: string) => {
    setSelectedPackages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedPackages.size === packages.length) {
      setSelectedPackages(new Set());
    } else {
      setSelectedPackages(new Set(packages.map((p) => p.id)));
    }
  };

  const handleCheckOut = async () => {
    if (selectedPackages.size === 0) {
      Alert.alert('Error', 'Please select at least one package.');
      return;
    }

    setLoading(true);
    try {
      for (const packageId of selectedPackages) {
        await api.checkOutPackage({ packageId });
      }
      Alert.alert(
        'Success',
        `${selectedPackages.size} package(s) checked out for ${customer?.firstName} ${customer?.lastName}.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to check out packages.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, isTablet && styles.contentTablet]}>
      {/* PMB Lookup */}
      <Card title="Customer Lookup">
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={pmbSearch}
            onChangeText={setPmbSearch}
            placeholder="Enter PMB number"
            placeholderTextColor={colors.placeholder}
            keyboardType="number-pad"
            onSubmitEditing={handleSearch}
          />
          <Button title="Look Up" onPress={handleSearch} disabled={searching} variant="primary" size="sm">
            {searching && <ActivityIndicator color={colors.textPrimary} size="small" />}
          </Button>
        </View>

        {customer && (
          <View style={styles.customerInfo}>
            <View style={styles.customerRow}>
              <Ionicons name="person-circle-outline" size={40} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{customer.firstName} {customer.lastName}</Text>
                <Text style={styles.customerMeta}>PMB {customer.pmb} · {customer.email}</Text>
              </View>
              <Badge label={`${packages.length} pkg`} variant={packages.length > 0 ? 'warning' : 'success'} />
            </View>
          </View>
        )}
      </Card>

      {/* Packages */}
      {customer && packages.length > 0 && (
        <Card title={`Packages for PMB ${customer.pmb}`}>
          <TouchableOpacity style={styles.selectAllRow} onPress={selectAll}>
            <Ionicons
              name={selectedPackages.size === packages.length ? 'checkbox' : 'square-outline'}
              size={22}
              color={colors.primary}
            />
            <Text style={styles.selectAllText}>
              {selectedPackages.size === packages.length ? 'Deselect All' : 'Select All'}
            </Text>
            <Text style={styles.selectedCount}>{selectedPackages.size} selected</Text>
          </TouchableOpacity>

          {packages.map((pkg) => (
            <TouchableOpacity
              key={pkg.id}
              style={[styles.packageRow, selectedPackages.has(pkg.id) && styles.packageRowSelected]}
              onPress={() => togglePackage(pkg.id)}
            >
              <Ionicons
                name={selectedPackages.has(pkg.id) ? 'checkbox' : 'square-outline'}
                size={22}
                color={selectedPackages.has(pkg.id) ? colors.primary : colors.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.trackingText}>{pkg.trackingNumber}</Text>
                <Text style={styles.packageMeta}>
                  {pkg.carrier.toUpperCase()} · Checked in {new Date(pkg.checkedInAt).toLocaleDateString()}
                </Text>
                {pkg.description && <Text style={styles.packageDesc}>{pkg.description}</Text>}
              </View>
            </TouchableOpacity>
          ))}

          <View style={styles.checkOutActions}>
            <Button
              title={`Release ${selectedPackages.size} Package${selectedPackages.size !== 1 ? 's' : ''}`}
              onPress={handleCheckOut}
              disabled={loading || selectedPackages.size === 0}
              variant="primary"
              size="lg"
            >
              {loading && <ActivityIndicator color={colors.textPrimary} size="small" />}
            </Button>
          </View>
        </Card>
      )}

      {customer && packages.length === 0 && (
        <Card>
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No packages</Text>
            <Text style={styles.emptyText}>This customer has no packages waiting for pickup.</Text>
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  contentTablet: { maxWidth: 700, alignSelf: 'center', width: '100%' },
  inputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: borderRadius.md, padding: spacing.lg, fontSize: fontSize.md, color: colors.textPrimary },
  customerInfo: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.divider },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  customerName: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textPrimary },
  customerMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  selectAllRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.divider },
  selectAllText: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600', flex: 1 },
  selectedCount: { fontSize: fontSize.sm, color: colors.textMuted },
  packageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.divider },
  packageRowSelected: { backgroundColor: colors.primaryLight + '30' },
  trackingText: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  packageMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  packageDesc: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  checkOutActions: { marginTop: spacing.lg },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.md },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textSecondary },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center' },
});
