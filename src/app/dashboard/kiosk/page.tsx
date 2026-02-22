'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { customers, packages } from '@/lib/mock-data';
import type { Customer, Package as PackageType } from '@/lib/types';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import {
  Package,
  PackageCheck,
  Send,
  MailOpen,
  UserPlus,
  ArrowLeft,
  Delete,
  CornerDownLeft,
  CheckCircle2,
  ScanLine,
  Truck,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
type KioskScreen =
  | 'home'
  /* Pick-up flow */
  | 'pickup-keypad'
  | 'pickup-packages'
  | 'pickup-success'
  /* Drop-off flow */
  | 'dropoff-scan'
  | 'dropoff-carrier'
  | 'dropoff-success';

/* -------------------------------------------------------------------------- */
/*  Carrier options for drop-off                                              */
/* -------------------------------------------------------------------------- */
const carriers = [
  { id: 'amazon', label: 'Amazon', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { id: 'ups', label: 'UPS', color: 'bg-amber-100 text-amber-600 border-amber-200' },
  { id: 'fedex', label: 'FedEx', color: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
  { id: 'usps', label: 'USPS', color: 'bg-blue-100 text-blue-600 border-blue-500/30' },
  { id: 'dhl', label: 'DHL', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { id: 'lasership', label: 'LaserShip', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { id: 'temu', label: 'Temu', color: 'bg-orange-600/20 text-orange-500 border-orange-600/30' },
  { id: 'ontrac', label: 'OnTrac', color: 'bg-blue-600/20 text-blue-300 border-blue-600/30' },
  { id: 'other', label: 'Other', color: 'bg-surface-600/30 text-surface-400 border-surface-600/40' },
];

/* -------------------------------------------------------------------------- */
/*  Carrier labels for package display                                        */
/* -------------------------------------------------------------------------- */
const carrierLabels: Record<string, string> = {
  ups: 'UPS', fedex: 'FedEx', usps: 'USPS', amazon: 'Amazon', dhl: 'DHL',
};

/* -------------------------------------------------------------------------- */
/*  Package type labels                                                       */
/* -------------------------------------------------------------------------- */
const pkgTypeLabels: Record<string, string> = {
  letter: 'Letter', pack: 'Pack', small: 'Small', medium: 'Medium', large: 'Large', xlarge: 'Extra Large',
};

/* -------------------------------------------------------------------------- */
/*  Main Kiosk Component                                                      */
/* -------------------------------------------------------------------------- */
export default function KioskPage() {
  const [screen, setScreen] = useState<KioskScreen>('home');

  /* ---- Pick-up state ---- */
  const [pmbDigits, setPmbDigits] = useState('');
  const [pickupCustomer, setPickupCustomer] = useState<Customer | null>(null);
  const [pickupPackages, setPickupPackages] = useState<PackageType[]>([]);
  const [pickupError, setPickupError] = useState('');

  /* ---- Drop-off state ---- */
  const [trackingInput, setTrackingInput] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [, setDropoffEmail] = useState('');

  /* ---- Auto-return timer ---- */
  useEffect(() => {
    if (screen === 'pickup-success' || screen === 'dropoff-success') {
      const timer = setTimeout(() => resetToHome(), 5000);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  /* ---- Reset ---- */
  const resetToHome = () => {
    setScreen('home');
    setPmbDigits('');
    setPickupCustomer(null);
    setPickupPackages([]);
    setPickupError('');
    setTrackingInput('');
    setSelectedCarrier('');
    setDropoffEmail('');
  };

  /* ---- Keypad handler ---- */
  const handleKeypadPress = (key: string) => {
    setPickupError('');
    if (key === 'clear') {
      setPmbDigits('');
    } else if (key === 'back') {
      setPmbDigits((prev) => prev.slice(0, -1));
    } else if (key === 'enter') {
      handlePmbLookup();
    } else {
      if (pmbDigits.length < 6) {
        setPmbDigits((prev) => prev + key);
      }
    }
  };

  /* ---- PMB lookup ---- */
  const handlePmbLookup = () => {
    if (!pmbDigits.trim()) {
      setPickupError('Please enter your PMB number');
      return;
    }

    const q = pmbDigits.trim().toUpperCase();
    const customer = customers.find((c) => {
      const digits = c.pmbNumber.replace(/[^0-9]/g, '');
      return digits === q || digits === q.padStart(4, '0');
    });

    if (!customer) {
      setPickupError('PMB not found. Please try again or ask staff for help.');
      return;
    }

    const pkgs = packages.filter(
      (p) => p.customerId === customer.id && p.status !== 'released' && p.status !== 'returned'
    );

    setPickupCustomer(customer);
    setPickupPackages(pkgs);
    setScreen('pickup-packages');
  };

  /* ---- Collect all ---- */
  const handleCollectAll = () => {
    setScreen('pickup-success');
  };

  /* ---- Drop-off confirm ---- */
  const handleDropoffCarrierSelect = (carrierId: string) => {
    setSelectedCarrier(carrierId);
    setScreen('dropoff-success');
  };

  /* ============================================================================ */
  /*  Render helpers                                                              */
  /* ============================================================================ */

  /* ---- Header bar (for sub-screens) ---- */
  const SubHeader = ({ title }: { title: string }) => (
    <div className="flex items-center gap-4 mb-8">
      <button
        onClick={resetToHome}
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-800/80 text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors"
      >
        <ArrowLeft className="h-6 w-6" />
      </button>
      <h2 className="text-2xl font-bold text-surface-100">{title}</h2>
    </div>
  );

  /* ============================================================================ */
  /*  Screen: Home                                                                */
  /* ============================================================================ */
  if (screen === 'home') {
    return (
      <KioskShell>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-48px)] px-6">
          {/* Logo */}
          <div className="mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shipos-logo-mark.svg" alt="ShipOS" className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-4xl text-surface-100 text-center">
              <span className="font-serif italic font-light">Welcome to </span>
              <span className="font-bold">ShipOS</span>
            </h1>
            <p className="text-surface-400 text-lg text-center mt-2">What would you like to do?</p>
          </div>

          {/* 2x2 tile grid */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-xl">
            <KioskTile
              icon={<Package className="h-10 w-10" />}
              label="Pick Up Packages"
              sublabel="Enter your PMB to collect"
              color="emerald"
              onClick={() => setScreen('pickup-keypad')}
            />
            <KioskTile
              icon={<Send className="h-10 w-10" />}
              label="Drop Off Package"
              sublabel="Leave a package for shipping"
              color="blue"
              onClick={() => setScreen('dropoff-scan')}
            />
            <KioskTile
              icon={<MailOpen className="h-10 w-10" />}
              label="Check Mailbox"
              sublabel="See what's in your box"
              color="cyan"
              onClick={() => {}}
            />
            <KioskTile
              icon={<UserPlus className="h-10 w-10" />}
              label="New Mailbox"
              sublabel="Sign up for a PMB"
              color="indigo"
              onClick={() => {}}
            />
          </div>

          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-surface-500 text-sm">Need help? Ask a staff member</p>
            <div className="flex items-center justify-center gap-3 mt-3">
              <button className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors px-2 py-1 rounded">EN</button>
              <span className="text-surface-700">|</span>
              <button className="text-xs font-semibold text-surface-500 hover:text-surface-300 transition-colors px-2 py-1 rounded">ES</button>
            </div>
          </div>
        </div>
      </KioskShell>
    );
  }

  /* ============================================================================ */
  /*  Screen: Pick-Up → Keypad                                                    */
  /* ============================================================================ */
  if (screen === 'pickup-keypad') {
    return (
      <KioskShell>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-48px)] px-6">
          <SubHeader title="Pick Up Packages" />

          <div className="w-full max-w-sm mx-auto">
            <h2 className="text-2xl font-bold text-surface-100 text-center mb-2">Enter your PMB number</h2>
            <p className="text-surface-400 text-center mb-8">Use the keypad below</p>

            {/* PMB display */}
            <div className="mb-6">
              <div className="flex items-center justify-center gap-1 mb-2">
                <span className="text-surface-500 text-lg font-mono">PMB-</span>
                <div className="flex items-center justify-center min-w-[160px] h-16 rounded-xl border-2 border-surface-700 bg-surface-900/80 px-4">
                  <span className="text-3xl font-mono font-bold text-surface-100 tracking-[0.25em]">
                    {pmbDigits || <span className="text-surface-600">____</span>}
                  </span>
                </div>
              </div>
              {pickupError && (
                <p className="text-sm text-red-600 text-center mt-2">{pickupError}</p>
              )}
            </div>

            {/* Keypad — 3x4 grid + actions */}
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
                <KeypadButton key={key} onClick={() => handleKeypadPress(key)}>
                  {key}
                </KeypadButton>
              ))}
              <KeypadButton variant="action" onClick={() => handleKeypadPress('clear')}>
                <span className="text-xs font-semibold">CLEAR</span>
              </KeypadButton>
              <KeypadButton onClick={() => handleKeypadPress('0')}>0</KeypadButton>
              <KeypadButton variant="action" onClick={() => handleKeypadPress('back')}>
                <Delete className="h-5 w-5" />
              </KeypadButton>
            </div>

            {/* Enter button */}
            <button
              onClick={() => handleKeypadPress('enter')}
              disabled={!pmbDigits}
              className={cn(
                'mt-4 w-full max-w-xs mx-auto flex items-center justify-center gap-2 py-4 rounded-xl text-lg font-bold transition-all',
                pmbDigits
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 shadow-lg shadow-emerald-900/30'
                  : 'bg-surface-800 text-surface-600 cursor-not-allowed'
              )}
            >
              <CornerDownLeft className="h-5 w-5" />
              Look Up
            </button>
          </div>
        </div>
      </KioskShell>
    );
  }

  /* ============================================================================ */
  /*  Screen: Pick-Up → Packages List                                             */
  /* ============================================================================ */
  if (screen === 'pickup-packages') {
    return (
      <KioskShell>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-48px)] px-6">
          <SubHeader title="Your Packages" />

          <div className="w-full max-w-lg mx-auto text-center">
            {/* Greeting */}
            <div className="mb-8">
              <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-primary-50 mb-4">
                <span className="text-2xl font-bold text-primary-300">
                  {pickupCustomer?.firstName[0]}{pickupCustomer?.lastName[0]}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-surface-100 mb-1">
                Hi {pickupCustomer?.firstName}!
              </h2>
              <p className="text-lg text-surface-400">
                You have <span className="text-surface-100 font-bold">{pickupPackages.length}</span> package{pickupPackages.length !== 1 ? 's' : ''} ready
              </p>
            </div>

            {/* Package list */}
            {pickupPackages.length > 0 ? (
              <>
                <div className="space-y-2 mb-8 text-left">
                  {pickupPackages.map((pkg) => (
                    <div key={pkg.id} className="flex items-center gap-4 p-4 rounded-xl bg-surface-800/50 border border-surface-700">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-100">
                          {carrierLabels[pkg.carrier.toLowerCase()] || pkg.carrier} — {pkgTypeLabels[pkg.packageType]}
                        </p>
                        <p className="text-xs text-surface-500 font-mono truncate">{pkg.trackingNumber}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleCollectAll}
                  className="w-full py-5 rounded-2xl bg-emerald-600 text-white text-xl font-bold hover:bg-emerald-500 active:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/30"
                >
                  <div className="flex items-center justify-center gap-3">
                    <PackageCheck className="h-6 w-6" />
                    Collect All Packages
                  </div>
                </button>
                <p className="text-sm text-surface-500 mt-4">A staff member will bring your packages shortly</p>
              </>
            ) : (
              <div className="py-12">
                <Package className="mx-auto h-12 w-12 text-surface-600 mb-4" />
                <p className="text-surface-400 text-lg">No packages waiting for you right now</p>
                <button
                  onClick={resetToHome}
                  className="mt-6 px-8 py-3 rounded-xl bg-surface-800 text-surface-300 hover:bg-surface-700 transition-colors"
                >
                  Back to Home
                </button>
              </div>
            )}
          </div>
        </div>
      </KioskShell>
    );
  }

  /* ============================================================================ */
  /*  Screen: Pick-Up → Success                                                   */
  /* ============================================================================ */
  if (screen === 'pickup-success') {
    return (
      <KioskShell>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-48px)] px-6">
          <SuccessScreen
            title="Thank you!"
            message="Your packages are being prepared."
            sublabel={`${pickupPackages.length} package${pickupPackages.length !== 1 ? 's' : ''} for ${pickupCustomer?.firstName} ${pickupCustomer?.lastName}`}
          />
        </div>
      </KioskShell>
    );
  }

  /* ============================================================================ */
  /*  Screen: Drop-Off → Scan/Enter Tracking                                      */
  /* ============================================================================ */
  if (screen === 'dropoff-scan') {
    return (
      <KioskShell>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-48px)] px-6">
          <SubHeader title="Drop Off Package" />

          <div className="w-full max-w-md mx-auto text-center">
            <h2 className="text-2xl font-bold text-surface-100 mb-2">Scan your package&apos;s tracking number</h2>
            <p className="text-surface-400 mb-8">Place barcode in front of scanner, or enter manually below</p>

            {/* Scan placeholder */}
            <button className="w-full py-12 rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50/60 hover:bg-primary-50 transition-colors mb-6">
              <ScanLine className="h-12 w-12 text-primary-600 mx-auto mb-3" />
              <p className="text-primary-600 font-semibold">Tap to Scan Barcode</p>
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-surface-700" />
              <span className="text-xs text-surface-500 uppercase tracking-wider">or enter manually</span>
              <div className="flex-1 h-px bg-surface-700" />
            </div>

            {/* Manual input */}
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter tracking number"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                className="flex-1 rounded-xl border-2 border-surface-700 bg-surface-900 px-4 py-4 text-lg text-surface-100 placeholder:text-surface-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 outline-none transition-colors"
              />
              <button
                onClick={() => trackingInput && setScreen('dropoff-carrier')}
                disabled={!trackingInput}
                className={cn(
                  'px-6 rounded-xl text-lg font-bold transition-all',
                  trackingInput
                    ? 'bg-primary-600 text-white hover:bg-primary-500'
                    : 'bg-surface-800 text-surface-600 cursor-not-allowed'
                )}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </KioskShell>
    );
  }

  /* ============================================================================ */
  /*  Screen: Drop-Off → Select Carrier                                           */
  /* ============================================================================ */
  if (screen === 'dropoff-carrier') {
    return (
      <KioskShell>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-48px)] px-6">
          <SubHeader title="Drop Off Package" />

          <div className="w-full max-w-lg mx-auto text-center">
            <h2 className="text-2xl font-bold text-surface-100 mb-2">Select Carrier</h2>
            <p className="text-surface-400 mb-8">Which carrier is this package for?</p>

            {/* Tracking number display */}
            <div className="mb-8 px-4 py-3 rounded-xl bg-surface-800/50 border border-surface-700 inline-flex items-center gap-2">
              <Truck className="h-4 w-4 text-surface-500" />
              <span className="text-sm font-mono text-surface-300">{trackingInput}</span>
            </div>

            {/* Carrier grid — 3x2 */}
            <div className="grid grid-cols-3 gap-3">
              {carriers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleDropoffCarrierSelect(c.id)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 transition-all',
                    'border-surface-700 bg-surface-800/30 hover:border-primary-300 hover:bg-primary-50/60 active:scale-95'
                  )}
                >
                  <CarrierLogo carrier={c.id} size={36} />
                  <span className="text-sm font-semibold text-surface-100">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </KioskShell>
    );
  }

  /* ============================================================================ */
  /*  Screen: Drop-Off → Success                                                  */
  /* ============================================================================ */
  if (screen === 'dropoff-success') {
    const carrierName = carriers.find((c) => c.id === selectedCarrier)?.label || selectedCarrier;
    return (
      <KioskShell>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-48px)] px-6">
          <SuccessScreen
            title="Drop off confirmed!"
            message={`Your ${carrierName} package has been received.`}
            sublabel={`Tracking: ${trackingInput}`}
          />
        </div>
      </KioskShell>
    );
  }

  /* Fallback */
  return null;
}

/* ============================================================================ */
/*  Kiosk Shell — full-screen dark container                                    */
/* ============================================================================ */
function KioskShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-white overflow-auto">
      {children}
    </div>
  );
}

/* ============================================================================ */
/*  Kiosk Tile — home screen nav buttons                                        */
/* ============================================================================ */
const tileColors: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  emerald: {
    bg: 'hover:bg-emerald-500/5 active:bg-emerald-50',
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    text: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
  },
  blue: {
    bg: 'hover:bg-blue-500/5 active:bg-blue-50',
    border: 'border-blue-500/20 hover:border-blue-500/40',
    text: 'text-blue-600',
    iconBg: 'bg-blue-50',
  },
  cyan: {
    bg: 'hover:bg-cyan-500/5 active:bg-cyan-500/10',
    border: 'border-cyan-500/20 hover:border-cyan-500/40',
    text: 'text-cyan-600',
    iconBg: 'bg-cyan-500/15',
  },
  indigo: {
    bg: 'hover:bg-indigo-50/60 active:bg-indigo-50',
    border: 'border-indigo-100 hover:border-indigo-300',
    text: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
  },
};

function KioskTile({
  icon,
  label,
  sublabel,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  color: string;
  onClick: () => void;
}) {
  const c = tileColors[color] || tileColors.emerald;
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all duration-150 min-h-[180px]',
        'bg-surface-800/20',
        c.border,
        c.bg,
        'active:scale-[0.97]'
      )}
    >
      <div className={cn('flex h-16 w-16 items-center justify-center rounded-2xl', c.iconBg, c.text)}>
        {icon}
      </div>
      <div>
        <p className="text-base font-bold text-surface-100">{label}</p>
        <p className="text-xs text-surface-400 mt-0.5">{sublabel}</p>
      </div>
    </button>
  );
}

/* ============================================================================ */
/*  Keypad Button                                                               */
/* ============================================================================ */
function KeypadButton({
  children,
  onClick,
  variant = 'digit',
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'digit' | 'action';
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center h-16 rounded-xl text-xl font-bold transition-all active:scale-95',
        variant === 'digit'
          ? 'bg-surface-800/60 text-surface-100 hover:bg-surface-700 border border-surface-700/50'
          : 'bg-surface-800/30 text-surface-400 hover:bg-surface-700/50 hover:text-surface-100 border border-surface-700/30'
      )}
    >
      {children}
    </button>
  );
}

/* ============================================================================ */
/*  Success Screen                                                              */
/* ============================================================================ */
function SuccessScreen({
  title,
  message,
  sublabel,
}: {
  title: string;
  message: string;
  sublabel: string;
}) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const t = setInterval(() => setCountdown((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="text-center max-w-md mx-auto animate-in fade-in-0 zoom-in-95 duration-300">
      {/* Animated checkmark */}
      <div className="relative mx-auto mb-8">
        <div className="flex h-28 w-28 mx-auto items-center justify-center rounded-full bg-emerald-50 ring-4 ring-emerald-500/10">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/25">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>
        </div>
        <div className="absolute -inset-4 rounded-full bg-emerald-500/5 animate-pulse" />
      </div>

      <h2 className="text-3xl font-bold text-surface-100 mb-2">{title}</h2>
      <p className="text-lg text-surface-300 mb-2">{message}</p>
      <p className="text-sm text-surface-500">{sublabel}</p>
      <p className="text-xs text-surface-600 mt-8">Returning to home in {countdown}s…</p>
    </div>
  );
}
