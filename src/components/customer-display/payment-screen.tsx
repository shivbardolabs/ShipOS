'use client';

/**
 * BAR-294 — Customer-Facing Payment Screen
 * Fee & Payment Collection
 */

import { useState, useEffect } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import {
  CreditCard,
  Banknote,
  Wallet,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  HelpCircle,
  Timer,
  Smartphone,
  Wifi,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface PaymentScreenProps {
  customerName: string;
  pmbNumber: string;
  lineItems: LineItem[];
  taxRate: number;
  onPaymentComplete: (method: string) => void;
  onBack: () => void;
  onStaffOverride?: () => void;
  timeoutSeconds?: number;
}

type PaymentMethod = 'card' | 'cash' | 'account' | 'invoice';
type PaymentState = 'select' | 'processing' | 'success' | 'failed';

/* -------------------------------------------------------------------------- */
/*  Payment Method Config                                                     */
/* -------------------------------------------------------------------------- */
const PAYMENT_METHODS = [
  {
    id: 'card' as const,
    label: 'Credit / Debit Card',
    description: 'Insert, tap, or swipe',
    icon: CreditCard,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 ring-blue-500/20 hover:bg-blue-500/20',
  },
  {
    id: 'cash' as const,
    label: 'Cash',
    description: 'Pay at counter',
    icon: Banknote,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 ring-emerald-500/20 hover:bg-emerald-500/20',
  },
  {
    id: 'account' as const,
    label: 'Account Balance',
    description: 'Use store credit',
    icon: Wallet,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 ring-purple-500/20 hover:bg-purple-500/20',
  },
  {
    id: 'invoice' as const,
    label: 'Charge to Account',
    description: 'Add to monthly invoice',
    icon: FileText,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 ring-amber-500/20 hover:bg-amber-500/20',
  },
];

/* -------------------------------------------------------------------------- */
/*  Payment Screen                                                            */
/* -------------------------------------------------------------------------- */
export function PaymentScreen({
  customerName,
  pmbNumber,
  lineItems,
  taxRate,
  onPaymentComplete,
  onBack,
  timeoutSeconds = 90,
}: PaymentScreenProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [paymentState, setPaymentState] = useState<PaymentState>('select');
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds);

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Timeout — show "ask staff" after timeout
  useEffect(() => {
    if (paymentState === 'success') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [paymentState]);

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);

    if (method === 'cash') {
      // Cash: just show "Pay at Counter" and complete
      setPaymentState('processing');
      setTimeout(() => {
        setPaymentState('success');
        setTimeout(() => onPaymentComplete('cash'), 1500);
      }, 1000);
      return;
    }

    if (method === 'account' || method === 'invoice') {
      // Account/invoice: process immediately
      setPaymentState('processing');
      setTimeout(() => {
        setPaymentState('success');
        setTimeout(() => onPaymentComplete(method), 1500);
      }, 1500);
      return;
    }

    // Card: show card reader prompt
    setPaymentState('processing');
    setTimeout(() => {
      setPaymentState('success');
      setTimeout(() => onPaymentComplete('card'), 1500);
    }, 3000);
  };

  const handleRetry = () => {
    setSelectedMethod(null);
    setPaymentState('select');
  };

  // Processing state messages
  const processingMessages: Record<string, string> = {
    card: 'Please insert, tap, or swipe your card',
    cash: 'Please pay at the counter',
    account: 'Charging to your account balance...',
    invoice: 'Adding to your monthly invoice...',
  };

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Payment</h1>
          <p className="text-surface-400 text-sm">
            {customerName} • {pmbNumber}
          </p>
        </div>

        {/* Itemized Charges — Receipt Style */}
        <div className="rounded-2xl bg-surface-900 ring-1 ring-surface-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-800">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
              Charges
            </p>
          </div>
          <div className="divide-y divide-surface-800">
            {lineItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-surface-200">{item.description}</p>
                  {item.quantity > 1 && (
                    <p className="text-xs text-surface-500">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </p>
                  )}
                </div>
                <p className="text-sm font-medium text-surface-100">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t border-surface-700 px-5 py-3 space-y-1">
            <div className="flex justify-between text-sm text-surface-400">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-surface-400">
              <span>Tax ({(taxRate * 100).toFixed(1)}%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-white pt-1">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        {paymentState === 'select' && (
          <div className="space-y-3">
            <p className="text-sm text-surface-400 text-center">
              Select payment method
            </p>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => handleSelectMethod(method.id)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl p-5 ring-1 transition-all min-h-[100px]',
                      method.bg
                    )}
                  >
                    <Icon className={cn('h-7 w-7', method.color)} />
                    <span className="text-sm font-semibold text-surface-100">
                      {method.label}
                    </span>
                    <span className="text-[10px] text-surface-500">
                      {method.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Processing State */}
        {paymentState === 'processing' && (
          <div className="text-center py-8 space-y-4">
            {selectedMethod === 'card' ? (
              <>
                <div className="relative inline-flex">
                  <Wifi className="h-16 w-16 text-blue-400 animate-pulse" />
                </div>
                <p className="text-lg font-semibold text-white">
                  {processingMessages[selectedMethod || 'card']}
                </p>
                <div className="flex items-center justify-center gap-4 text-surface-400 text-sm">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4" />
                    <span>Insert</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4" />
                    <span>Tap</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4" />
                    <span>Swipe</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Loader2 className="h-12 w-12 text-primary-500 animate-spin mx-auto" />
                <p className="text-lg font-semibold text-white">
                  {processingMessages[selectedMethod || 'cash']}
                </p>
              </>
            )}
          </div>
        )}

        {/* Success State */}
        {paymentState === 'success' && (
          <div className="text-center py-8 space-y-3">
            <div className="relative inline-flex">
              <CheckCircle2 className="h-16 w-16 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-emerald-400">Payment Successful</p>
            <p className="text-sm text-surface-400">
              {formatCurrency(total)} charged via {selectedMethod}
            </p>
          </div>
        )}

        {/* Failed State */}
        {paymentState === 'failed' && (
          <div className="text-center py-8 space-y-4">
            <XCircle className="h-16 w-16 text-red-400 mx-auto" />
            <p className="text-xl font-bold text-red-400">Payment Failed</p>
            <p className="text-sm text-surface-400">
              Please try again or choose a different payment method.
            </p>
            <button
              onClick={handleRetry}
              className="rounded-xl bg-surface-800 px-8 py-3 text-surface-200 font-semibold hover:bg-surface-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Back / Help */}
        {paymentState === 'select' && (
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-surface-400 hover:text-surface-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {timeLeft === 0 ? (
              <div className="flex items-center gap-2 text-amber-400 text-sm animate-pulse">
                <HelpCircle className="h-4 w-4" />
                Need help? Please ask staff
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-surface-600">
                <Timer className="h-3.5 w-3.5" />
                {timeLeft}s
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
