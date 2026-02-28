'use client';

/**
 * Customer Display — Full customer-facing transaction flow
 *
 * BAR-289: Welcome Screen
 * BAR-290: Stats Dashboard
 * BAR-291: Signature Box
 * BAR-292: Confirmation Screen
 * BAR-293: Marketing Display (integrated in Welcome)
 * BAR-294: Payment Screen
 *
 * Flow: Welcome → Stats → Signature → Payment (if required) → Confirmation
 */

import { useState, useCallback } from 'react';
import { useTenant } from '@/components/tenant-provider';
import { useActivityLog } from '@/components/activity-log-provider';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import {
  WelcomeScreen,
  StatsScreen,
  SignatureScreen,
  PaymentScreen,
  ConfirmationScreen,
} from '@/components/customer-display';
import {
  Monitor,
  Play,
  RotateCcw,
  Settings,
  Maximize2,
  Eye,
  ArrowRight,
  Package,
  FileSignature,
  CreditCard,
  CheckCircle2,
  ScreenShare,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
type DisplayScreen = 'welcome' | 'stats' | 'signature' | 'payment' | 'confirmation';

/* -------------------------------------------------------------------------- */
/*  Demo Data                                                                 */
/* -------------------------------------------------------------------------- */
const DEMO_ANNOUNCEMENTS = [
  '📦 Holiday shipping deadlines approaching — ship early!',
  '🎉 Refer a friend and get 1 month free mailbox rental',
  '🔔 New: Request package forwarding from your phone',
];

const DEMO_MARKETING_IMAGES = [
  {
    id: '1',
    url: 'https://placehold.co/1920x1080/1e293b/6366f1?text=Holiday+Shipping+Promo',
    caption: 'Ship your holiday packages early — guaranteed delivery!',
    altText: 'Holiday shipping promotion',
  },
  {
    id: '2',
    url: 'https://placehold.co/1920x1080/1e293b/10b981?text=Mailbox+Rental+Special',
    caption: 'First month free when you sign up for a new mailbox',
    altText: 'Mailbox rental special offer',
  },
];

const DEMO_STATS = {
  customerName: 'Sarah Johnson',
  pmbNumber: 'PMB-0042',
  packageCount: 3,
  mailCount: 2,
  oldestItemDays: 5,
  accountStatus: 'active' as const,
  lastPickupDate: '2026-02-20',
  notifyEmail: true,
  notifySms: true,
  pendingForwarding: 0,
  pendingDisposal: 0,
};

const DEMO_PARCELS = [
  { id: '1', trackingNumber: '1Z999AA10123456784', carrier: 'ups' },
  { id: '2', trackingNumber: '794644790132', carrier: 'fedex' },
  { id: '3', trackingNumber: '9400111899223456789012', carrier: 'usps' },
];

const DEMO_LINE_ITEMS = [
  { id: '1', description: 'Package Receiving Fee', quantity: 3, unitPrice: 2.50 },
  { id: '2', description: 'Storage Fee (5 days)', quantity: 1, unitPrice: 3.00 },
];

/* -------------------------------------------------------------------------- */
/*  Screen Flow Indicator                                                     */
/* -------------------------------------------------------------------------- */
function FlowIndicator({ currentScreen }: { currentScreen: DisplayScreen }) {
  const screens: { id: DisplayScreen; label: string; icon: React.ElementType }[] = [
    { id: 'welcome', label: 'Welcome', icon: Monitor },
    { id: 'stats', label: 'Stats', icon: Package },
    { id: 'signature', label: 'Signature', icon: FileSignature },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'confirmation', label: 'Confirm', icon: CheckCircle2 },
  ];

  const currentIndex = screens.findIndex((s) => s.id === currentScreen);

  return (
    <div className="flex items-center gap-1">
      {screens.map((screen, idx) => {
        const Icon = screen.icon;
        const isActive = screen.id === currentScreen;
        const isPast = idx < currentIndex;
        return (
          <div key={screen.id} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30'
                : isPast
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-surface-500'
            }`}>
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{screen.label}</span>
            </div>
            {idx < screens.length - 1 && (
              <ArrowRight className={`h-3 w-3 ${isPast ? 'text-emerald-600' : 'text-surface-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function CustomerDisplayPage() {
  const { tenant } = useTenant();
  const { log: logActivity } = useActivityLog();

  const [activeTab, setActiveTab] = useState('overview');
  const [currentScreen, setCurrentScreen] = useState<DisplayScreen>('welcome');
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [hasFees] = useState(true);

  const storeName = tenant?.name || 'My Mail Center';
  const storeLogo = tenant?.brandLogo || null;
  const tagline = tenant?.brandTagline || 'Your trusted mailbox and package center';
  const accentColor = tenant?.brandAccentColor || '#6366f1';

  const TABS = [
    { id: 'overview', label: 'Overview', icon: <Eye className="h-3.5 w-3.5" /> },
    { id: 'preview', label: 'Live Preview', icon: <Play className="h-3.5 w-3.5" /> },
    { id: 'settings', label: 'Display Settings', icon: <Settings className="h-3.5 w-3.5" /> },
  ];

  // Screen navigation
  const goToScreen = useCallback((screen: DisplayScreen) => {
    setCurrentScreen(screen);
  }, []);

  const resetFlow = useCallback(() => {
    setCurrentScreen('welcome');
  }, []);

  // Screen rendering
  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return (
          <WelcomeScreen
            storeName={storeName}
            storeLogo={storeLogo}
            tagline={tagline}
            isOpen
            onCheckMailbox={() => goToScreen('stats')}
            announcements={DEMO_ANNOUNCEMENTS}
            marketingImages={DEMO_MARKETING_IMAGES}
            accentColor={accentColor}
          />
        );
      case 'stats':
        return (
          <StatsScreen
            stats={DEMO_STATS}
            onContinue={() => goToScreen('signature')}
            onBack={() => goToScreen('welcome')}
          />
        );
      case 'signature':
        return (
          <SignatureScreen
            customerName={DEMO_STATS.customerName}
            parcels={DEMO_PARCELS}
            onSign={() => {
              logActivity({ action: 'customer.update', entityType: 'customer', entityId: 'demo', description: 'Customer signature captured' });
              goToScreen(hasFees ? 'payment' : 'confirmation');
            }}
            onBack={() => goToScreen('stats')}
          />
        );
      case 'payment':
        return (
          <PaymentScreen
            customerName={DEMO_STATS.customerName}
            pmbNumber={DEMO_STATS.pmbNumber}
            lineItems={DEMO_LINE_ITEMS}
            taxRate={tenant?.taxRate ? tenant.taxRate / 100 : 0.08}
            onPaymentComplete={(method) => {
              logActivity({ action: 'package.release', entityType: 'payment', entityId: 'demo', description: `Payment completed via ${method}` });
              goToScreen('confirmation');
            }}
            onBack={() => goToScreen('signature')}
          />
        );
      case 'confirmation':
        return (
          <ConfirmationScreen
            customerName={DEMO_STATS.customerName}
            parcels={DEMO_PARCELS}
            timestamp={new Date()}
            storeName={storeName}
            onEmailReceipt={() => logActivity({ action: 'notification.send', entityType: 'receipt', entityId: 'demo', description: 'Email receipt sent' })}
            onPrintReceipt={() => logActivity({ action: 'notification.send', entityType: 'receipt', entityId: 'demo', description: 'Receipt printed' })}
            onNoReceipt={() => { /* no-op */ }}
            onCheckAnother={() => goToScreen('welcome')}
            onDone={() => goToScreen('welcome')}
            variant="pos"
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Display"
        description="Configure customer-facing screens."
        icon={<ScreenShare className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="info" dot={false}>
              {currentScreen === 'welcome' ? 'Welcome' : currentScreen}
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={resetFlow}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Reset Flow
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setPreviewFullscreen(!previewFullscreen)}
              leftIcon={<Maximize2 className="h-3.5 w-3.5" />}
            >
              {previewFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
            </Button>
          </div>
        }
      />

      {/* Fullscreen Preview */}
      {previewFullscreen ? (
        <div className="fixed inset-0 z-50 bg-surface-950">
          <button
            onClick={() => setPreviewFullscreen(false)}
            className="fixed top-4 right-4 z-[60] rounded-lg bg-surface-800/80 p-2 text-surface-400 hover:text-white backdrop-blur-sm"
          >
            Exit Preview
          </button>
          {renderScreen()}
        </div>
      ) : (
        <>
          {/* Flow Indicator */}
          <FlowIndicator currentScreen={currentScreen} />

          {/* Tabs */}
          <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

          {/* Overview Tab */}
          <TabPanel active={activeTab === 'overview'}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Screen Flow */}
              <Card>
                <h3 className="text-sm font-semibold text-surface-200 mb-4">
                  Transaction Flow
                </h3>
                <div className="space-y-3">
                  {[
                    { screen: 'welcome' as const, label: 'Welcome Screen', desc: 'Store branding, CTA, marketing carousel', icon: Monitor, color: 'text-blue-400' },
                    { screen: 'stats' as const, label: 'Customer Stats', desc: 'Package count, mail count, account status', icon: Package, color: 'text-purple-400' },
                    { screen: 'signature' as const, label: 'Signature Capture', desc: 'Sign for package release', icon: FileSignature, color: 'text-amber-400' },
                    { screen: 'payment' as const, label: 'Payment', desc: 'Fee display & payment collection (if required)', icon: CreditCard, color: 'text-emerald-400' },
                    { screen: 'confirmation' as const, label: 'Confirmation', desc: 'Release summary, receipt options', icon: CheckCircle2, color: 'text-emerald-400' },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = currentScreen === item.screen;
                    return (
                      <button
                        key={item.screen}
                        onClick={() => goToScreen(item.screen)}
                        className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors ${
                          isActive
                            ? 'bg-primary-500/10 ring-1 ring-primary-500/30'
                            : 'hover:bg-surface-800/50'
                        }`}
                      >
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-surface-800 flex-shrink-0`}>
                          <Icon className={`h-4.5 w-4.5 ${item.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isActive ? 'text-primary-400' : 'text-surface-200'}`}>
                            {item.label}
                          </p>
                          <p className="text-xs text-surface-500 truncate">
                            {item.desc}
                          </p>
                        </div>
                        <ArrowRight className={`h-4 w-4 ${isActive ? 'text-primary-400' : 'text-surface-600'}`} />
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Quick Preview */}
              <Card padding="none">
                <div className="p-4 border-b border-surface-700">
                  <h3 className="text-sm font-semibold text-surface-200">
                    Screen Preview
                  </h3>
                  <p className="text-xs text-surface-500 mt-1">
                    Click any screen on the left or interact with the preview below.
                  </p>
                </div>
                <div className="relative aspect-video bg-surface-950 overflow-hidden rounded-b-xl">
                  <div className="absolute inset-0 transform scale-[0.4] origin-top-left w-[250%] h-[250%]">
                    {renderScreen()}
                  </div>
                  {/* Overlay click to fullscreen */}
                  <button
                    onClick={() => setPreviewFullscreen(true)}
                    className="absolute inset-0 flex items-center justify-center bg-surface-950/30 opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-center gap-2 rounded-lg bg-surface-800/90 px-4 py-2 text-sm text-surface-200 backdrop-blur-sm">
                      <Maximize2 className="h-4 w-4" />
                      Click to expand
                    </div>
                  </button>
                </div>
              </Card>
            </div>
          </TabPanel>

          {/* Live Preview Tab */}
          <TabPanel active={activeTab === 'preview'}>
            <div className="rounded-2xl border border-surface-700 overflow-hidden bg-surface-950">
              <div className="flex items-center justify-between px-4 py-2 border-b border-surface-700 bg-surface-900">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500/60" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                    <div className="h-3 w-3 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-xs text-surface-500 ml-2">
                    POS 2nd Screen — {currentScreen}
                  </span>
                </div>
                <FlowIndicator currentScreen={currentScreen} />
              </div>
              <div className="relative" style={{ height: '600px' }}>
                <div className="absolute inset-0 overflow-auto">
                  {renderScreen()}
                </div>
              </div>
            </div>
          </TabPanel>

          {/* Display Settings Tab */}
          <TabPanel active={activeTab === 'settings'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-sm font-semibold text-surface-200 mb-4">
                  Display Configuration
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-surface-800">
                    <div>
                      <p className="text-sm text-surface-200">Auto-Timeout</p>
                      <p className="text-xs text-surface-500">Confirmation screen returns to welcome</p>
                    </div>
                    <span className="text-sm font-mono text-surface-300">15s</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-surface-800">
                    <div>
                      <p className="text-sm text-surface-200">Signature Timeout</p>
                      <p className="text-xs text-surface-500">Session expires without input</p>
                    </div>
                    <span className="text-sm font-mono text-surface-300">60s</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-surface-800">
                    <div>
                      <p className="text-sm text-surface-200">Marketing Rotation</p>
                      <p className="text-xs text-surface-500">Image carousel interval</p>
                    </div>
                    <span className="text-sm font-mono text-surface-300">8s</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-surface-800">
                    <div>
                      <p className="text-sm text-surface-200">Payment Timeout</p>
                      <p className="text-xs text-surface-500">Show &quot;ask staff&quot; fallback</p>
                    </div>
                    <span className="text-sm font-mono text-surface-300">90s</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-surface-200">Theme</p>
                      <p className="text-xs text-surface-500">Display theme preference</p>
                    </div>
                    <Badge variant="muted" dot={false}>Dark</Badge>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold text-surface-200 mb-4">
                  Marketing Images
                </h3>
                <p className="text-xs text-surface-400 mb-3">
                  Upload images to display on the welcome screen carousel.
                  Recommended: 1920×1080, 16:9 aspect ratio. Max 5MB per image.
                </p>
                <div className="space-y-2">
                  {DEMO_MARKETING_IMAGES.map((img) => (
                    <div
                      key={img.id}
                      className="flex items-center gap-3 rounded-lg bg-surface-800/50 p-2"
                    >
                      <div className="h-12 w-20 rounded bg-surface-700 flex items-center justify-center text-xs text-surface-500 flex-shrink-0">
                        16:9
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-surface-300 truncate">
                          {img.caption || 'Untitled'}
                        </p>
                        <p className="text-[10px] text-surface-500">{img.altText}</p>
                      </div>
                      <Badge variant="success" dot={false}>Active</Badge>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                >
                  Upload Image
                </Button>
              </Card>
            </div>
          </TabPanel>
        </>
      )}
    </div>
  );
}
