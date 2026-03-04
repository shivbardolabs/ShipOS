'use client';

import type { ToggleSwitchProps } from './components/toggle-switch';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTheme } from '@/components/theme-provider';
import { useTenant } from '@/components/tenant-provider';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { Input, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

import { useActivityLog } from '@/components/activity-log-provider';
import { LastUpdatedBy } from '@/components/ui/performed-by';
import type { UserRole } from '@/lib/permissions';
import Link from 'next/link';
import {
  Building2,
  DollarSign,
  Truck,
  Receipt,
  Printer,
  Bell,
  Users,
  Save,
  Plus,
  Edit3,
  Check,
  X,
  Shield,
  Wifi,
  WifiOff,
  TestTube,
  Mail,
  Upload,
  Trash2,
  Smartphone,
  Sparkles,
  TrendingUp,
  FileText,
  Palette,
  Sun,
  Moon,
  Crown,
  Star,
  Zap,
  Package,
  ScreenShare,
  Monitor,
  Database,
  ArrowRight,
  MapPin,
  GripVertical,
  Loader2,
  ChevronUp,
  ChevronDown,
  Eye,
  Layers } from 'lucide-react';

/* Extracted tab components */
import { GeneralTab } from './components/general-tab';
import { MailboxTab } from './components/mailbox-tab';
import { RatesTab } from './components/rates-tab';
import { StorageLocationsTab } from './components/storage-locations-tab';
import { DropoffTab } from './components/dropoff-tab';
import { ReceiptsTab } from './components/receipts-tab';
import { PrintersTab } from './components/printers-tab';
import { NotificationsTab } from './components/notifications-tab';
import { UsersTab } from './components/users-tab';
import { SubscriptionTab } from './components/subscription-tab';
import { AppearanceTab } from './components/appearance-tab';
import {
  BillingModelsTab, MigrationTab, CustomerDisplayTab,
  PricingTab, PlatformConfigTab, LegacyMigrationTab } from './components/placeholder-tabs';

function ToggleSwitch({ checked, onChange, label, description }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full text-left"
    >
      <div
        className={`relative flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-surface-700'
        }`}
      >
        <div
          className={`h-4 w-4 rounded-full bg-white transition-transform shadow-sm ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </div>
      {(label || description) && (
        <div>
          {label && <span className="text-sm text-surface-200">{label}</span>}
          {description && <p className="text-xs text-surface-500">{description}</p>}
        </div>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  User type (from API)                                                      */
/* -------------------------------------------------------------------------- */
interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Printer types (BAR-385: replaced mock data with API fetch)                */
/* -------------------------------------------------------------------------- */
interface PrinterEntry {
  id: string;
  name: string;
  model: string;
  status: 'online' | 'offline';
  autoPrint: boolean;
  ipAddress?: string;
  port?: number;
  type?: string;
  paperSize?: string;
  dpi?: number;
}

// BAR-326: Storage location item type
interface StorageLocationItem {
  id: string;
  name: string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Settings Page                                                             */
/* -------------------------------------------------------------------------- */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const { theme, setTheme } = useTheme();
  const { lastActionByVerb } = useActivityLog();
  const lastSettingsUpdate = lastActionByVerb('settings.update');
  const { tenant, localUser, refresh: refreshTenant } = useTenant();

  // ─── Live tenant state (synced from API) ────────────────────────────────
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeCity, setStoreCity] = useState('');
  const [storeState, setStoreState] = useState('');
  const [storeZip, setStoreZip] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('18:00');
  const [savingTenant, setSavingTenant] = useState(false);
  const [tenantSaved, setTenantSaved] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [carrierRates, setCarrierRates] = useState<any[]>([]);

  // Fetch carrier rates from API
  useEffect(() => {
    fetch('/api/carrier-rates')
      .then((r) => r.json())
      .then((d) => setCarrierRates(d.carrierRates || []))
      .catch(() => {});
  }, []);

  // ─── BAR-326: Storage Locations ─────────────────────────────────────────
  const [storageLocations, setStorageLocations] = useState<StorageLocationItem[]>([]);
  const [storageLocLoading, setStorageLocLoading] = useState(true);
  const [showStorageLocModal, setShowStorageLocModal] = useState(false);
  const [editingStorageLoc, setEditingStorageLoc] = useState<StorageLocationItem | null>(null);
  const [storageLocName, setStorageLocName] = useState('');
  const [storageLocDefault, setStorageLocDefault] = useState(false);
  const [storageLocSaving, setStorageLocSaving] = useState(false);

  const fetchStorageLocations = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/storage-locations');
      if (res.ok) {
        const data = await res.json();
        setStorageLocations(data.locations || []);
      }
    } catch {
      /* ignore */
    } finally {
      setStorageLocLoading(false);
    }
  }, []);

  useEffect(() => { fetchStorageLocations(); }, [fetchStorageLocations]);

  const handleOpenNewStorageLoc = () => {
    setEditingStorageLoc(null);
    setStorageLocName('');
    setStorageLocDefault(false);
    setShowStorageLocModal(true);
  };

  const handleOpenEditStorageLoc = (loc: StorageLocationItem) => {
    setEditingStorageLoc(loc);
    setStorageLocName(loc.name);
    setStorageLocDefault(loc.isDefault);
    setShowStorageLocModal(true);
  };

  const handleSaveStorageLoc = async () => {
    if (!storageLocName.trim()) return;
    setStorageLocSaving(true);
    try {
      const method = editingStorageLoc ? 'PATCH' : 'POST';
      const payload = editingStorageLoc
        ? { id: editingStorageLoc.id, name: storageLocName, isDefault: storageLocDefault }
        : { name: storageLocName, isDefault: storageLocDefault };

      const res = await fetch('/api/settings/storage-locations', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) });

      if (res.ok) {
        setShowStorageLocModal(false);
        fetchStorageLocations();
      }
    } catch {
      /* ignore */
    } finally {
      setStorageLocSaving(false);
    }
  };

  const handleDeleteStorageLoc = async (id: string) => {
    if (!confirm('Delete this storage location?')) return;
    try {
      await fetch(`/api/settings/storage-locations?id=${id}`, { method: 'DELETE' });
      fetchStorageLocations();
    } catch {
      /* ignore */
    }
  };

  const handleMoveStorageLoc = async (index: number, direction: 'up' | 'down') => {
    const newList = [...storageLocations];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    [newList[index], newList[swapIdx]] = [newList[swapIdx], newList[index]];
    const order = newList.map((loc, i) => ({ id: loc.id, sortOrder: i }));
    setStorageLocations(newList);
    try {
      await fetch('/api/settings/storage-locations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }) });
    } catch {
      fetchStorageLocations(); // revert on error
    }
  };

  // Hydrate from tenant context
  useEffect(() => {
    if (tenant) {
      setStoreName(tenant.name || '');
      setStoreAddress(tenant.address || '');
      setStoreCity(tenant.city || '');
      setStoreState(tenant.state || '');
      setStoreZip(tenant.zipCode || '');
      setStorePhone(tenant.phone || '');
      setStoreEmail(tenant.email || '');
      setTaxRate(String(tenant.taxRate || 0));
      // Parse business hours JSON
      try {
        const hours = tenant.businessHours ? JSON.parse(tenant.businessHours) : null;
        if (hours?.open) setOpenTime(hours.open);
        if (hours?.close) setCloseTime(hours.close);
      } catch { /* ignore */ }
    }
  }, [tenant]);

  const handleSaveTenant = useCallback(async () => {
    setSavingTenant(true);
    setTenantSaved(false);
    try {
      await fetch('/api/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeName,
          address: storeAddress,
          city: storeCity,
          state: storeState,
          zipCode: storeZip,
          phone: storePhone,
          email: storeEmail,
          taxRate: parseFloat(taxRate) || 0,
          businessHours: JSON.stringify({ open: openTime, close: closeTime }) }) });
      await refreshTenant();
      setTenantSaved(true);
      setTimeout(() => setTenantSaved(false), 3000);
    } catch (e) {
      console.error('Save tenant failed', e);
    } finally {
      setSavingTenant(false);
    }
  }, [storeName, storeAddress, storeCity, storeState, storeZip, storePhone, storeEmail, taxRate, openTime, closeTime, refreshTenant]);

  // ─── Live users state (from API) ────────────────────────────────────────
  const [teamUsers, setTeamUsers] = useState<TenantUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);
  const [showDeletedUsers, setShowDeletedUsers] = useState(false);
  const [restoringUser, setRestoringUser] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const url = showDeletedUsers ? '/api/users?includeDeleted=true' : '/api/users';
      const res = await fetch(url);
      if (res.ok) setTeamUsers(await res.json());
    } catch (e) {
      console.error('Failed to fetch users', e);
    } finally {
      setUsersLoading(false);
    }
  }, [showDeletedUsers]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = useCallback(async (userId: string, newRole: string) => {
    setRoleUpdating(userId);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }) });
      if (res.ok) {
        const updated = await res.json();
        setTeamUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      }
    } catch (e) {
      console.error('Role change failed', e);
    } finally {
      setRoleUpdating(null);
    }
  }, []);


  // ─── User status toggle (activate/deactivate) ────────────────────────────
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const handleStatusToggle = useCallback(async (userId: string, newStatus: string) => {
    setStatusUpdating(userId);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus }) });
      if (res.ok) {
        const updated = await res.json();
        setTeamUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      }
    } catch (e) {
      console.error('Status toggle failed', e);
    } finally {
      setStatusUpdating(null);
    }
  }, []);

  // ─── Soft delete user ─────────────────────────────────────────────────────
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  const handleSoftDelete = useCallback(async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user? They will be deactivated and removed from the team.')) return;
    setDeletingUser(userId);
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }) });
      if (res.ok) {
        // Re-fetch users to get updated list (may need to keep deleted if showing audit view)
        fetchUsers();
      }
    } catch (e) {
      console.error('Soft delete failed', e);
    } finally {
      setDeletingUser(null);
    }
  }, [fetchUsers]);

  // ─── Restore soft-deleted user ────────────────────────────────────────────
  const handleRestoreUser = useCallback(async (userId: string) => {
    setRestoringUser(userId);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'restore' }) });
      if (res.ok) {
        fetchUsers();
      }
    } catch (e) {
      console.error('Restore failed', e);
    } finally {
      setRestoringUser(null);
    }
  }, [fetchUsers]);

  // ─── Invite user state ──────────────────────────────────────────────────
  interface PendingInvitation {
    id: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
  }

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [revokingInvite, setRevokingInvite] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch('/api/users/invite');
      if (res.ok) setPendingInvitations(await res.json());
    } catch (e) {
      console.error('Failed to fetch invitations', e);
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvitations(); }, [fetchInvitations]);

  const handleInviteUser = useCallback(async () => {
    setInviteSending(true);
    setInviteError('');
    setInviteSuccess(false);
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }) });
      if (res.ok) {
        setInviteSuccess(true);
        setInviteEmail('');
        setInviteRole('employee');
        fetchInvitations();
        // Auto-close modal after brief success display
        setTimeout(() => {
          setShowInviteModal(false);
          setInviteSuccess(false);
        }, 1500);
      } else {
        const data = await res.json();
        setInviteError(data.error || 'Failed to send invitation');
      }
    } catch (e) {
      console.error('Invite failed', e);
      setInviteError('Network error — please try again');
    } finally {
      setInviteSending(false);
    }
  }, [inviteEmail, inviteRole, fetchInvitations]);

  const handleRevokeInvite = useCallback(async (invitationId: string) => {
    setRevokingInvite(invitationId);
    try {
      const res = await fetch('/api/users/invite', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }) });
      if (res.ok) fetchInvitations();
    } catch (e) {
      console.error('Revoke failed', e);
    } finally {
      setRevokingInvite(null);
    }
  }, [fetchInvitations]);

  const activePendingInvitations = pendingInvitations.filter(i => i.status === 'pending');

  // Rates tab
  const [carrierTab, setCarrierTab] = useState('ups');

  // Receipt settings
  const [emailReceipts, setEmailReceipts] = useState(true);
  const [receiptDelivery, setReceiptDelivery] = useState('both');
  const [emailSubject, setEmailSubject] = useState('Your receipt from {{storeName}}');
  const [signatureLine, setSignatureLine] = useState(true);
  const [disclaimer, setDisclaimer] = useState('Thank you for choosing ShipStation Express! All sales are final. Shipping rates are subject to change.');

  // Drop-off settings
  const [dropOffSettings, setDropOffSettings] = useState<
    Record<string, { enabled: boolean; compensation: string; retailCharge: string; department: string }>
  >({
    ups: { enabled: true, compensation: '2.50', retailCharge: '4.99', department: 'Shipping' },
    fedex: { enabled: true, compensation: '2.75', retailCharge: '4.99', department: 'Shipping' },
    usps: { enabled: true, compensation: '1.50', retailCharge: '3.49', department: 'Shipping' },
    dhl: { enabled: false, compensation: '3.00', retailCharge: '5.99', department: 'International' },
    amazon: { enabled: true, compensation: '0.75', retailCharge: '2.99', department: 'Returns' } });

  // Notification settings
  const [smtpFrom, setSmtpFrom] = useState('notifications@shipospro.com');
  const [smsDefaultArrival, setSmsDefaultArrival] = useState(true);

  // Receipt preferences
  const [receiptPreference, setReceiptPreference] = useState('sms');
  const [showReceiptOptions, setShowReceiptOptions] = useState(true);

  // Receipt logo upload
  const [receiptLogo, setReceiptLogo] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  /*  Receipt logo upload handler                                       */
  /* ──────────────────────────────────────────────────────────────────── */
  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      alert('Please upload a PNG or JPG image.');
      return;
    }
    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2MB.');
      return;
    }

    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptLogo(reader.result as string);
      setLogoUploading(false);
    };
    reader.onerror = () => {
      alert('Failed to read file. Please try again.');
      setLogoUploading(false);
    };
    reader.readAsDataURL(file);
  }, []);

  // ─── Billing & Payment state ────────────────────────────────────────────
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingZip, setBillingZip] = useState('');
  const [billingSaved, setBillingSaved] = useState(false);
  const [billingSaving, setBillingSaving] = useState(false);

  // ─── Subscription state ─────────────────────────────────────────────────
  const [currentPlan, setCurrentPlan] = useState<'starter' | 'pro' | 'enterprise'>('pro');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [showChangePlanConfirm, setShowChangePlanConfirm] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<'starter' | 'pro' | 'enterprise' | null>(null);

  // Printers — BAR-385: fetch from API instead of mock data
  const [printers, setPrinters] = useState<PrinterEntry[]>([]);
  const [printersLoading, setPrintersLoading] = useState(true);
  const [addingPrinter, setAddingPrinter] = useState(false);
  const [printerTestResult, setPrinterTestResult] = useState<string | null>(null);

  // BAR-385: Fetch saved printers from API on mount
  const fetchPrinters = useCallback(async () => {
    try {
      setPrintersLoading(true);
      const res = await fetch('/api/settings/printer');
      if (res.ok) {
        const data = await res.json();
        const entries: PrinterEntry[] = (data.printers || []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: (p.name as string) || 'Printer',
          model: (p.type as string)?.toUpperCase() || 'Printer',
          status: (p.isActive as boolean) !== false ? 'online' as const : 'offline' as const,
          autoPrint: (p.isDefault as boolean) || false,
          ipAddress: (p.ipAddress as string) || undefined,
          port: (p.port as number) || 9100,
          type: (p.type as string) || 'zpl',
        }));
        setPrinters(entries);
      }
    } catch {
      // Silently fail — printers list will be empty
    } finally {
      setPrintersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrinters();
  }, [fetchPrinters]);

  // ─── BAR-311: Service Agreement Template state ──────────────────────────
  const DEFAULT_TEMPLATE = `MAILBOX SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into between {storeName} ("Provider") and {customerName} ("Customer") on {startDate}.

PMB Number: {pmbNumber}
Billing Cycle: {billingCycle}

TERMS OF SERVICE:
1. Provider agrees to receive and hold mail and packages for Customer at the assigned PMB number.
2. Customer agrees to pick up mail within 30 days of receipt.
3. Customer agrees to notify Provider of any change of address.
4. This agreement may be terminated by either party with 30 days written notice.

CUSTOMER ACKNOWLEDGMENT:
By signing below, Customer acknowledges and agrees to the terms set forth in this Agreement.`;

  const [templateContent, setTemplateContent] = useState(DEFAULT_TEMPLATE);
  const [templateFileName, setTemplateFileName] = useState<string | null>(null);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const templateFileRef = useRef<HTMLInputElement>(null);

  const handleSaveTemplate = useCallback(async () => {
    setTemplateSaving(true);
    try {
      const res = await fetch('/api/settings/agreement-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: templateContent }) });
      if (!res.ok) throw new Error('Failed to save');
      setTemplateSaved(true);
      setTimeout(() => {
        setTemplateSaved(false);
        setShowEditTemplateModal(false);
      }, 1200);
    } catch (err) {
      console.error('Failed to save template', err);
    } finally {
      setTemplateSaving(false);
    }
  }, [templateContent]);

  const handleUploadTemplate = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTemplateFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) setTemplateContent(text);
    };
    reader.readAsText(file);
    // Reset file input so same file can be re-selected
    if (templateFileRef.current) templateFileRef.current.value = '';
  }, []);

  // Load saved template on mount
  useEffect(() => {
    fetch('/api/settings/agreement-template')
      .then((r) => r.json())
      .then((d) => {
        if (d.content) setTemplateContent(d.content);
      })
      .catch(() => {});
  }, []);

  // ─── BAR-312: Rate editing state ────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingRate, setEditingRate] = useState<any | null>(null);
  const [rateSaving, setRateSaving] = useState(false);
  const [rateSaved, setRateSaved] = useState(false);

  const handleSaveRate = useCallback(async () => {
    if (!editingRate) return;
    setRateSaving(true);
    try {
      const res = await fetch('/api/carrier-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRate.id,
          retailRate: parseFloat(editingRate.retailRate),
          marginType: editingRate.marginType,
          marginValue: parseFloat(editingRate.marginValue),
          isActive: editingRate.isActive }) });
      if (!res.ok) throw new Error('Failed to save');
      // Update local state
      setCarrierRates((prev) =>
        prev.map((r) =>
          r.id === editingRate.id
            ? { ...r, retailRate: parseFloat(editingRate.retailRate), marginType: editingRate.marginType, marginValue: parseFloat(editingRate.marginValue), isActive: editingRate.isActive }
            : r
        )
      );
      setRateSaved(true);
      setTimeout(() => {
        setRateSaved(false);
        setEditingRate(null);
      }, 1000);
    } catch (err) {
      console.error('Failed to save rate', err);
    } finally {
      setRateSaving(false);
    }
  }, [editingRate]);

  const handleUpdateAllRates = useCallback(async () => {
    setRateSaving(true);
    try {
      await fetch('/api/carrier-rates/refresh', { method: 'POST' });
      // Reload rates
      const res = await fetch('/api/carrier-rates');
      const d = await res.json();
      setCarrierRates(d.carrierRates || []);
      setRateSaved(true);
      setTimeout(() => setRateSaved(false), 2000);
    } catch (err) {
      console.error('Failed to update rates', err);
    } finally {
      setRateSaving(false);
    }
  }, []);

  // Mailbox platform toggles (BAR-255)
  const [platformEnabled, setPlatformEnabled] = useState<Record<string, boolean>>({
    store: true,
    anytime: true,
    ipostal1: true,
    postscan: true });

  // BAR-387: Mailbox range state (controlled inputs + persistence)
  const [mailboxRanges, setMailboxRanges] = useState<Record<string, { rangeStart: number; rangeEnd: number }>>({
    store: { rangeStart: 1, rangeEnd: 550 },
    anytime: { rangeStart: 700, rangeEnd: 999 },
    ipostal1: { rangeStart: 1000, rangeEnd: 1200 },
    postscan: { rangeStart: 2000, rangeEnd: 2999 },
  });
  const [rangeSaving, setRangeSaving] = useState(false);
  const [rangeSaved, setRangeSaved] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);

  // BAR-387: Fetch saved ranges on mount
  useEffect(() => {
    fetch('/api/settings/mailbox-ranges')
      .then((r) => r.json())
      .then((d) => {
        if (d.ranges) setMailboxRanges(d.ranges);
      })
      .catch(() => {});
  }, []);

  // BAR-387: Save ranges handler
  const handleSaveRanges = useCallback(async () => {
    setRangeSaving(true);
    setRangeError(null);
    setRangeSaved(false);
    try {
      const res = await fetch('/api/settings/mailbox-ranges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ranges: mailboxRanges, enabledPlatforms: platformEnabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRangeError(data.error || 'Failed to save ranges');
      } else {
        setRangeSaved(true);
        setTimeout(() => setRangeSaved(false), 2000);
      }
    } catch {
      setRangeError('Network error — could not save ranges');
    } finally {
      setRangeSaving(false);
    }
  }, [mailboxRanges, platformEnabled]);

  // Carrier program toggles (BAR-266)
  const [carrierProgramEnabled, setCarrierProgramEnabled] = useState<Record<string, boolean>>({
    ups_ap: false,
    fedex_hal: false,
    kinek: false,
    amazon: false });

  /* ──────────────────────────────────────────────────────────────────── */
  /*  Role-Based Settings Access — BAR-286 & BAR-288                    */
  /*                                                                    */
  /*  Settings Architecture (BAR-288):                                  */
  /*    General → Store info, address, hours                            */
  /*    Mailbox Config → PMB numbers, sizes, digital mail platforms     */
  /*    Rates & Pricing → Rate management (view-only for employees)     */
  /*    Drop-off → Carrier settings                                    */
  /*    Receipts → Receipt templates                                   */
  /*    Label Printers → Hardware config (admin+ only)                 */
  /*    Notifications → Email, SMS, alert templates                    */
  /*    Users & Roles → User management (admin+ only)                  */
  /*    Subscription → Plan, billing & payment (owner/admin only)      */
  /*    Appearance → Theme, branding                                   */
  /*    Migration → Data import (admin+ only)                          */
  /*                                                                    */
  /*  Role Hierarchy:                                                   */
  /*    OWNER (superadmin) → Full control including billing             */
  /*    Admin → Full access minus billing/subscription                  */
  /*    Manager → Operational: reports, CRM, pricing (view-only some)  */
  /*    Employee/Clerk → Day-to-day operations only                    */
  /* ──────────────────────────────────────────────────────────────────── */

  type SettingsTabAccess = 'full' | 'view_only' | 'hidden';

  const ROLE_TAB_ACCESS: Record<string, Record<string, SettingsTabAccess>> = {
    superadmin: {
      general: 'full', mailbox: 'full', rates: 'full', 'storage-locations': 'full', dropoff: 'full',
      receipts: 'full', printers: 'full', notifications: 'full', users: 'full',
      'billing-models': 'full', subscription: 'full', appearance: 'full', migration: 'full',
      'customer-display': 'full', pricing: 'full', 'platform-config': 'full', 'legacy-migration': 'full' },
    admin: {
      general: 'full', mailbox: 'full', rates: 'full', 'storage-locations': 'full', dropoff: 'full',
      receipts: 'full', printers: 'full', notifications: 'full', users: 'full',
      'billing-models': 'full', subscription: 'full', appearance: 'full', migration: 'full',
      'customer-display': 'full', pricing: 'full', 'platform-config': 'full', 'legacy-migration': 'full' },
    manager: {
      general: 'view_only', mailbox: 'view_only', rates: 'full', 'storage-locations': 'full', dropoff: 'full',
      receipts: 'full', printers: 'hidden', notifications: 'full', users: 'hidden',
      'billing-models': 'hidden', subscription: 'hidden', appearance: 'view_only', migration: 'hidden',
      'customer-display': 'full', pricing: 'full', 'platform-config': 'hidden', 'legacy-migration': 'hidden' },
    employee: {
      general: 'hidden', mailbox: 'hidden', rates: 'view_only', 'storage-locations': 'view_only', dropoff: 'hidden',
      receipts: 'hidden', printers: 'hidden', notifications: 'hidden', users: 'hidden',
      'billing-models': 'hidden', subscription: 'hidden', appearance: 'hidden', migration: 'hidden',
      'customer-display': 'hidden', pricing: 'hidden', 'platform-config': 'hidden', 'legacy-migration': 'hidden' } };

  const role = (localUser?.role as UserRole) || 'employee';
  const roleAccess = ROLE_TAB_ACCESS[role] || ROLE_TAB_ACCESS.employee;

  const allTabs = [
    { id: 'general', label: 'General', icon: <Building2 className="h-4 w-4" />, section: 'General' },
    { id: 'mailbox', label: 'Mailbox Config', icon: <Mail className="h-4 w-4" />, section: 'General' },
    { id: 'rates', label: 'Rates & Pricing', icon: <DollarSign className="h-4 w-4" />, section: 'Operations' },
    { id: 'storage-locations', label: 'Storage Locations', icon: <MapPin className="h-4 w-4" />, section: 'Operations' },
    { id: 'dropoff', label: 'Drop-off Settings', icon: <Truck className="h-4 w-4" />, section: 'Operations' },
    { id: 'receipts', label: 'Receipts', icon: <Receipt className="h-4 w-4" />, section: 'Operations' },
    { id: 'printers', label: 'Label Printers', icon: <Printer className="h-4 w-4" />, section: 'Hardware' },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" />, section: 'Communications' },
    { id: 'users', label: 'Users & Roles', icon: <Users className="h-4 w-4" />, section: 'Administration' },
    /* BAR-389: "Billing" merged into "Subscription" — removed standalone billing tab */
    { id: 'billing-models', label: 'Billing Models', icon: <Layers className="h-4 w-4" />, section: 'Administration' },
    { id: 'subscription', label: 'Subscription', icon: <Crown className="h-4 w-4" />, section: 'Administration' },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="h-4 w-4" />, section: 'General' },
    { id: 'migration', label: 'Migration', icon: <Upload className="h-4 w-4" />, section: 'Administration' },
    { id: 'customer-display', label: 'Customer Display', icon: <ScreenShare className="h-4 w-4" />, section: 'Operations' },
    { id: 'pricing', label: 'Pricing Dashboard', icon: <DollarSign className="h-4 w-4" />, section: 'Operations' },
    { id: 'platform-config', label: 'Platform Config', icon: <Monitor className="h-4 w-4" />, section: 'Administration' },
    { id: 'legacy-migration', label: 'Legacy Migration', icon: <Database className="h-4 w-4" />, section: 'Tools' },
  ];

  // BAR-286: Filter tabs by role — hidden tabs are removed entirely (not grayed out)
  const tabs = useMemo(
    () => allTabs.filter((tab) => roleAccess[tab.id] !== 'hidden'),
    [role] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Check if current tab is view-only for the role
  const isViewOnly = roleAccess[activeTab] === 'view_only';

  const carrierTabs = [
    { id: 'ups', label: 'UPS' },
    { id: 'fedex', label: 'FedEx' },
    { id: 'usps', label: 'USPS' },
    { id: 'dhl', label: 'DHL' },
  ];

  const filteredRates = carrierRates.filter((r) => r.carrier === carrierTab);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings"
        badge={lastSettingsUpdate ? <LastUpdatedBy entry={lastSettingsUpdate} className="mt-2" /> : undefined}
        description="Configure your store."
        actions={isViewOnly ? <Badge variant="warning" dot>View Only</Badge> : undefined}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-56 flex-shrink-0">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="vertical" />
        </div>

        <div className="flex-1 min-w-0">
          <TabPanel active={activeTab === 'general'}>
            <GeneralTab
              storeName={storeName} setStoreName={setStoreName}
              storeAddress={storeAddress} setStoreAddress={setStoreAddress}
              storeCity={storeCity} setStoreCity={setStoreCity}
              storeState={storeState} setStoreState={setStoreState}
              storeZip={storeZip} setStoreZip={setStoreZip}
              storePhone={storePhone} setStorePhone={setStorePhone}
              storeEmail={storeEmail} setStoreEmail={setStoreEmail}
              taxRate={taxRate} setTaxRate={setTaxRate}
              openTime={openTime} setOpenTime={setOpenTime}
              closeTime={closeTime} setCloseTime={setCloseTime}
              savingTenant={savingTenant} tenantSaved={tenantSaved}
              handleSaveTenant={handleSaveTenant}
            />
          </TabPanel>

          <TabPanel active={activeTab === 'mailbox'}>
            <MailboxTab
              platformEnabled={platformEnabled} setPlatformEnabled={setPlatformEnabled}
              carrierProgramEnabled={carrierProgramEnabled} setCarrierProgramEnabled={setCarrierProgramEnabled}
              templateContent={templateContent} setTemplateContent={setTemplateContent}
              templateFileName={templateFileName} templateFileRef={templateFileRef}
              showEditTemplateModal={showEditTemplateModal} setShowEditTemplateModal={setShowEditTemplateModal}
              templateSaving={templateSaving} templateSaved={templateSaved}
              handleSaveTemplate={handleSaveTemplate} handleUploadTemplate={handleUploadTemplate}
              mailboxRanges={mailboxRanges} setMailboxRanges={setMailboxRanges}
              handleSaveRanges={handleSaveRanges} rangeSaving={rangeSaving}
              rangeSaved={rangeSaved} rangeError={rangeError}
            />
          </TabPanel>

          <TabPanel active={activeTab === 'rates'}>
            <RatesTab
              carrierTab={carrierTab} setCarrierTab={setCarrierTab} carrierTabs={carrierTabs}
              filteredRates={filteredRates}
              editingRate={editingRate} setEditingRate={setEditingRate}
              rateSaving={rateSaving} rateSaved={rateSaved}
              handleSaveRate={handleSaveRate} handleUpdateAllRates={handleUpdateAllRates}
            />
          </TabPanel>

          <TabPanel active={activeTab === 'storage-locations'}>
            <StorageLocationsTab
              isViewOnly={isViewOnly} storageLocations={storageLocations}
              storageLocLoading={storageLocLoading}
              showStorageLocModal={showStorageLocModal} setShowStorageLocModal={setShowStorageLocModal}
              editingStorageLoc={editingStorageLoc}
              storageLocName={storageLocName} setStorageLocName={setStorageLocName}
              storageLocDefault={storageLocDefault} setStorageLocDefault={setStorageLocDefault}
              storageLocSaving={storageLocSaving}
              handleOpenNewStorageLoc={handleOpenNewStorageLoc}
              handleOpenEditStorageLoc={handleOpenEditStorageLoc}
              handleSaveStorageLoc={handleSaveStorageLoc}
              handleDeleteStorageLoc={handleDeleteStorageLoc}
              handleMoveStorageLoc={handleMoveStorageLoc}
            />
          </TabPanel>

          <TabPanel active={activeTab === 'dropoff'}>
            <DropoffTab dropOffSettings={dropOffSettings} setDropOffSettings={setDropOffSettings} />
          </TabPanel>

          <TabPanel active={activeTab === 'receipts'}>
            <ReceiptsTab
              emailReceipts={emailReceipts} setEmailReceipts={setEmailReceipts}
              receiptDelivery={receiptDelivery} setReceiptDelivery={setReceiptDelivery}
              emailSubject={emailSubject} setEmailSubject={setEmailSubject}
              signatureLine={signatureLine} setSignatureLine={setSignatureLine}
              disclaimer={disclaimer} setDisclaimer={setDisclaimer}
              receiptPreference={receiptPreference} setReceiptPreference={setReceiptPreference}
              showReceiptOptions={showReceiptOptions} setShowReceiptOptions={setShowReceiptOptions}
              receiptLogo={receiptLogo} setReceiptLogo={setReceiptLogo}
              logoUploading={logoUploading} logoInputRef={logoInputRef}
              handleLogoUpload={handleLogoUpload} storeName={storeName}
            />
          </TabPanel>

          <TabPanel active={activeTab === 'printers'}>
            <PrintersTab
              printers={printers} setPrinters={setPrinters}
              addingPrinter={addingPrinter} setAddingPrinter={setAddingPrinter}
              printerTestResult={printerTestResult} setPrinterTestResult={setPrinterTestResult}
              printersLoading={printersLoading} onRefresh={fetchPrinters}
            />
          </TabPanel>

          <TabPanel active={activeTab === 'notifications'}>
            <NotificationsTab
              emailReceipts={emailReceipts} setEmailReceipts={setEmailReceipts}
              smtpFrom={smtpFrom} setSmtpFrom={setSmtpFrom}
              smsDefaultArrival={smsDefaultArrival} setSmsDefaultArrival={setSmsDefaultArrival}
              role={localUser?.role}
            />
          </TabPanel>

          <TabPanel active={activeTab === 'users'}>
            <UsersTab
              localUser={localUser}
              teamUsers={teamUsers} usersLoading={usersLoading} roleUpdating={roleUpdating}
              showDeletedUsers={showDeletedUsers} setShowDeletedUsers={setShowDeletedUsers}
              statusUpdating={statusUpdating} deletingUser={deletingUser} restoringUser={restoringUser}
              showInviteModal={showInviteModal} setShowInviteModal={setShowInviteModal}
              inviteEmail={inviteEmail} setInviteEmail={setInviteEmail}
              inviteRole={inviteRole} setInviteRole={setInviteRole}
              inviteSending={inviteSending}
              inviteError={inviteError} setInviteError={setInviteError}
              inviteSuccess={inviteSuccess} setInviteSuccess={setInviteSuccess}
              activePendingInvitations={activePendingInvitations}
              invitationsLoading={invitationsLoading} revokingInvite={revokingInvite}
              handleRoleChange={handleRoleChange} handleStatusToggle={handleStatusToggle}
              handleSoftDelete={handleSoftDelete} handleRestoreUser={handleRestoreUser}
              handleInviteUser={handleInviteUser} handleRevokeInvite={handleRevokeInvite}
            />
          </TabPanel>

          {/* BAR-389: Billing merged into Subscription tab */}
          <TabPanel active={activeTab === 'billing-models'}>
            <BillingModelsTab />
          </TabPanel>

          <TabPanel active={activeTab === 'subscription'}>
            <SubscriptionTab
              currentPlan={currentPlan} setCurrentPlan={setCurrentPlan}
              billingCycle={billingCycle} setBillingCycle={setBillingCycle}
              showChangePlanConfirm={showChangePlanConfirm} setShowChangePlanConfirm={setShowChangePlanConfirm}
              pendingPlan={pendingPlan} setPendingPlan={setPendingPlan}
              cardholderName={cardholderName} setCardholderName={setCardholderName}
              cardNumber={cardNumber} setCardNumber={setCardNumber}
              cardExpiry={cardExpiry} setCardExpiry={setCardExpiry}
              cardCvc={cardCvc} setCardCvc={setCardCvc}
              billingAddress={billingAddress} setBillingAddress={setBillingAddress}
              billingCity={billingCity} setBillingCity={setBillingCity}
              billingState={billingState} setBillingState={setBillingState}
              billingZip={billingZip} setBillingZip={setBillingZip}
              billingSaved={billingSaved} setBillingSaved={setBillingSaved}
              billingSaving={billingSaving} setBillingSaving={setBillingSaving}
            />
          </TabPanel>

          <TabPanel active={activeTab === 'appearance'}>
            <AppearanceTab theme={theme} setTheme={setTheme as (v: string) => void} />
          </TabPanel>

          <TabPanel active={activeTab === 'migration'}><MigrationTab /></TabPanel>
          <TabPanel active={activeTab === 'customer-display'}><CustomerDisplayTab /></TabPanel>
          <TabPanel active={activeTab === 'pricing'}><PricingTab /></TabPanel>
          <TabPanel active={activeTab === 'platform-config'}><PlatformConfigTab /></TabPanel>
          <TabPanel active={activeTab === 'legacy-migration'}><LegacyMigrationTab /></TabPanel>
        </div>
      </div>
    </div>
  );
}
