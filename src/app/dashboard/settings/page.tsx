'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/components/theme-provider';
import { useTenant } from '@/components/tenant-provider';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { carrierRates } from '@/lib/mock-data';
import { useActivityLog } from '@/components/activity-log-provider';
import { LastUpdatedBy } from '@/components/ui/performed-by';
import { formatCurrency } from '@/lib/utils';
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
  Moon } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  description?: string;
}

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
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Mock printers                                                             */
/* -------------------------------------------------------------------------- */
const mockPrinters = [
  { id: 'ptr_001', name: 'Front Counter Label Printer', model: 'Zebra ZD420', status: 'online', autoPrint: true },
  { id: 'ptr_002', name: 'Back Office Printer', model: 'Zebra GK420d', status: 'online', autoPrint: false },
  { id: 'ptr_003', name: 'Receipt Printer', model: 'Zebra ZD220', status: 'offline', autoPrint: false },
];

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
          businessHours: JSON.stringify({ open: openTime, close: closeTime }),
        }),
      });
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

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) setTeamUsers(await res.json());
    } catch (e) {
      console.error('Failed to fetch users', e);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = useCallback(async (userId: string, newRole: string) => {
    setRoleUpdating(userId);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
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
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
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
        body: JSON.stringify({ invitationId }),
      });
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

  // Printers
  const [printers, setPrinters] = useState(mockPrinters);

  const tabs = [
    { id: 'general', label: 'General', icon: <Building2 className="h-4 w-4" /> },
    { id: 'mailbox', label: 'Mailbox Config', icon: <Mail className="h-4 w-4" /> },
    { id: 'rates', label: 'Rates & Pricing', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'dropoff', label: 'Drop-off Settings', icon: <Truck className="h-4 w-4" /> },
    { id: 'receipts', label: 'Receipts', icon: <Receipt className="h-4 w-4" /> },
    { id: 'printers', label: 'Label Printers', icon: <Printer className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'users', label: 'Users & Roles', icon: <Users className="h-4 w-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="h-4 w-4" /> },
    { id: 'migration', label: 'Migration', icon: <Upload className="h-4 w-4" /> },
  ];

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
        badge={lastSettingsUpdate ? <LastUpdatedBy entry={lastSettingsUpdate} className="mt-2" /> : undefined} description="Configure your store, pricing, and preferences" />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left sidebar navigation */}
        <div className="lg:w-56 flex-shrink-0">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="vertical" />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* ================================================================ */}
          {/*  GENERAL                                                         */}
          {/* ================================================================ */}
          <TabPanel active={activeTab === 'general'}>
            <Card>
              <CardHeader>
                <CardTitle>Store Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  <Input label="Store Name" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="My Postal Store" />
                  <Input label="Street Address" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} placeholder="123 Main Street, Suite 100" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="City" value={storeCity} onChange={(e) => setStoreCity(e.target.value)} placeholder="New York" />
                    <Input label="State" value={storeState} onChange={(e) => setStoreState(e.target.value)} placeholder="NY" />
                    <Input label="ZIP Code" value={storeZip} onChange={(e) => setStoreZip(e.target.value)} placeholder="10001" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Phone" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} placeholder="(555) 123-4567" />
                    <Input label="Email" value={storeEmail} onChange={(e) => setStoreEmail(e.target.value)} type="email" placeholder="info@mystore.com" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Business Hours & Tax</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Open Time" type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
                    <Input label="Close Time" type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
                    <Input
                      label="Sales Tax Rate (%)"
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      helperText="Applied to taxable goods and services"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-3 mt-6">
              {tenantSaved && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-500">
                  <Check className="h-4 w-4" /> Saved
                </span>
              )}
              <Button
                leftIcon={<Save className="h-4 w-4" />}
                onClick={handleSaveTenant}
                disabled={savingTenant}
              >
                {savingTenant ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </TabPanel>


          {/* ================================================================ */}
          {/*  MAILBOX CONFIGURATION                                           */}
          {/* ================================================================ */}
          <TabPanel active={activeTab === 'mailbox'}>
            <Card>
              <CardHeader>
                <CardTitle>Mailbox Ranges</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-surface-400 mb-6">
                  Define your PMB number ranges for each mailbox platform. These ranges determine which box numbers
                  are available when setting up new customers.
                </p>

                <div className="space-y-4">
                  {/* Physical / Store boxes */}
                  <div className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-surface-600/30 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-surface-300" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-surface-200">Store (Physical) Mailboxes</p>
                          <p className="text-xs text-surface-500">Traditional in-store mailboxes</p>
                        </div>
                      </div>
                      <Badge dot={false} className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-surface-500 mb-1 block">Range Start</label>
                        <input type="number" defaultValue={1} className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" />
                      </div>
                      <div>
                        <label className="text-xs text-surface-500 mb-1 block">Range End</label>
                        <input type="number" defaultValue={550} className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" />
                      </div>
                    </div>
                  </div>

                  {/* Anytime Mailbox */}
                  <div className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-surface-200">Anytime Mailbox</p>
                          <p className="text-xs text-surface-500">Digital mailbox platform</p>
                        </div>
                      </div>
                      <Badge dot={false} className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-surface-500 mb-1 block">Range Start</label>
                        <input type="number" defaultValue={700} className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" />
                      </div>
                      <div>
                        <label className="text-xs text-surface-500 mb-1 block">Range End</label>
                        <input type="number" defaultValue={999} className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" />
                      </div>
                    </div>
                  </div>

                  {/* iPostal1 */}
                  <div className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-surface-200">iPostal1</p>
                          <p className="text-xs text-surface-500">Digital mailbox platform</p>
                        </div>
                      </div>
                      <Badge dot={false} className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-surface-500 mb-1 block">Range Start</label>
                        <input type="number" defaultValue={1000} className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" />
                      </div>
                      <div>
                        <label className="text-xs text-surface-500 mb-1 block">Range End</label>
                        <input type="number" defaultValue={1200} className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" />
                      </div>
                    </div>
                  </div>

                  {/* PostScan Mail */}
                  <div className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-surface-200">PostScan Mail</p>
                          <p className="text-xs text-surface-500">Digital mailbox platform</p>
                        </div>
                      </div>
                      <Badge dot={false} className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-surface-500 mb-1 block">Range Start</label>
                        <input type="number" defaultValue={2000} className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" />
                      </div>
                      <div>
                        <label className="text-xs text-surface-500 mb-1 block">Range End</label>
                        <input type="number" defaultValue={2999} className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <Button variant="ghost" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>Add Custom Range</Button>
                  <Button variant="default" size="sm" leftIcon={<Save className="h-3.5 w-3.5" />}>Save Ranges</Button>
                </div>
              </CardContent>
            </Card>

            {/* Hold Period */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Box Hold Policy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-surface-300 mb-1.5 block">Hold Period After Closure</label>
                    <div className="flex items-center gap-3">
                      <input type="number" defaultValue={90} className="w-24 bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" />
                      <span className="text-sm text-surface-400">days</span>
                    </div>
                    <p className="text-xs text-surface-500 mt-1">
                      Recently closed boxes will be unavailable for this period to prevent address conflicts.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agreement Template */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Service Agreement Template</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-surface-400 mb-4">
                  Customize the mailbox service agreement template used during customer setup.
                  Use placeholders like <code className="text-primary-400 text-xs">{'{'}customerName{'}'}</code>, <code className="text-primary-400 text-xs">{'{'}pmbNumber{'}'}</code>, <code className="text-primary-400 text-xs">{'{'}storeName{'}'}</code> for auto-population.
                </p>
                <div className="rounded-lg border border-surface-700 bg-surface-950 p-4 max-h-48 overflow-y-auto">
                  <p className="text-xs text-surface-300 font-mono">Contract for Mailbox Service — using default template</p>
                  <p className="text-xs text-surface-500 mt-1">Based on your uploaded agreement document with all USPS CMRA-compliant terms.</p>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Button variant="ghost" size="sm" leftIcon={<Edit3 className="h-3.5 w-3.5" />}>Edit Template</Button>
                  <Button variant="ghost" size="sm" leftIcon={<Upload className="h-3.5 w-3.5" />}>Upload New Template</Button>
                </div>
              </CardContent>
            </Card>
          </TabPanel>

          {/* ================================================================ */}
          {/*  RATES & PRICING                                                 */}
          {/* ================================================================ */}
          <TabPanel active={activeTab === 'rates'}>
            <Card>
              <CardHeader>
                <CardTitle>Carrier Rate Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Carrier tabs */}
                <Tabs tabs={carrierTabs} activeTab={carrierTab} onChange={setCarrierTab} />

                <div className="mt-4 overflow-x-auto rounded-lg border border-surface-700/50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-800 bg-surface-900/80">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Service</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Add-on</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">Wholesale</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">Retail</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-surface-400">Margin Type</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">Margin</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-surface-400">Active</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-surface-400">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRates.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-surface-500 text-sm">
                            No rates configured for this carrier
                          </td>
                        </tr>
                      ) : (
                        filteredRates.map((rate) => (
                          <tr key={rate.id} className="border-b border-surface-700/60 table-row-hover">
                            <td className="px-4 py-3 text-surface-200 font-medium">{rate.service}</td>
                            <td className="px-4 py-3 text-surface-400">{rate.addOnName || '—'}</td>
                            <td className="px-4 py-3 text-right text-surface-400">{formatCurrency(rate.wholesaleRate)}</td>
                            <td className="px-4 py-3 text-right text-surface-200 font-medium">{formatCurrency(rate.retailRate)}</td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="muted" dot={false}>
                                {rate.marginType}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right text-emerald-600 font-medium">{rate.marginValue}%</td>
                            <td className="px-4 py-3 text-center">
                              {rate.isActive ? (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                                  <Check className="h-3 w-3 text-emerald-600" />
                                </span>
                              ) : (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-700">
                                  <X className="h-3 w-3 text-surface-500" />
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button variant="ghost" size="sm" iconOnly>
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mt-4">
                  <Button leftIcon={<Save className="h-4 w-4" />}>Update Rates</Button>
                </div>
              </CardContent>
            </Card>
          </TabPanel>

          {/* ================================================================ */}
          {/*  DROP-OFF SETTINGS                                               */}
          {/* ================================================================ */}
          <TabPanel active={activeTab === 'dropoff'}>
            <div className="space-y-4">
              {Object.entries(dropOffSettings).map(([carrierId, settings]) => {
                const carrierName = carrierId === 'ups' ? 'UPS' : carrierId === 'fedex' ? 'FedEx' : carrierId === 'usps' ? 'USPS' : carrierId === 'dhl' ? 'DHL' : 'Amazon';
                return (
                  <Card key={carrierId}>
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex items-center gap-3 md:w-48 flex-shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-800">
                          <Truck className="h-5 w-5 text-surface-300" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-surface-200">{carrierName}</h3>
                          <p className="text-xs text-surface-500">Drop-off</p>
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <ToggleSwitch
                            checked={settings.enabled}
                            onChange={(val) =>
                              setDropOffSettings((prev) => ({
                                ...prev,
                                [carrierId]: { ...prev[carrierId], enabled: val } }))
                            }
                            label={settings.enabled ? 'Enabled' : 'Disabled'}
                          />
                        </div>
                        <Input
                          label="Compensation"
                          type="number"
                          value={settings.compensation}
                          onChange={(e) =>
                            setDropOffSettings((prev) => ({
                              ...prev,
                              [carrierId]: { ...prev[carrierId], compensation: e.target.value } }))
                          }
                          leftIcon={<DollarSign className="h-3.5 w-3.5" />}
                        />
                        <Input
                          label="Retail Charge"
                          type="number"
                          value={settings.retailCharge}
                          onChange={(e) =>
                            setDropOffSettings((prev) => ({
                              ...prev,
                              [carrierId]: { ...prev[carrierId], retailCharge: e.target.value } }))
                          }
                          leftIcon={<DollarSign className="h-3.5 w-3.5" />}
                        />
                        <Input
                          label="Department"
                          value={settings.department}
                          onChange={(e) =>
                            setDropOffSettings((prev) => ({
                              ...prev,
                              [carrierId]: { ...prev[carrierId], department: e.target.value } }))
                          }
                        />
                      </div>
                    </div>

                    {/* Credentials */}
                    <div className="mt-4 pt-4 border-t border-surface-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-3.5 w-3.5 text-surface-500" />
                        <span className="text-xs text-surface-500 uppercase tracking-wider">API Credentials</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="API Key" value="••••••••••••••••" type="password" readOnly />
                        <Input label="Account Number" value="••••••••" type="password" readOnly />
                      </div>
                    </div>
                  </Card>
                );
              })}

              <div className="flex justify-end">
                <Button leftIcon={<Save className="h-4 w-4" />}>Save Drop-off Settings</Button>
              </div>
            </div>
          </TabPanel>

          {/* ================================================================ */}
          {/*  RECEIPTS                                                        */}
          {/* ================================================================ */}
          <TabPanel active={activeTab === 'receipts'}>
            {/* Digital Receipt preference */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary-600" />
                  Receipt Delivery Preference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-3.5 mb-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 flex-shrink-0 mt-0.5">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-200">📱 75% of customers prefer digital receipts</p>
                      <p className="text-xs text-surface-400 mt-1">
                        Digital receipts are faster, greener, and easier for customers to reference later. SMS receipts have the highest open rates.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-surface-300 mb-2.5 block">Default Receipt Method</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { value: 'sms', label: 'SMS', desc: 'Text message', recommended: true },
                        { value: 'email', label: 'Email', desc: 'Email receipt', recommended: false },
                        { value: 'print', label: 'Print', desc: 'Paper receipt', recommended: false },
                        { value: 'sms_print', label: 'SMS + Print', desc: 'Both options', recommended: false },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setReceiptPreference(option.value)}
                          className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-3.5 text-center transition-all ${
                            receiptPreference === option.value
                              ? 'border-primary-300 bg-primary-500/10 ring-1 ring-primary-500/20'
                              : 'border-surface-700/50 bg-surface-800/30 hover:border-surface-600/50'
                          }`}
                        >
                          {option.recommended && (
                            <span className="absolute -top-2 right-2 inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-[9px] font-bold text-primary-600 border border-primary-500/20">
                              ★ BEST
                            </span>
                          )}
                          <span className={`text-sm font-medium ${receiptPreference === option.value ? 'text-surface-100' : 'text-surface-300'}`}>
                            {option.label}
                          </span>
                          <span className="text-[11px] text-surface-500">{option.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <ToggleSwitch
                    checked={showReceiptOptions}
                    onChange={setShowReceiptOptions}
                    label="Show receipt options to customer at checkout"
                    description="Let customers choose their preferred receipt method during check-out"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Receipt Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <ToggleSwitch
                    checked={emailReceipts}
                    onChange={setEmailReceipts}
                    label="Enable Email Receipts"
                    description="Automatically send receipts via email after transactions"
                  />

                  <Select
                    label="Receipt Delivery Method"
                    options={[
                      { value: 'print', label: 'Print Only' },
                      { value: 'email', label: 'Email Only' },
                      { value: 'both', label: 'Print & Email' },
                      { value: 'sms', label: 'SMS Only' },
                      { value: 'sms_print', label: 'SMS & Print' },
                      { value: 'none', label: 'None' },
                    ]}
                    value={receiptDelivery}
                    onChange={(e) => setReceiptDelivery(e.target.value)}
                  />

                  <Input
                    label="Email Subject Template"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    helperText="Use {{storeName}}, {{date}}, {{total}} as variables"
                  />

                  <div>
                    <label className="text-sm font-medium text-surface-300 mb-2 block">
                      Logo Upload
                    </label>
                    <div className="flex items-center justify-center h-32 border-2 border-dashed border-surface-700 rounded-lg hover:border-surface-600 transition-colors cursor-pointer">
                      <div className="text-center">
                        <Upload className="h-6 w-6 text-surface-500 mx-auto mb-2" />
                        <p className="text-sm text-surface-400">Click to upload logo</p>
                        <p className="text-xs text-surface-600">PNG, JPG up to 2MB</p>
                      </div>
                    </div>
                  </div>

                  <ToggleSwitch
                    checked={signatureLine}
                    onChange={setSignatureLine}
                    label="Include Signature Line"
                    description="Add a signature line at the bottom of printed receipts"
                  />

                  <Textarea
                    label="Disclaimer / Footer Text"
                    value={disclaimer}
                    onChange={(e) => setDisclaimer(e.target.value)}
                    helperText="This text appears at the bottom of every receipt"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end mt-6">
              <Button leftIcon={<Save className="h-4 w-4" />}>Save Receipt Settings</Button>
            </div>
          </TabPanel>

          {/* ================================================================ */}
          {/*  LABEL PRINTERS                                                  */}
          {/* ================================================================ */}
          <TabPanel active={activeTab === 'printers'}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-surface-200">Connected Printers</h2>
              <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                Add Printer
              </Button>
            </div>

            <div className="space-y-3">
              {printers.map((printer) => (
                <Card key={printer.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                          printer.status === 'online' ? 'bg-emerald-50' : 'bg-surface-800'
                        }`}
                      >
                        <Printer
                          className={`h-6 w-6 ${
                            printer.status === 'online' ? 'text-emerald-600' : 'text-surface-500'
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-surface-200">{printer.name}</h3>
                        <p className="text-xs text-surface-500">{printer.model}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {printer.status === 'online' ? (
                          <Wifi className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-600" />
                        )}
                        <Badge variant={printer.status === 'online' ? 'success' : 'danger'} dot>
                          {printer.status === 'online' ? 'Connected' : 'Offline'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1">
                        <ToggleSwitch
                          checked={printer.autoPrint}
                          onChange={(val) => {
                            setPrinters((prev) =>
                              prev.map((p) =>
                                p.id === printer.id ? { ...p, autoPrint: val } : p
                              )
                            );
                          }}
                          label="Auto-print"
                        />
                      </div>

                      <Button variant="outline" size="sm" leftIcon={<TestTube className="h-3.5 w-3.5" />}>
                        Test Print
                      </Button>
                      <Button variant="ghost" size="sm" iconOnly>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabPanel>

          {/* ================================================================ */}
          {/*  NOTIFICATIONS                                                   */}
          {/* ================================================================ */}
          <TabPanel active={activeTab === 'notifications'}>
            <div className="space-y-6">
              {/* SMS-First callout */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary-600" />
                    SMS Notifications
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-600 border border-primary-500/20">
                      <Sparkles className="h-3 w-3" />
                      Recommended
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-primary-500/15 bg-primary-500/5 p-3.5 mb-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 flex-shrink-0 mt-0.5">
                        <TrendingUp className="h-4 w-4 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-surface-200">📊 SMS has 98% open rate vs 20% for email</p>
                        <p className="text-xs text-surface-400 mt-1">
                          Customers respond 5× faster to SMS. Enable SMS as the default channel for time-sensitive notifications like package arrivals.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <ToggleSwitch
                      checked={smsDefaultArrival}
                      onChange={setSmsDefaultArrival}
                      label="Send SMS by default for package arrivals"
                      description="New check-ins will automatically trigger an SMS notification"
                    />

                    <p className="text-xs text-surface-500 mt-2">
                      SMS notifications are sent via <a href="https://twilio.com" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">Twilio</a>. Configure credentials in your environment variables.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <Input label="Account SID" value="••••••••••••••••" type="password" readOnly placeholder="TWILIO_ACCOUNT_SID" />
                      <Input label="Auth Token" value="••••••••••••••••" type="password" readOnly placeholder="TWILIO_AUTH_TOKEN" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <Input label="Phone Number" value={process.env.NEXT_PUBLIC_TWILIO_PHONE || '+1 (XXX) XXX-XXXX'} readOnly placeholder="TWILIO_PHONE_NUMBER" />
                      <Input label="Messaging Service SID (optional)" value="••••••••••••••••" type="password" readOnly placeholder="TWILIO_MESSAGING_SERVICE_SID" />
                    </div>
                    <p className="text-[11px] text-surface-600 mt-2">
                      Set via environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary-600" />
                    Email — Resend
                    {process.env.NEXT_PUBLIC_RESEND_CONFIGURED === 'true' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-500/20">
                        <Wifi className="h-3 w-3" /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 border border-amber-500/20">
                        <WifiOff className="h-3 w-3" /> Not Configured
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-surface-500 mb-4">
                    Email notifications are sent via <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">Resend</a> with React Email templates. Configure your API key and sending domain in your environment variables.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="API Key" value="••••••••••••••••" type="password" readOnly placeholder="RESEND_API_KEY" />
                    <Input
                      label="From Address"
                      value={smtpFrom}
                      onChange={(e) => setSmtpFrom(e.target.value)}
                      placeholder="notifications@shipospro.com"
                    />
                  </div>
                  <p className="text-[11px] text-surface-600 mt-2">
                    Set via environment variables: RESEND_API_KEY, RESEND_FROM_EMAIL
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { name: 'Package Arrival', channel: 'Email + SMS', status: 'active' },
                      { name: 'Package Reminder', channel: 'Email', status: 'active' },
                      { name: 'Mail Received', channel: 'Email', status: 'active' },
                      { name: 'ID Expiration Warning', channel: 'Email + SMS', status: 'active' },
                      { name: 'Renewal Reminder', channel: 'Email', status: 'active' },
                      { name: 'Shipment Update', channel: 'Email + SMS', status: 'inactive' },
                      { name: 'Welcome', channel: 'Email', status: 'active' },
                    ].map((template) => (
                      <div
                        key={template.name}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-800/50 transition-colors border border-surface-700/30"
                      >
                        <div className="flex items-center gap-3">
                          <Bell className="h-4 w-4 text-surface-500" />
                          <div>
                            <span className="text-sm text-surface-200">{template.name}</span>
                            <p className="text-xs text-surface-500">{template.channel}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={template.status === 'active' ? 'success' : 'muted'}
                            dot
                          >
                            {template.status}
                          </Badge>
                          <Button variant="ghost" size="sm" iconOnly>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button leftIcon={<Save className="h-4 w-4" />}>Save Notification Settings</Button>
              </div>
            </div>
          </TabPanel>

          {/* ================================================================ */}
          {/*  USERS & ROLES                                                   */}
          {/* ================================================================ */}
          <TabPanel active={activeTab === 'users'}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-surface-200">Team Members</h2>
              <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => { setShowInviteModal(true); setInviteError(''); setInviteSuccess(false); }}>
                Invite User
              </Button>
            </div>

            {usersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <div className="flex items-center gap-4 animate-pulse">
                      <div className="h-10 w-10 rounded-full bg-surface-800" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-surface-800 rounded" />
                        <div className="h-3 w-48 bg-surface-800 rounded" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : teamUsers.length === 0 ? (
              <Card>
                <div className="py-12 text-center">
                  <Users className="h-10 w-10 text-surface-600 mx-auto mb-3" />
                  <p className="text-surface-400 text-sm">No team members yet.</p>
                  <p className="text-surface-500 text-xs mt-1">Users are automatically added when they sign in via Auth0.</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-3">
                {teamUsers.map((member) => {
                  const roleColor =
                    member.role === 'admin'
                      ? 'default'
                      : member.role === 'manager'
                      ? 'warning'
                      : 'muted';
                  const initials = member.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  const isMe = member.id === localUser?.id;

                  return (
                    <Card key={member.id} hover>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {member.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={member.avatar} alt={member.name} className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-accent-indigo text-xs font-bold text-white">
                              {initials}
                            </div>
                          )}
                          <div>
                            <h3 className="text-sm font-medium text-surface-200">
                              {member.name}
                              {isMe && (
                                <span className="ml-1.5 text-[10px] text-surface-500 font-normal">(you)</span>
                              )}
                            </h3>
                            <p className="text-xs text-surface-500">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {(localUser?.role === 'admin' || localUser?.role === 'superadmin') ? (
                            <select
                              value={member.role}
                              disabled={roleUpdating === member.id}
                              onChange={(e) => handleRoleChange(member.id, e.target.value)}
                              className="text-xs font-medium rounded-lg border border-surface-700 bg-surface-900 text-surface-200 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
                            >
                              <option value="admin">Admin</option>
                              <option value="manager">Manager</option>
                              <option value="employee">Employee</option>
                            </select>
                          ) : (
                            <Badge variant={roleColor as 'default' | 'warning' | 'muted'} dot>
                              {member.role}
                            </Badge>
                          )}
                          <span className="text-xs text-surface-500">
                            Joined {new Date(member.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* ── Invite User Modal ──────────────────────────── */}
            {showInviteModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600/20">
                        <Mail className="h-4.5 w-4.5 text-primary-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-surface-100">Invite Team Member</h3>
                        <p className="text-xs text-surface-500">They&apos;ll join your team when they sign in</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowInviteModal(false)}
                      className="rounded-lg p-1.5 text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="px-6 py-5 space-y-4">
                    {inviteSuccess ? (
                      <div className="flex flex-col items-center py-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600/20 mb-3">
                          <Check className="h-6 w-6 text-emerald-400" />
                        </div>
                        <p className="text-sm font-medium text-surface-200">Invitation created!</p>
                        <p className="text-xs text-surface-500 mt-1">They&apos;ll be added to your team on sign-in.</p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-surface-400 mb-1.5">Email Address</label>
                          <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="colleague@example.com"
                            className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3.5 py-2.5 text-sm text-surface-200 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-colors"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && inviteEmail.trim()) handleInviteUser();
                            }}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-surface-400 mb-1.5">Role</label>
                          <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                            className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3.5 py-2.5 text-sm text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-colors"
                          >
                            <option value="admin">Admin — Full access to all features</option>
                            <option value="manager">Manager — Operations & team oversight</option>
                            <option value="employee">Employee — Day-to-day operations</option>
                          </select>
                        </div>

                        {inviteError && (
                          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                            <X className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                            <p className="text-xs text-red-400">{inviteError}</p>
                          </div>
                        )}

                        <div className="flex items-start gap-2 rounded-lg bg-surface-800/50 border border-surface-700/50 px-3 py-2.5">
                          <Shield className="h-3.5 w-3.5 text-surface-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-surface-500">
                            The invited user will be automatically added to your team with the selected role when they sign in via Auth0 using this email.
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Modal Footer */}
                  {!inviteSuccess && (
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-700 bg-surface-800/30">
                      <Button variant="ghost" size="sm" onClick={() => setShowInviteModal(false)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        leftIcon={inviteSending ? undefined : <Mail className="h-3.5 w-3.5" />}
                        onClick={handleInviteUser}
                        disabled={!inviteEmail.trim() || inviteSending}
                      >
                        {inviteSending ? 'Sending…' : 'Send Invitation'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Pending Invitations ──────────────────────── */}
            {!invitationsLoading && activePendingInvitations.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Pending Invitations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activePendingInvitations.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-surface-700/30 hover:bg-surface-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
                            <Mail className="h-3.5 w-3.5 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm text-surface-200">{invite.email}</p>
                            <p className="text-xs text-surface-500">
                              Invited as <span className="capitalize font-medium text-surface-400">{invite.role}</span>
                              {' · '}
                              {new Date(invite.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeInvite(invite.id)}
                          disabled={revokingInvite === invite.id}
                        >
                          {revokingInvite === invite.id ? (
                            <span className="text-xs">Revoking…</span>
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Role Descriptions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Role Descriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      role: 'Admin',
                      description: 'Full access to all features including settings, user management, and financial data.',
                      badge: 'default' as const },
                    {
                      role: 'Manager',
                      description: 'Access to operations, reports, and team oversight. Cannot modify system settings.',
                      badge: 'warning' as const },
                    {
                      role: 'Employee',
                      description: 'Day-to-day operations: check-in/out packages, process shipments, handle customers.',
                      badge: 'muted' as const },
                  ].map((item) => (
                    <div
                      key={item.role}
                      className="flex items-start gap-3 p-3 rounded-lg bg-surface-800/30 border border-surface-700/30"
                    >
                      <Badge variant={item.badge} dot>
                        {item.role}
                      </Badge>
                      <p className="text-sm text-surface-400">{item.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabPanel>


          {/* ── Appearance Tab ──────────────────────────── */}
          <TabPanel active={activeTab === 'appearance'}>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Theme</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-surface-500 mb-5">
                    Choose how ShipOS looks. Your preference is saved to this browser.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                    {/* Light theme card */}
                    <button
                      onClick={() => setTheme('light')}
                      className={`group relative rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                        theme === 'light'
                          ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-600/20'
                          : 'border-surface-700 hover:border-surface-600 bg-surface-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          theme === 'light' ? 'bg-primary-100 text-primary-600' : 'bg-surface-800 text-surface-500'
                        }`}>
                          <Sun className="h-5 w-5" />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${
                            theme === 'light' ? 'text-primary-600' : 'text-surface-200'
                          }`}>Light</p>
                          <p className="text-xs text-surface-500">Clean and bright</p>
                        </div>
                        {theme === 'light' && (
                          <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary-600">
                            <Check className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}
                      </div>
                      {/* Mini preview */}
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-indigo-500" />
                          <div className="h-1.5 w-16 rounded bg-slate-200" />
                        </div>
                        <div className="h-1.5 w-full rounded bg-slate-100" />
                        <div className="h-1.5 w-3/4 rounded bg-slate-100" />
                        <div className="flex gap-1.5 mt-1">
                          <div className="h-4 w-12 rounded bg-indigo-500" />
                          <div className="h-4 w-12 rounded bg-slate-200" />
                        </div>
                      </div>
                    </button>

                    {/* Dark theme card */}
                    <button
                      onClick={() => setTheme('dark')}
                      className={`group relative rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                        theme === 'dark'
                          ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-600/20'
                          : 'border-surface-700 hover:border-surface-600 bg-surface-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          theme === 'dark' ? 'bg-primary-100 text-primary-600' : 'bg-surface-800 text-surface-500'
                        }`}>
                          <Moon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${
                            theme === 'dark' ? 'text-primary-600' : 'text-surface-200'
                          }`}>Dark</p>
                          <p className="text-xs text-surface-500">Easy on the eyes</p>
                        </div>
                        {theme === 'dark' && (
                          <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary-600">
                            <Check className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}
                      </div>
                      {/* Mini preview */}
                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-indigo-400" />
                          <div className="h-1.5 w-16 rounded bg-slate-700" />
                        </div>
                        <div className="h-1.5 w-full rounded bg-slate-800" />
                        <div className="h-1.5 w-3/4 rounded bg-slate-800" />
                        <div className="flex gap-1.5 mt-1">
                          <div className="h-4 w-12 rounded bg-indigo-500" />
                          <div className="h-4 w-12 rounded bg-slate-700" />
                        </div>
                      </div>
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Interface Density</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-surface-500 mb-4">
                    Controls spacing and sizing across the interface.
                  </p>
                  <div className="flex items-center gap-3">
                    <Badge variant="info">Default</Badge>
                    <span className="text-sm text-surface-400">Comfortable — optimized for desktop and tablet</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabPanel>
          {/* ── Migration Tab ────────────────────────────── */}
          <TabPanel active={activeTab === 'migration'}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary-600" />
                  PostalMate Migration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-surface-400 text-sm">
                  Import your existing PostalMate data into ShipOS. Upload a PostalMate backup file (.7z)
                  and we&apos;ll migrate your customers, shipments, packages, transactions, and address book.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Customers', desc: 'Customer profiles and mailbox assignments' },
                    { label: 'Shipments', desc: 'Shipping history, tracking, and costs' },
                    { label: 'Packages', desc: 'Package check-in and release records' },
                    { label: 'Transactions', desc: 'Invoice and payment history' },
                    { label: 'Addresses', desc: 'Ship-to address book entries' },
                    { label: 'Products', desc: 'Products, SKUs, and inventory' },
                  ].map(item => (
                    <div key={item.label} className="bg-surface-800/30 rounded-lg p-3 border border-surface-700/30">
                      <p className="text-sm text-surface-200 font-medium">{item.label}</p>
                      <p className="text-xs text-surface-500">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <a href="/dashboard/settings/migration">
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Start Migration
                  </Button>
                </a>
              </CardContent>
            </Card>
          </TabPanel>
        </div>
      </div>
    </div>
  );
}
