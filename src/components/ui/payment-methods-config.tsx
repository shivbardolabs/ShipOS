'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Smartphone,
  Nfc,
  Banknote,
  BookOpen,
  MessageSquare,
  Save,
  Settings,
  Check,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface PaymentMethodsConfig {
  manualCard: boolean;
  text2pay: boolean;
  tapToGlass: boolean;
  nfcReader: boolean;
  cash: boolean;
  postToAccount: boolean;
  terminalDeviceId?: string;
  processorName?: string;
}

interface PaymentMethodOption {
  key: keyof Pick<
    PaymentMethodsConfig,
    'manualCard' | 'text2pay' | 'tapToGlass' | 'nfcReader' | 'cash' | 'postToAccount'
  >;
  label: string;
  description: string;
  icon: React.ReactNode;
  requiresSetup?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Method definitions                                                        */
/* -------------------------------------------------------------------------- */

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    key: 'postToAccount',
    label: 'Post to Account',
    description: 'Charges posted to customer account for later billing',
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    key: 'cash',
    label: 'Cash — Use Your POS',
    description: 'Mark as cash and defer to your existing POS register',
    icon: <Banknote className="h-5 w-5" />,
  },
  {
    key: 'manualCard',
    label: 'Manual Card Entry',
    description: 'Keyed-in card number for phone orders or chip/tap failures',
    icon: <CreditCard className="h-5 w-5" />,
    requiresSetup: true,
  },
  {
    key: 'text2pay',
    label: 'Text 2 Pay',
    description: 'SMS payment link sent to customer\'s phone',
    icon: <MessageSquare className="h-5 w-5" />,
    requiresSetup: true,
  },
  {
    key: 'tapToGlass',
    label: 'Tap to Glass',
    description: 'Use device as NFC terminal — Apple Pay, Google Pay, Samsung Pay',
    icon: <Smartphone className="h-5 w-5" />,
    requiresSetup: true,
  },
  {
    key: 'nfcReader',
    label: 'NFC Card Reader',
    description: 'External contactless reader (Stripe Terminal, Square Reader)',
    icon: <Nfc className="h-5 w-5" />,
    requiresSetup: true,
  },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

interface PaymentMethodsConfigPanelProps {
  config: PaymentMethodsConfig;
  onSave: (config: PaymentMethodsConfig) => Promise<void>;
  className?: string;
}

export function PaymentMethodsConfigPanel({
  config: initialConfig,
  onSave,
  className,
}: PaymentMethodsConfigPanelProps) {
  const [config, setConfig] = useState<PaymentMethodsConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleMethod = useCallback(
    (key: PaymentMethodOption['key']) => {
      setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
      setSaved(false);
    },
    [],
  );

  const enabledCount = PAYMENT_METHODS.filter((m) => config[m.key]).length;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }, [config, onSave]);

  return (
    <Card className={cn('p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10">
            <Settings className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Payment Methods</h3>
            <p className="text-sm text-zinc-400">
              Configure which payment methods are available during checkout
            </p>
          </div>
        </div>
        <Badge variant={enabledCount > 0 ? 'success' : 'warning'}>
          {enabledCount} enabled
        </Badge>
      </div>

      {/* Processor-agnostic notice */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 mb-6">
        <Shield className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-300/80">
          ShipOS is processor-agnostic — each store uses its own payment processor.
          Enable the methods your processor supports.
        </p>
      </div>

      {/* Method toggles */}
      <div className="space-y-3 mb-6">
        {PAYMENT_METHODS.map((method) => {
          const enabled = config[method.key];
          return (
            <button
              key={method.key}
              type="button"
              onClick={() => toggleMethod(method.key)}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left',
                enabled
                  ? 'border-indigo-500/40 bg-indigo-500/5'
                  : 'border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600/50',
              )}
            >
              <div
                className={cn(
                  'p-2 rounded-lg shrink-0',
                  enabled ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-700/40 text-zinc-500',
                )}
              >
                {method.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('font-medium', enabled ? 'text-white' : 'text-zinc-400')}>
                    {method.label}
                  </span>
                  {method.requiresSetup && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                      Requires setup
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{method.description}</p>
              </div>

              {/* Toggle visual */}
              <div
                className={cn(
                  'w-11 h-6 rounded-full relative transition-colors shrink-0',
                  enabled ? 'bg-indigo-500' : 'bg-zinc-700',
                )}
              >
                <div
                  className={cn(
                    'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                    enabled ? 'translate-x-[22px]' : 'translate-x-0.5',
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Processor name (optional) */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Payment Processor</label>
          <Input
            placeholder="e.g. Stripe, Square, Clover"
            value={config.processorName || ''}
            onChange={(e) => {
              setConfig((prev) => ({ ...prev, processorName: e.target.value }));
              setSaved(false);
            }}
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Terminal Device ID</label>
          <Input
            placeholder="e.g. tmr_xxx (optional)"
            value={config.terminalDeviceId || ''}
            onChange={(e) => {
              setConfig((prev) => ({ ...prev, terminalDeviceId: e.target.value }));
              setSaved(false);
            }}
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || enabledCount === 0}
          variant={saved ? 'default' : 'default'}
          size="sm"
        >
          {saved ? (
            <>
              <Check className="h-4 w-4 mr-1.5" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? 'Saving…' : 'Save Changes'}
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
