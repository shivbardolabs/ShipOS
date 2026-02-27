'use client';

/**
 * BAR-292 — Customer-Facing Confirmation Screen
 * Action Complete & Parcel Count
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import {
  CheckCircle2,
  Mail as MailIcon,
  Printer,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Mailbox,
  Timer,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface ParcelDetail {
  id: string;
  trackingNumber: string;
  carrier: string;
}

interface ConfirmationScreenProps {
  customerName: string;
  parcels: ParcelDetail[];
  timestamp: Date;
  storeName: string;
  onEmailReceipt: () => void;
  onPrintReceipt: () => void;
  onNoReceipt: () => void;
  onCheckAnother: () => void;
  onDone: () => void;
  autoTimeoutSeconds?: number;
  variant?: 'pos' | 'portal';
}

/* -------------------------------------------------------------------------- */
/*  Animated Checkmark                                                        */
/* -------------------------------------------------------------------------- */
function AnimatedCheckmark() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={cn(
      'relative inline-flex transition-all duration-500',
      show ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
    )}>
      {/* Glow ring */}
      <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-500/40">
        <CheckCircle2 className="h-12 w-12 text-emerald-400" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Confirmation Screen                                                       */
/* -------------------------------------------------------------------------- */
export function ConfirmationScreen({
  customerName,
  parcels,
  timestamp,
  storeName,
  onEmailReceipt,
  onPrintReceipt,
  onNoReceipt,
  onCheckAnother,
  onDone,
  autoTimeoutSeconds = 15,
  variant = 'pos',
}: ConfirmationScreenProps) {
  const [showDetails, setShowDetails] = useState(parcels.length <= 10);
  const [timeLeft, setTimeLeft] = useState(autoTimeoutSeconds);
  const [showActions, setShowActions] = useState(false);
  const [receiptSent, setReceiptSent] = useState(false);

  // Auto-timeout (POS only)
  useEffect(() => {
    if (variant !== 'pos') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onDone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [variant, onDone]);

  // Show "do anything else?" after a moment
  useEffect(() => {
    const timer = setTimeout(() => setShowActions(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleEmailReceipt = () => {
    onEmailReceipt();
    setReceiptSent(true);
  };

  const handlePrintReceipt = () => {
    onPrintReceipt();
    setReceiptSent(true);
  };

  const timeStr = timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-950 via-emerald-950/10 to-surface-950 flex flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-lg space-y-8">
        {/* Success Animation */}
        <div className="text-center space-y-4">
          <AnimatedCheckmark />
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {parcels.length} package{parcels.length !== 1 ? 's' : ''} released
          </h1>
          <p className="text-surface-400">
            to <span className="text-surface-200 font-medium">{customerName}</span>
          </p>
          <p className="text-xs text-surface-500 font-mono">{timeStr}</p>
        </div>

        {/* Parcel Details */}
        {parcels.length > 10 && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-2 text-sm text-surface-400 hover:text-surface-200 transition-colors"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                View {parcels.length} Parcels
              </>
            )}
          </button>
        )}

        {showDetails && parcels.length > 0 && (
          <div className="rounded-xl bg-surface-900/60 ring-1 ring-surface-700 overflow-hidden max-h-[250px] overflow-y-auto">
            {parcels.map((parcel) => (
              <div
                key={parcel.id}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-surface-800 last:border-0"
              >
                <CarrierLogo carrier={parcel.carrier} size={20} />
                <span className="text-sm font-mono text-surface-300 truncate flex-1">
                  {parcel.trackingNumber}
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Receipt Options */}
        {!receiptSent ? (
          <div className="space-y-3">
            <p className="text-sm text-surface-400 text-center">
              Would you like a receipt?
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={handleEmailReceipt}
                className="flex flex-col items-center gap-2 rounded-xl bg-surface-800/60 p-4 ring-1 ring-surface-700 hover:bg-surface-800 transition-colors min-h-[80px]"
              >
                <MailIcon className="h-6 w-6 text-blue-400" />
                <span className="text-xs font-medium text-surface-300">
                  Email
                </span>
              </button>
              <button
                onClick={handlePrintReceipt}
                className="flex flex-col items-center gap-2 rounded-xl bg-surface-800/60 p-4 ring-1 ring-surface-700 hover:bg-surface-800 transition-colors min-h-[80px]"
              >
                <Printer className="h-6 w-6 text-emerald-400" />
                <span className="text-xs font-medium text-surface-300">
                  Print
                </span>
              </button>
              <button
                onClick={onNoReceipt}
                className="flex flex-col items-center gap-2 rounded-xl bg-surface-800/60 p-4 ring-1 ring-surface-700 hover:bg-surface-800 transition-colors min-h-[80px]"
              >
                <X className="h-6 w-6 text-surface-500" />
                <span className="text-xs font-medium text-surface-300">
                  No Thanks
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-emerald-400 flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Receipt sent
          </div>
        )}

        {/* Do Anything Else? */}
        {showActions && (
          <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <p className="text-sm text-surface-400 text-center">
              Would you like to do anything else?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onCheckAnother}
                className="flex items-center justify-center gap-2 rounded-xl bg-surface-800/60 py-4 ring-1 ring-surface-700 hover:bg-surface-800 transition-colors text-surface-200 font-medium min-h-[56px]"
              >
                <Mailbox className="h-5 w-5" />
                Check Another Mailbox
              </button>
              <button
                onClick={onDone}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-4 text-white font-semibold hover:bg-primary-500 transition-colors min-h-[56px]"
              >
                Done
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Thank You */}
        <div className="text-center pt-4">
          <p className="text-lg font-semibold text-surface-300">
            Thank you for visiting!
          </p>
          <p className="text-xs text-surface-500 mt-1">{storeName}</p>
        </div>

        {/* Auto-timeout bar (POS only) */}
        {variant === 'pos' && (
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2 text-xs text-surface-600">
              <Timer className="h-3 w-3" />
              Returning to welcome in {timeLeft}s
            </div>
            <div className="h-1 rounded-full bg-surface-800 overflow-hidden">
              <div
                className="h-full bg-emerald-600/40 transition-all duration-1000"
                style={{ width: `${(timeLeft / autoTimeoutSeconds) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
