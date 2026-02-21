import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../lib/theme';
import Card from '../components/Card';
import api from '../lib/api';

interface Props {
  onLogout: () => void;
}

export default function SettingsScreen({ onLogout }: Props) {
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [autoScan, setAutoScan] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: onLogout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Scanner Settings */}
      <Card title="Scanner">
        <SettingToggle
          icon="scan-outline"
          label="Auto-scan on open"
          description="Start scanning immediately when opening the scanner"
          value={autoScan}
          onToggle={setAutoScan}
        />
        <SettingToggle
          icon="volume-high-outline"
          label="Scan sound"
          description="Play a sound when a barcode is detected"
          value={soundEnabled}
          onToggle={setSoundEnabled}
        />
        <SettingToggle
          icon="phone-portrait-outline"
          label="Haptic feedback"
          description="Vibrate on successful scan"
          value={hapticEnabled}
          onToggle={setHapticEnabled}
        />
      </Card>

      {/* Connection */}
      <Card title="Connection">
        <SettingRow
          icon="server-outline"
          label="Server URL"
          value={api.getApiBaseUrl()}
        />
        <SettingRow
          icon="information-circle-outline"
          label="App Version"
          value="1.0.0 (1)"
        />
      </Card>

      {/* Account */}
      <Card title="Account">
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </Card>

      {/* Footer */}
      <Text style={styles.footer}>ShipOS by Bardo Labs{'\n'}© 2026 All rights reserved</Text>
    </ScrollView>
  );
}

function SettingToggle({ icon, label, description, value, onToggle }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.textPrimary}
      />
    </View>
  );
}

function SettingRow({ icon, label, value }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.settingRow}>
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <Text style={styles.settingValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: fontSize.md, color: colors.textPrimary, fontWeight: '500' },
  settingDesc: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  settingValue: { fontSize: fontSize.sm, color: colors.textSecondary },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  logoutText: { fontSize: fontSize.md, color: colors.error, fontWeight: '600' },
  footer: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
    paddingVertical: spacing.xl,
  },
});
