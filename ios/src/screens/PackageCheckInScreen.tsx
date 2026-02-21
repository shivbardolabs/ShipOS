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
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../lib/theme';
import { Carrier, Customer, PackageCheckInRequest } from '../lib/types';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';
import api from '../lib/api';

interface Props {
  navigation: any;
  route: any;
}

const CARRIERS: { value: Carrier; label: string; color: string }[] = [
  { value: 'ups', label: 'UPS', color: colors.carrierUPS },
  { value: 'fedex', label: 'FedEx', color: colors.carrierFedEx },
  { value: 'usps', label: 'USPS', color: colors.carrierUSPS },
  { value: 'dhl', label: 'DHL', color: colors.carrierDHL },
  { value: 'amazon', label: 'Amazon', color: colors.carrierAmazon },
  { value: 'other', label: 'Other', color: colors.textMuted },
];

export default function PackageCheckInScreen({ navigation, route }: Props) {
  const scannedBarcode = route.params?.barcode;
  const [step, setStep] = useState(1);
  const [trackingNumber, setTrackingNumber] = useState(scannedBarcode || '');
  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [pmbSearch, setPmbSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [description, setDescription] = useState('');
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // Step 1: Tracking number + carrier detection
  const handleLookup = async () => {
    if (!trackingNumber.trim()) {
      Alert.alert('Error', 'Please enter or scan a tracking number.');
      return;
    }
    setLoading(true);
    try {
      const result = await api.lookupByTracking(trackingNumber.trim());
      if (result.carrier) {
        const detected = CARRIERS.find((c) => c.value === result.carrier);
        if (detected) setCarrier(detected.value);
      }
      if (result.customer) {
        setCustomer(result.customer);
        setStep(3); // Skip to confirmation
      } else {
        setStep(2); // Customer lookup
      }
    } catch {
      setStep(2); // Proceed to manual customer lookup
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Customer search
  const handleSearchCustomer = async () => {
    if (!pmbSearch.trim()) return;
    setSearching(true);
    try {
      const results = await api.searchCustomersByPMB(pmbSearch.trim());
      setSearchResults(results);
    } catch {
      Alert.alert('Error', 'Failed to search customers.');
    } finally {
      setSearching(false);
    }
  };

  const selectCustomer = (c: Customer) => {
    setCustomer(c);
    setStep(3);
  };

  // Step 3: Confirm & check in
  const handleCheckIn = async () => {
    if (!customer || !carrier) {
      Alert.alert('Error', 'Missing required information.');
      return;
    }

    setLoading(true);
    try {
      const request: PackageCheckInRequest = {
        trackingNumber: trackingNumber.trim(),
        carrier,
        customerId: customer.id,
        description: description.trim() || undefined,
        notify,
      };
      await api.checkInPackage(request);
      Alert.alert('Success', `Package checked in for ${customer.firstName} ${customer.lastName}`, [
        { text: 'Check In Another', onPress: resetForm },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to check in package.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setTrackingNumber('');
    setCarrier(null);
    setCustomer(null);
    setPmbSearch('');
    setSearchResults([]);
    setDescription('');
    setNotify(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, isTablet && styles.contentTablet]}>
      {/* Progress */}
      <View style={styles.progress}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={styles.progressStep}>
            <View style={[styles.progressDot, step >= s && styles.progressDotActive]}>
              <Text style={[styles.progressDotText, step >= s && styles.progressDotTextActive]}>
                {step > s ? '✓' : s}
              </Text>
            </View>
            <Text style={[styles.progressLabel, step >= s && styles.progressLabelActive]}>
              {s === 1 ? 'Package' : s === 2 ? 'Customer' : 'Confirm'}
            </Text>
          </View>
        ))}
      </View>

      {/* Step 1: Tracking Number */}
      {step === 1 && (
        <Card title="Step 1 — Package Details">
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tracking Number</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={trackingNumber}
                onChangeText={setTrackingNumber}
                placeholder="Scan or enter tracking number"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => navigation.navigate('Scanner', { returnTo: 'PackageCheckIn' })}
              >
                <Ionicons name="scan-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Carrier</Text>
            <View style={styles.carrierGrid}>
              {CARRIERS.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.carrierChip, carrier === c.value && { borderColor: c.color, backgroundColor: c.color + '20' }]}
                  onPress={() => setCarrier(c.value)}
                >
                  <Text style={[styles.carrierChipText, carrier === c.value && { color: c.color }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Button title="Next" onPress={handleLookup} disabled={loading || !trackingNumber.trim()} variant="primary">
            {loading && <ActivityIndicator color={colors.textPrimary} size="small" />}
          </Button>
        </Card>
      )}

      {/* Step 2: Customer Lookup */}
      {step === 2 && (
        <Card title="Step 2 — Assign Customer">
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Search by PMB Number</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={pmbSearch}
                onChangeText={setPmbSearch}
                placeholder="Enter PMB number"
                placeholderTextColor={colors.placeholder}
                keyboardType="number-pad"
                onSubmitEditing={handleSearchCustomer}
              />
              <Button title="Search" onPress={handleSearchCustomer} disabled={searching} variant="secondary" size="sm" />
            </View>
          </View>

          {searching && <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />}

          {searchResults.map((c) => (
            <TouchableOpacity key={c.id} style={styles.customerResult} onPress={() => selectCustomer(c)}>
              <View>
                <Text style={styles.customerName}>{c.firstName} {c.lastName}</Text>
                <Text style={styles.customerMeta}>PMB {c.pmb} · {c.email}</Text>
              </View>
              <Badge label={c.source} variant="info" />
            </TouchableOpacity>
          ))}

          {searchResults.length === 0 && !searching && pmbSearch && (
            <Text style={styles.emptyText}>No customers found for PMB "{pmbSearch}"</Text>
          )}

          <Button title="Back" onPress={() => setStep(1)} variant="ghost" />
        </Card>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && customer && (
        <Card title="Step 3 — Confirm Check-In">
          <View style={styles.confirmSection}>
            <Text style={styles.confirmLabel}>Tracking</Text>
            <Text style={styles.confirmValue}>{trackingNumber}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.confirmSection}>
            <Text style={styles.confirmLabel}>Carrier</Text>
            <Badge label={carrier?.toUpperCase() || 'Unknown'} variant="info" />
          </View>
          <View style={styles.divider} />
          <View style={styles.confirmSection}>
            <Text style={styles.confirmLabel}>Customer</Text>
            <Text style={styles.confirmValue}>{customer.firstName} {customer.lastName} (PMB {customer.pmb})</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Large box, fragile"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <TouchableOpacity style={styles.toggleRow} onPress={() => setNotify(!notify)}>
            <Ionicons
              name={notify ? 'checkbox' : 'square-outline'}
              size={22}
              color={notify ? colors.primary : colors.textMuted}
            />
            <Text style={styles.toggleLabel}>Send notification to customer</Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <Button title="Back" onPress={() => setStep(customer ? 1 : 2)} variant="ghost" />
            <Button title="Check In Package" onPress={handleCheckIn} disabled={loading} variant="primary">
              {loading && <ActivityIndicator color={colors.textPrimary} size="small" />}
            </Button>
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
  progress: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xxxl, marginBottom: spacing.md },
  progressStep: { alignItems: 'center', gap: spacing.sm },
  progressDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  progressDotActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  progressDotText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  progressDotTextActive: { color: colors.primary },
  progressLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  progressLabelActive: { color: colors.textSecondary },
  inputGroup: { gap: spacing.sm, marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  input: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: borderRadius.md, padding: spacing.lg, fontSize: fontSize.md, color: colors.textPrimary },
  inputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  scanButton: { padding: spacing.lg, borderWidth: 1, borderColor: colors.primary + '40', borderRadius: borderRadius.md, backgroundColor: colors.primaryLight },
  carrierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  carrierChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  carrierChipText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  customerResult: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.divider },
  customerName: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  customerMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  emptyText: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing.xl },
  confirmSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  confirmLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  confirmValue: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.divider },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  toggleLabel: { fontSize: fontSize.md, color: colors.textSecondary },
  buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
});
