'use client';

/**
 * Platform Config — BAR-285 & BAR-287
 *
 * CLIENT platform support matrix (Desktop, POS, Tablet, Mobile) and
 * CUSTOMER platform support (POS 2nd Screen, Browser, Tablet, Mobile).
 */

import { useState } from 'react';
import { useTenant } from '@/components/tenant-provider';
import { usePermission } from '@/hooks/use-permission';
import { useActivityLog } from '@/components/activity-log-provider';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
// Input available if needed for custom integration config
import { Modal } from '@/components/ui/modal';
import {
  Monitor,
  Tablet,
  Smartphone,
  ShoppingCart,
  Save,
  Settings,
  ShieldCheck,
  Check,
  Info,
  Eye,
  ScreenShare,
  Globe,
  Wifi,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface PlatformEntry {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  priority: 'core' | 'secondary' | 'phase2';
  enabled: boolean;
  minViewport: string;
  status: 'active' | 'planned' | 'beta';
  features: string[];
}

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */
const CLIENT_PLATFORMS: PlatformEntry[] = [
  {
    id: 'desktop',
    name: 'Desktop Browser',
    description: 'Full browser-based app (Windows, macOS, Linux) — min 1280px viewport',
    icon: Monitor,
    priority: 'core',
    enabled: true,
    minViewport: '1280px',
    status: 'active',
    features: ['Full-featured UI', 'Side navigation', 'Multi-panel layouts', 'Keyboard shortcuts', 'All settings access'],
  },
  {
    id: 'pos',
    name: 'POS — Existing Store System',
    description: 'Integration with existing POS hardware (Square, Clover, Lightspeed, etc.)',
    icon: ShoppingCart,
    priority: 'core',
    enabled: true,
    minViewport: '1024px',
    status: 'active',
    features: ['Check-out flow sync', 'Fee calculation', 'Receipt printing', 'Register integration', 'Barcode scanning'],
  },
  {
    id: 'tablet',
    name: 'Tablet',
    description: 'Browser-based responsive app (iPad / Android) — min 768px viewport',
    icon: Tablet,
    priority: 'core',
    enabled: true,
    minViewport: '768px',
    status: 'active',
    features: ['Touch-optimized', 'Larger tap targets', 'Swipe gestures', 'Simplified navigation'],
  },
  {
    id: 'mobile',
    name: 'Mobile Browser / PWA',
    description: 'Mobile browser or PWA on iOS & Android — min 375px viewport',
    icon: Smartphone,
    priority: 'secondary',
    enabled: true,
    minViewport: '375px',
    status: 'beta',
    features: ['Responsive layout', 'Push notifications', 'Quick lookup', 'Priority actions', 'PWA installable'],
  },
];

const CUSTOMER_PLATFORMS: PlatformEntry[] = [
  {
    id: 'pos-2nd-screen',
    name: 'POS 2nd Screen',
    description: 'Secondary display at store counter, facing customer during transactions',
    icon: ScreenShare,
    priority: 'core',
    enabled: true,
    minViewport: '1024px',
    status: 'active',
    features: ['Kiosk-like display', 'Transaction flow', 'Touchscreen signature', 'Large fonts', 'Auto-timeout'],
  },
  {
    id: 'browser',
    name: 'Desktop / Laptop Browser',
    description: 'Web portal — full MailBox OS Client experience',
    icon: Globe,
    priority: 'core',
    enabled: true,
    minViewport: '1024px',
    status: 'active',
    features: ['Full portal experience', 'Package management', 'Account settings', 'Payment processing'],
  },
  {
    id: 'tablet',
    name: 'Tablet Browser',
    description: 'Browser-based responsive app, touch-optimized',
    icon: Tablet,
    priority: 'core',
    enabled: true,
    minViewport: '768px',
    status: 'active',
    features: ['Touch-optimized', 'Responsive layout', 'All portal features'],
  },
  {
    id: 'mobile-browser',
    name: 'Mobile Browser (Safari & Chrome)',
    description: 'Mobile-optimized web on Safari (iOS 15+) and Chrome (Android 10+)',
    icon: Smartphone,
    priority: 'core',
    enabled: true,
    minViewport: '375px',
    status: 'active',
    features: ['View packages', 'Request forwarding', 'Account info', 'Burger menu navigation'],
  },
  {
    id: 'mobile-app',
    name: 'Native Mobile App (iOS & Android)',
    description: 'Native mobile app with push notifications',
    icon: Smartphone,
    priority: 'phase2',
    enabled: false,
    minViewport: '375px',
    status: 'planned',
    features: ['Push notifications', 'Biometric auth', 'Offline mode', 'Camera integration'],
  },
];

const POS_INTEGRATIONS = [
  { id: 'square', name: 'Square', status: 'supported' as const },
  { id: 'clover', name: 'Clover', status: 'supported' as const },
  { id: 'lightspeed', name: 'Lightspeed', status: 'planned' as const },
  { id: 'shopify-pos', name: 'Shopify POS', status: 'planned' as const },
  { id: 'toast', name: 'Toast', status: 'planned' as const },
  { id: 'custom-api', name: 'Custom API', status: 'supported' as const },
];

/* -------------------------------------------------------------------------- */
/*  PlatformCard                                                              */
/* -------------------------------------------------------------------------- */
function PlatformCard({
  platform,
  onToggle,
  readOnly,
}: {
  platform: PlatformEntry;
  onToggle: (id: string) => void;
  readOnly: boolean;
}) {
  const Icon = platform.icon;
  const priorityColors = {
    core: 'success',
    secondary: 'info',
    phase2: 'muted',
  } as const;
  const statusColors = {
    active: 'success',
    beta: 'warning',
    planned: 'muted',
  } as const;

  return (
    <Card className="relative">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 flex-shrink-0">
          <Icon className="h-6 w-6 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-surface-100">{platform.name}</h3>
            <Badge variant={priorityColors[platform.priority]} dot={false}>
              {platform.priority === 'phase2' ? 'Phase 2' : platform.priority}
            </Badge>
            <Badge variant={statusColors[platform.status]} dot>
              {platform.status}
            </Badge>
          </div>
          <p className="text-xs text-surface-400 mt-1">{platform.description}</p>

          {/* Features */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {platform.features.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1 rounded-md bg-surface-800 px-2 py-0.5 text-[10px] text-surface-300"
              >
                <Check className="h-2.5 w-2.5 text-emerald-400" />
                {f}
              </span>
            ))}
          </div>

          {/* Viewport */}
          <p className="text-[10px] text-surface-500 mt-2">
            Min viewport: {platform.minViewport}
          </p>
        </div>

        {/* Toggle */}
        <button
          onClick={() => !readOnly && onToggle(platform.id)}
          disabled={readOnly || platform.priority === 'phase2'}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
            platform.enabled ? 'bg-emerald-500' : 'bg-surface-600'
          } ${readOnly || platform.priority === 'phase2' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
              platform.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  POS Integration Row                                                       */
/* -------------------------------------------------------------------------- */
function PosIntegrationRow({ integration }: { integration: typeof POS_INTEGRATIONS[0] }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-surface-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-800">
          <Wifi className="h-4 w-4 text-surface-400" />
        </div>
        <span className="text-sm font-medium text-surface-200">{integration.name}</span>
      </div>
      <Badge
        variant={integration.status === 'supported' ? 'success' : 'muted'}
        dot
      >
        {integration.status}
      </Badge>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Responsive Breakpoints Table                                              */
/* -------------------------------------------------------------------------- */
const BREAKPOINTS = [
  { name: 'Mobile', min: '375px', max: '767px', target: 'Phone browsers, PWA' },
  { name: 'Tablet', min: '768px', max: '1023px', target: 'iPad, Android tablets' },
  { name: 'POS / Desktop', min: '1024px', max: '1279px', target: 'POS terminals, compact desktops' },
  { name: 'Desktop (Full)', min: '1280px', max: '∞', target: 'Full desktop experience' },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function PlatformConfigPage() {
  useTenant();
  const canManage = usePermission('manage_settings');
  const { log: logActivity } = useActivityLog();

  const [activeTab, setActiveTab] = useState('client');
  const [clientPlatforms, setClientPlatforms] = useState(CLIENT_PLATFORMS);
  const [customerPlatforms, setCustomerPlatforms] = useState(CUSTOMER_PLATFORMS);
  const [posApproach, setPosApproach] = useState('api');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const TABS = [
    { id: 'client', label: 'Client Platforms', icon: <Monitor className="h-3.5 w-3.5" /> },
    { id: 'customer', label: 'Customer Platforms', icon: <Eye className="h-3.5 w-3.5" /> },
    { id: 'breakpoints', label: 'Breakpoints', icon: <Settings className="h-3.5 w-3.5" /> },
    { id: 'pos-integrations', label: 'POS Integrations', icon: <ShoppingCart className="h-3.5 w-3.5" /> },
  ];

  const toggleClientPlatform = (id: string) => {
    setClientPlatforms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const toggleCustomerPlatform = (id: string) => {
    setCustomerPlatforms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    logActivity({ action: 'settings.update', entityType: 'platform', entityId: 'config', description: 'Updated platform configuration' });
    setSaving(false);
    setShowSaveConfirm(false);
  };

  if (!canManage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShieldCheck className="h-12 w-12 text-surface-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-surface-300">Access Restricted</h2>
          <p className="text-sm text-surface-500 mt-1">
            Platform configuration is available to administrators only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Configuration"
        description="Manage platform support for CLIENT (store operator) and CUSTOMER interfaces."
        icon={<Monitor className="h-5 w-5" />}
        actions={
          <Button
            variant="default"
            onClick={() => setShowSaveConfirm(true)}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save Changes
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Monitor className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-surface-100">
                {clientPlatforms.filter((p) => p.enabled).length}
              </p>
              <p className="text-xs text-surface-400">Client Platforms</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Eye className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-surface-100">
                {customerPlatforms.filter((p) => p.enabled).length}
              </p>
              <p className="text-xs text-surface-400">Customer Platforms</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <ShoppingCart className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-surface-100">
                {POS_INTEGRATIONS.filter((p) => p.status === 'supported').length}
              </p>
              <p className="text-xs text-surface-400">POS Integrations</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <Settings className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-surface-100">{BREAKPOINTS.length}</p>
              <p className="text-xs text-surface-400">Breakpoints</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Client Platforms — BAR-285 */}
      <TabPanel active={activeTab === 'client'}>
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-blue-400" />
            <p className="text-xs text-surface-400">
              Configure which platforms are supported for store operator (CLIENT) access.
              Core platforms are required; secondary platforms can be toggled.
            </p>
          </div>
          {clientPlatforms.map((platform) => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              onToggle={toggleClientPlatform}
              readOnly={!canManage}
            />
          ))}
        </div>
      </TabPanel>

      {/* Customer Platforms — BAR-287 */}
      <TabPanel active={activeTab === 'customer'}>
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-blue-400" />
            <p className="text-xs text-surface-400">
              Configure which platforms customers (PMB account holders) can access via MailBox OS Client.
            </p>
          </div>
          {customerPlatforms.map((platform) => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              onToggle={toggleCustomerPlatform}
              readOnly={!canManage}
            />
          ))}

          {/* POS 2nd Screen Requirements */}
          <Card className="border-l-2 border-l-primary-500">
            <CardHeader>
              <CardTitle>POS 2nd Screen Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-surface-300">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Dedicated kiosk-like display mode — no navigation chrome
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Transaction flow: Welcome → Stats → Signature → Payment → Confirmation
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Large fonts, high contrast, minimum 44×44px tap targets
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Touchscreen signature capture fills most of screen
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Auto-timeout and reset after transaction completion
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </TabPanel>

      {/* Breakpoints */}
      <TabPanel active={activeTab === 'breakpoints'}>
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Breakpoint</th>
                  <th className="px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Min Width</th>
                  <th className="px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Max Width</th>
                  <th className="px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Target Devices</th>
                </tr>
              </thead>
              <tbody>
                {BREAKPOINTS.map((bp) => (
                  <tr key={bp.name} className="border-b border-surface-800 last:border-0">
                    <td className="px-6 py-3 font-medium text-surface-200">{bp.name}</td>
                    <td className="px-6 py-3 text-surface-300 font-mono text-xs">{bp.min}</td>
                    <td className="px-6 py-3 text-surface-300 font-mono text-xs">{bp.max}</td>
                    <td className="px-6 py-3 text-surface-400">{bp.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Touch Target Standards */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Touch Target Standards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-surface-700 p-4">
                <p className="text-xs font-semibold text-surface-400 uppercase">Minimum Tap Target</p>
                <p className="text-lg font-bold text-surface-100 mt-1">44 × 44px</p>
                <p className="text-xs text-surface-500 mt-1">WCAG 2.1 Level AAA</p>
              </div>
              <div className="rounded-lg border border-surface-700 p-4">
                <p className="text-xs font-semibold text-surface-400 uppercase">Tap Target Spacing</p>
                <p className="text-lg font-bold text-surface-100 mt-1">8px min</p>
                <p className="text-xs text-surface-500 mt-1">Between interactive elements</p>
              </div>
              <div className="rounded-lg border border-surface-700 p-4">
                <p className="text-xs font-semibold text-surface-400 uppercase">Font Size (Touch)</p>
                <p className="text-lg font-bold text-surface-100 mt-1">16px min</p>
                <p className="text-xs text-surface-500 mt-1">Prevents iOS zoom on focus</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* POS Integrations */}
      <TabPanel active={activeTab === 'pos-integrations'}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>POS Systems</CardTitle>
            </CardHeader>
            <CardContent>
              {POS_INTEGRATIONS.map((integration) => (
                <PosIntegrationRow key={integration.id} integration={integration} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integration Approach</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                label="POS Integration Method"
                value={posApproach}
                onChange={(e) => setPosApproach(e.target.value)}
                options={[
                  { value: 'api', label: 'API Integration — Direct REST/webhook sync' },
                  { value: 'middleware', label: 'Middleware — Bridge via ShipOS middleware layer' },
                  { value: 'embedded', label: 'Embedded — iframe / webview in POS system' },
                ]}
              />

              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-surface-700 p-3">
                  <p className="text-xs font-semibold text-surface-300">Check-Out Flow Sync</p>
                  <p className="text-xs text-surface-500 mt-1">
                    Fee calculation and receipt printing synced with POS register in real-time.
                  </p>
                </div>
                <div className="rounded-lg border border-surface-700 p-3">
                  <p className="text-xs font-semibold text-surface-300">Hardware Requirements</p>
                  <p className="text-xs text-surface-500 mt-1">
                    Barcode scanner, receipt printer, and optional 2nd screen display via HDMI/USB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabPanel>

      {/* Save Confirmation Modal */}
      <Modal
        open={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        title="Save Platform Configuration"
        description="This will update the platform support matrix for your store."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowSaveConfirm(false)}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleSave} loading={saving}>
              Confirm & Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-surface-300">
            The following changes will take effect immediately:
          </p>
          <div className="rounded-lg bg-surface-800 p-3 text-xs text-surface-400">
            <p>• Client platforms: {clientPlatforms.filter((p) => p.enabled).length} active</p>
            <p>• Customer platforms: {customerPlatforms.filter((p) => p.enabled).length} active</p>
            <p>• POS integration: {posApproach}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
