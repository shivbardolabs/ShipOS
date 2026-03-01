'use client';
/* eslint-disable */

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input, Textarea } from '@/components/ui/input';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import { SignaturePad } from '@/components/ui/signature-pad';
import { formatCurrency } from '@/lib/utils';
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  Package,
  FileText,
  XCircle,
  Truck,
  Calendar,
  AlertTriangle,
  Download,
  Upload,
  Clipboard,
  Loader2,
  PenLine,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface CarrierPickup {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  iconBg: string;
  packages: number;
  trackingNumbers: string[];
  totalWeight: number;
  totalWholesale: number;
  totalRetail: number;
  status: 'waiting' | 'picked_up' | 'no_packages';
  pickupTime?: string;
  manifestId?: string;
  pickupId?: string;
  driverName?: string;
  driverSignature?: boolean;
  carrierActions?: string[];
}

interface ManifestData {
  manifestId: string;
  carrier: string;
  date: string;
  generatedAt: string;
  generatedBy: string;
  summary: {
    totalPackages: number;
    totalWeight: number;
    totalWholesaleCost: number;
    totalRetailRevenue: number;
    totalProfit: number;
  };
  shipments: {
    seq: number;
    trackingNumber: string;
    service: string;
    destination: string;
    weight: number;
    dimensions: string;
    wholesaleCost: number;
    retailPrice: number;
    customer: string;
  }[];
  carrierManifestType: string;
}

/* -------------------------------------------------------------------------- */
/*  Carrier config                                                            */
/* -------------------------------------------------------------------------- */
function buildCarrierPickups(
  shipments: { carrier: string; status: string; trackingNumber?: string; weight?: number; wholesaleCost?: number; retailPrice?: number }[]
): CarrierPickup[] {
  const carrierConfig = [
    { id: 'ups', name: 'UPS', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', iconBg: 'bg-amber-100' },
    { id: 'fedex', name: 'FedEx', color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', iconBg: 'bg-indigo-100' },
    { id: 'usps', name: 'USPS', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-500/30', iconBg: 'bg-blue-100' },
    { id: 'dhl', name: 'DHL', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30', iconBg: 'bg-yellow-500/20' },
    { id: 'amazon', name: 'Amazon', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', iconBg: 'bg-orange-500/20' },
    { id: 'lasership', name: 'LaserShip', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', iconBg: 'bg-green-500/20' },
    { id: 'temu', name: 'Temu', color: 'text-orange-500', bgColor: 'bg-orange-600/10', borderColor: 'border-orange-600/30', iconBg: 'bg-orange-600/20' },
    { id: 'ontrac', name: 'OnTrac', color: 'text-blue-400', bgColor: 'bg-blue-600/10', borderColor: 'border-blue-600/30', iconBg: 'bg-blue-600/20' },
  ];

  return carrierConfig.map((cfg) => {
    const carrierShipments = shipments.filter(
      (s) => s.carrier === cfg.id && (s.status === 'label_created' || s.status === 'shipped')
    );
    const trackingNums = carrierShipments.map((s) => s.trackingNumber || 'N/A');
    const totalWeight = carrierShipments.reduce((sum, s) => sum + (s.weight || 0), 0);
    const totalWholesale = carrierShipments.reduce((sum, s) => sum + (s.wholesaleCost || 0), 0);
    const totalRetail = carrierShipments.reduce((sum, s) => sum + (s.retailPrice || 0), 0);

    return {
      ...cfg,
      packages: carrierShipments.length,
      trackingNumbers: trackingNums,
      totalWeight,
      totalWholesale,
      totalRetail,
      status: carrierShipments.length === 0 ? 'no_packages' : 'waiting',
    } as CarrierPickup;
  });
}

/* -------------------------------------------------------------------------- */
/*  End of Day Page                                                           */
/* -------------------------------------------------------------------------- */
export default function EndOfDayPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [carriers, setCarriers] = useState<CarrierPickup[]>([]);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [dayClosed, setDayClosed] = useState(false);

  // BAR-80: Manifest state
  const [showManifest, setShowManifest] = useState<string | null>(null);
  const [manifestData, setManifestData] = useState<ManifestData | null>(null);
  const [loadingManifest, setLoadingManifest] = useState(false);

  // BAR-79: Pickup workflow state
  const [showPickup, setShowPickup] = useState<string | null>(null);
  const [pickupDriverName, setPickupDriverName] = useState('');
  const [pickupDriverSignature, setPickupDriverSignature] = useState<string | null>(null);
  const [pickupNotes, setPickupNotes] = useState('');
  const [processingPickup, setProcessingPickup] = useState(false);
  const [pickupComplete, setPickupComplete] = useState(false);

  useEffect(() => {
    fetch('/api/shipments?limit=500')
      .then((r) => r.json())
      .then((d) => setShipments(d.shipments || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (shipments.length > 0) setCarriers(buildCarrierPickups(shipments));
  }, [shipments]);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const totalPending = carriers.filter((c) => c.status === 'waiting').length;
  const totalPickedUp = carriers.filter((c) => c.status === 'picked_up').length;
  const totalPackages = carriers.reduce((s, c) => s + c.packages, 0);
  const totalRevenue = carriers.reduce((s, c) => s + c.totalRetail, 0);
  const totalProfit = carriers.reduce((s, c) => s + (c.totalRetail - c.totalWholesale), 0);

  // BAR-80: Generate manifest for a carrier
  const handleGenerateManifest = useCallback(async (carrierId: string) => {
    setLoadingManifest(true);
    setManifestData(null);
    try {
      const res = await fetch('/api/end-of-day/manifest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carrier: carrierId }),
      });
      if (res.ok) {
        const data = await res.json();
        setManifestData(data);
      }
    } catch {
      console.error('Failed to generate manifest');
    } finally {
      setLoadingManifest(false);
    }
  }, []);

  // BAR-79: Process carrier pickup
  const handleProcessPickup = useCallback(async (carrierId: string) => {
    setProcessingPickup(true);
    try {
      const res = await fetch('/api/end-of-day/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrier: carrierId,
          driverName: pickupDriverName,
          driverSignature: pickupDriverSignature,
          notes: pickupNotes,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPickupComplete(true);
        // Update carrier status locally
        setCarriers((prev) =>
          prev.map((c) =>
            c.id === carrierId
              ? {
                  ...c,
                  status: 'picked_up' as const,
                  pickupTime: data.pickupTime,
                  pickupId: data.pickupId,
                  driverName: data.driverName,
                  driverSignature: !!data.driverSignature,
                  carrierActions: data.carrierActions,
                }
              : c
          )
        );
      }
    } catch {
      console.error('Failed to process pickup');
    } finally {
      setProcessingPickup(false);
    }
  }, [pickupDriverName, pickupDriverSignature, pickupNotes]);

  const handleResetDay = () => {
    setCarriers(buildCarrierPickups(shipments));
    setDayClosed(false);
  };

  const handleCloseDay = () => {
    setDayClosed(true);
    setShowCloseConfirm(false);
  };

  // Open pickup workflow
  const openPickup = (carrierId: string) => {
    setPickupDriverName('');
    setPickupDriverSignature(null);
    setPickupNotes('');
    setPickupComplete(false);
    setShowPickup(carrierId);
  };

  // Open manifest view
  const openManifest = (carrierId: string) => {
    setShowManifest(carrierId);
    handleGenerateManifest(carrierId);
  };

  const pickupCarrier = carriers.find((c) => c.id === showPickup);
  const manifestCarrier = carriers.find((c) => c.id === showManifest);

  return (
    <div className="space-y-6">
      <PageHeader
        title="End of Day"
        description="Close out the day — process carrier pickups, generate manifests, and finalize shipping."
        actions={
          <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={handleResetDay}>
            Reset Day
          </Button>
        }
      />

      {/* Day Summary Card */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider">Shipping Day</p>
              <p className="text-xl font-bold text-surface-100">{todayStr}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center px-4">
              <p className="text-2xl font-bold text-surface-100">{totalPackages}</p>
              <p className="text-xs text-surface-500">Total Packages</p>
            </div>
            <div className="h-8 w-px bg-surface-700" />
            <div className="text-center px-4">
              <p className="text-2xl font-bold text-emerald-600">{totalPickedUp}</p>
              <p className="text-xs text-surface-500">Picked Up</p>
            </div>
            <div className="h-8 w-px bg-surface-700" />
            <div className="text-center px-4">
              <p className="text-2xl font-bold text-yellow-400">{totalPending}</p>
              <p className="text-xs text-surface-500">Pending</p>
            </div>
            <div className="h-8 w-px bg-surface-700" />
            <div className="text-center px-4">
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-surface-500">Revenue</p>
            </div>
          </div>
        </div>
      </Card>

      {dayClosed && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-emerald-300">Day Closed Successfully</p>
            <p className="text-xs text-emerald-600/70">
              All carrier pickups have been processed for {todayStr}
            </p>
          </div>
        </div>
      )}

      {/* Carrier Pickup Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {carriers.map((carrier) => (
          <Card
            key={carrier.id}
            className={`relative overflow-hidden ${
              carrier.status === 'picked_up' ? 'ring-1 ring-emerald-500/30' : ''
            }`}
          >
            {/* Top accent bar */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 ${
                carrier.status === 'picked_up'
                  ? 'bg-emerald-500'
                  : carrier.status === 'waiting'
                  ? 'bg-yellow-500'
                  : 'bg-surface-700'
              }`}
            />

            <div className="pt-2">
              {/* Carrier Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${carrier.iconBg}`}>
                    <CarrierLogo carrier={carrier.id} size={24} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${carrier.color}`}>{carrier.name}</h3>
                    <p className="text-xs text-surface-500">
                      {carrier.packages} package{carrier.packages !== 1 ? 's' : ''}
                      {carrier.totalWeight > 0 && ` · ${carrier.totalWeight.toFixed(1)} lbs`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Revenue mini-stat */}
              {carrier.packages > 0 && (
                <div className="flex items-center gap-4 mb-3 px-2 py-1.5 rounded-lg bg-surface-800/30">
                  <div>
                    <p className="text-[10px] text-surface-500">Revenue</p>
                    <p className="text-xs font-semibold text-surface-200">{formatCurrency(carrier.totalRetail)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-surface-500">Profit</p>
                    <p className="text-xs font-semibold text-emerald-400">
                      {formatCurrency(carrier.totalRetail - carrier.totalWholesale)}
                    </p>
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="mb-4">
                {carrier.status === 'picked_up' && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-medium text-emerald-300">Picked Up</p>
                      <p className="text-[10px] text-emerald-600/70">
                        {carrier.pickupTime}
                        {carrier.driverName && ` · ${carrier.driverName}`}
                      </p>
                    </div>
                  </div>
                )}
                {carrier.status === 'waiting' && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <Clock className="h-4 w-4 text-yellow-400" />
                    <p className="text-xs font-medium text-yellow-300">Waiting for Pickup</p>
                  </div>
                )}
                {carrier.status === 'no_packages' && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-800/50 border border-surface-700/50">
                    <XCircle className="h-4 w-4 text-surface-500" />
                    <p className="text-xs text-surface-500">No packages</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {carrier.status === 'waiting' && (
                  <>
                    <Button
                      size="sm"
                      fullWidth
                      onClick={() => openPickup(carrier.id)}
                      leftIcon={<Truck className="h-3.5 w-3.5" />}
                    >
                      Process Pickup
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onClick={() => openManifest(carrier.id)}
                      leftIcon={<FileText className="h-3.5 w-3.5" />}
                    >
                      Generate Manifest
                    </Button>
                  </>
                )}
                {carrier.status === 'picked_up' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => openManifest(carrier.id)}
                    leftIcon={<FileText className="h-3.5 w-3.5" />}
                  >
                    View Manifest
                  </Button>
                )}
                {carrier.status === 'no_packages' && (
                  <Button variant="ghost" size="sm" fullWidth disabled>
                    No Action Needed
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Close Day Button */}
      {!dayClosed && (
        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            className="px-12 py-3 text-base"
            onClick={() => setShowCloseConfirm(true)}
            leftIcon={<CheckCircle2 className="h-5 w-5" />}
            disabled={totalPending > 0 && totalPickedUp === 0}
          >
            Close Shipping Day
          </Button>
        </div>
      )}

      {/* ── BAR-79: Carrier Pickup Workflow Modal ─────────────────────────── */}
      <Modal
        open={!!showPickup}
        onClose={() => { setShowPickup(null); setPickupComplete(false); }}
        title={pickupComplete ? 'Pickup Complete' : `${pickupCarrier?.name || ''} Carrier Pickup`}
        description={pickupComplete ? 'Pickup has been processed successfully' : 'Record carrier pickup details'}
        size="lg"
        footer={
          pickupComplete ? (
            <Button onClick={() => { setShowPickup(null); setPickupComplete(false); }}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setShowPickup(null)}>Cancel</Button>
              <Button
                onClick={() => showPickup && handleProcessPickup(showPickup)}
                disabled={processingPickup}
                leftIcon={processingPickup ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              >
                {processingPickup ? 'Processing...' : 'Confirm Pickup'}
              </Button>
            </>
          )
        }
      >
        {pickupCarrier && !pickupComplete && (
          <div className="space-y-5">
            {/* Pickup summary */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-surface-800/50 border border-surface-700/50">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${pickupCarrier.iconBg}`}>
                <CarrierLogo carrier={pickupCarrier.id} size={28} />
              </div>
              <div className="flex-1">
                <h4 className={`text-sm font-bold ${pickupCarrier.color}`}>{pickupCarrier.name}</h4>
                <p className="text-xs text-surface-400">
                  {pickupCarrier.packages} packages · {pickupCarrier.totalWeight.toFixed(1)} lbs
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-surface-100">{formatCurrency(pickupCarrier.totalRetail)}</p>
                <p className="text-xs text-surface-500">Revenue</p>
              </div>
            </div>

            {/* What happens on pickup */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <h4 className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-2">
                On Pickup Completion
              </h4>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2 text-xs text-surface-300">
                  <CheckCircle2 className="h-3 w-3 text-blue-400 flex-shrink-0" />
                  All {pickupCarrier.name} shipments marked as shipped
                </li>
                <li className="flex items-center gap-2 text-xs text-surface-300">
                  <Upload className="h-3 w-3 text-blue-400 flex-shrink-0" />
                  Shipment data uploaded to {pickupCarrier.name} servers
                </li>
                <li className="flex items-center gap-2 text-xs text-surface-300">
                  <FileText className="h-3 w-3 text-blue-400 flex-shrink-0" />
                  Carrier manifest generated and closed
                </li>
                <li className="flex items-center gap-2 text-xs text-surface-300">
                  <Calendar className="h-3 w-3 text-blue-400 flex-shrink-0" />
                  Shipping day rolled forward
                </li>
              </ul>
            </div>

            {/* Driver info */}
            <div className="space-y-3">
              <h4 className="text-xs text-surface-500 uppercase tracking-wider">Driver Information</h4>
              <Input
                label="Driver Name (optional)"
                placeholder="Enter driver name"
                value={pickupDriverName}
                onChange={(e) => setPickupDriverName(e.target.value)}
              />
              <Textarea
                label="Notes (optional)"
                placeholder="Add any pickup notes..."
                rows={2}
                value={pickupNotes}
                onChange={(e) => setPickupNotes(e.target.value)}
              />
            </div>

            {/* Driver signature */}
            <div className="space-y-2">
              <h4 className="text-xs text-surface-500 uppercase tracking-wider">Driver Signature (optional)</h4>
              <SignaturePad
                onSignatureChange={(sig) => setPickupDriverSignature(sig)}
                width={480}
                height={120}
              />
            </div>

            {/* Tracking numbers preview */}
            <div className="space-y-2">
              <h4 className="text-xs text-surface-500 uppercase tracking-wider">
                Tracking Numbers ({pickupCarrier.trackingNumbers.length})
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {pickupCarrier.trackingNumbers.map((tn, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/30 border border-surface-700/30"
                  >
                    <Package className="h-3 w-3 text-surface-500" />
                    <span className="font-mono text-xs text-surface-300">{tn}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pickup complete state */}
        {pickupComplete && pickupCarrier && (
          <div className="space-y-5">
            <div className="flex flex-col items-center text-center py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-surface-100 mb-1">
                {pickupCarrier.name} Pickup Processed
              </h3>
              <p className="text-sm text-surface-400">
                {pickupCarrier.packages} packages marked as shipped
              </p>
            </div>

            {/* Carrier actions taken */}
            {pickupCarrier.carrierActions && pickupCarrier.carrierActions.length > 0 && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-500/20">
                <h4 className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-2">
                  Actions Completed
                </h4>
                <ul className="space-y-1.5">
                  {pickupCarrier.carrierActions.map((action, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-surface-300">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {pickupCarrier.pickupId && (
              <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <p className="text-xs text-surface-500 mb-1">Pickup ID</p>
                <p className="font-mono text-sm text-primary-600">{pickupCarrier.pickupId}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── BAR-80: Manifest Generation Modal ─────────────────────────────── */}
      <Modal
        open={!!showManifest}
        onClose={() => { setShowManifest(null); setManifestData(null); }}
        title={`${manifestCarrier?.name || ''} Manifest`}
        description={manifestData?.manifestId || 'Generating manifest...'}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowManifest(null); setManifestData(null); }}>
              Close
            </Button>
            {manifestData && (
              <Button
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => {
                  // Download manifest as JSON
                  const blob = new Blob([JSON.stringify(manifestData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${manifestData.manifestId}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download Manifest
              </Button>
            )}
          </>
        }
      >
        {loadingManifest && (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="h-8 w-8 text-primary-600 animate-spin mb-3" />
            <p className="text-sm text-surface-400">Generating carrier manifest...</p>
          </div>
        )}

        {manifestData && (
          <div className="space-y-5">
            {/* Manifest header */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <p className="text-xs text-surface-500 mb-1">Total Packages</p>
                <p className="text-lg font-bold text-surface-100">{manifestData.summary.totalPackages}</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <p className="text-xs text-surface-500 mb-1">Total Weight</p>
                <p className="text-lg font-bold text-surface-100">{manifestData.summary.totalWeight} lbs</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <p className="text-xs text-surface-500 mb-1">Revenue / Profit</p>
                <p className="text-lg font-bold text-surface-100">
                  {formatCurrency(manifestData.summary.totalRetailRevenue)}{' '}
                  <span className="text-xs text-emerald-400">
                    (+{formatCurrency(manifestData.summary.totalProfit)})
                  </span>
                </p>
              </div>
            </div>

            {/* Manifest type badge */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <ShieldCheck className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-xs font-medium text-blue-300">Carrier Manifest Type</p>
                <p className="text-xs text-surface-400">{manifestData.carrierManifestType}</p>
              </div>
            </div>

            {/* Shipment table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-700/50">
                    <th className="px-2 py-2 text-left text-xs font-medium text-surface-500">#</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-surface-500">Tracking</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-surface-500">Service</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-surface-500">Destination</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-surface-500">Weight</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-surface-500">Customer</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-surface-500">Cost</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-surface-500">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/50">
                  {manifestData.shipments.map((s) => (
                    <tr key={s.seq} className="hover:bg-surface-800/30">
                      <td className="px-2 py-2 text-xs text-surface-500">{s.seq}</td>
                      <td className="px-2 py-2 font-mono text-xs text-primary-600">{s.trackingNumber}</td>
                      <td className="px-2 py-2 text-xs text-surface-300">{s.service}</td>
                      <td className="px-2 py-2 text-xs text-surface-300">{s.destination}</td>
                      <td className="px-2 py-2 text-xs text-surface-300">{s.weight} lbs</td>
                      <td className="px-2 py-2 text-xs text-surface-300">{s.customer}</td>
                      <td className="px-2 py-2 text-xs text-surface-400 text-right">{formatCurrency(s.wholesaleCost)}</td>
                      <td className="px-2 py-2 text-xs text-surface-200 text-right font-medium">{formatCurrency(s.retailPrice)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-surface-600">
                    <td colSpan={6} className="px-2 py-2 text-xs font-medium text-surface-300">Totals</td>
                    <td className="px-2 py-2 text-xs font-medium text-surface-400 text-right">
                      {formatCurrency(manifestData.summary.totalWholesaleCost)}
                    </td>
                    <td className="px-2 py-2 text-xs font-bold text-surface-100 text-right">
                      {formatCurrency(manifestData.summary.totalRetailRevenue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <p className="text-xs text-surface-500 mb-1">Manifest ID</p>
                <p className="font-mono text-sm text-primary-600">{manifestData.manifestId}</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <p className="text-xs text-surface-500 mb-1">Generated</p>
                <p className="text-sm text-surface-200">{new Date(manifestData.generatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Close Day Confirmation Modal ──────────────────────────────────── */}
      <Modal
        open={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        title="Close Shipping Day"
        description="Review before closing."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCloseConfirm(false)}>Cancel</Button>
            <Button onClick={handleCloseDay} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
              Confirm & Close Day
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {totalPending > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
              <p className="text-sm text-yellow-300">
                {totalPending} carrier{totalPending > 1 ? 's' : ''} still waiting for pickup
              </p>
            </div>
          )}

          <p className="text-sm text-surface-300">
            Are you sure you want to close the shipping day for <span className="text-surface-100 font-medium">{todayStr}</span>?
          </p>

          {/* Day P&L summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50 text-center">
              <p className="text-xs text-surface-500">Revenue</p>
              <p className="text-sm font-bold text-surface-100">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50 text-center">
              <p className="text-xs text-surface-500">Costs</p>
              <p className="text-sm font-bold text-surface-300">{formatCurrency(totalRevenue - totalProfit)}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-500/20 text-center">
              <p className="text-xs text-surface-500">Profit</p>
              <p className="text-sm font-bold text-emerald-400">{formatCurrency(totalProfit)}</p>
            </div>
          </div>

          <div className="space-y-2">
            {carriers
              .filter((c) => c.status !== 'no_packages')
              .map((carrier) => (
                <div
                  key={carrier.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-800/50 border border-surface-700/50"
                >
                  <div className="flex items-center gap-3">
                    <CarrierLogo carrier={carrier.id} size={18} />
                    <span className="text-sm text-surface-200 font-medium">{carrier.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-surface-400">
                      {carrier.packages} pkg{carrier.packages !== 1 ? 's' : ''}
                    </span>
                    <Badge
                      variant={carrier.status === 'picked_up' ? 'success' : 'warning'}
                      dot
                    >
                      {carrier.status === 'picked_up' ? 'Picked Up' : 'Waiting'}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
