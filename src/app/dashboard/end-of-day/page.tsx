'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect} from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  Package,
  FileText,
  XCircle,
  Truck,
  Calendar,
  AlertTriangle } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Carrier config & computed data                                            */
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
  status: 'waiting' | 'picked_up' | 'no_packages';
  pickupTime?: string;
  manifestId?: string;
}

function buildCarrierPickups(): CarrierPickup[] {
  const carrierConfig: { id: string; name: string; color: string; bgColor: string; borderColor: string; iconBg: string }[] = [
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

    return {
      ...cfg,
      packages: carrierShipments.length,
      trackingNumbers: trackingNums,
      status: carrierShipments.length === 0 ? 'no_packages' : 'waiting' };
  });
}

/* -------------------------------------------------------------------------- */
/*  End of Day Page                                                           */
/* -------------------------------------------------------------------------- */
export default function EndOfDayPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [shipments, setShipments] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
    fetch('/api/shipments?limit=500').then(r => r.json()).then(d => setShipments(d.shipments || [])),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [carriers, setCarriers] = useState<CarrierPickup[]>(buildCarrierPickups);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showManifest, setShowManifest] = useState<string | null>(null);
  const [dayClosed, setDayClosed] = useState(false);

  const todayStr = new Date('2026-02-21').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric' });

  const totalPending = carriers.filter((c) => c.status === 'waiting').length;
  const totalPickedUp = carriers.filter((c) => c.status === 'picked_up').length;
  const totalPackages = carriers.reduce((s, c) => s + c.packages, 0);

  const handleMarkPickedUp = (carrierId: string) => {
    setCarriers((prev) =>
      prev.map((c) =>
        c.id === carrierId
          ? {
              ...c,
              status: 'picked_up' as const,
              pickupTime: new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit' }),
              manifestId: `MFT-${carrierId.toUpperCase()}-${Date.now().toString(36).toUpperCase()}` }
          : c
      )
    );
  };

  const handleResetDay = () => {
    setCarriers(buildCarrierPickups());
    setDayClosed(false);
  };

  const handleCloseDay = () => {
    setDayClosed(true);
    setShowCloseConfirm(false);
  };

  const manifestCarrier = carriers.find((c) => c.id === showManifest);

  return (
    <div className="space-y-6">
      <PageHeader
        title="End of Day"
        description="Manage carrier pickups and close the shipping day"
        actions={
          <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={handleResetDay}>
            Reset Day
          </Button>
        }
      />

      {/* Current Day Display */}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${carrier.iconBg}`}>
                    <CarrierLogo carrier={carrier.id} size={24} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${carrier.color}`}>{carrier.name}</h3>
                    <p className="text-xs text-surface-500">
                      {carrier.packages} package{carrier.packages !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="mb-4">
                {carrier.status === 'picked_up' && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-medium text-emerald-300">Picked Up</p>
                      <p className="text-[10px] text-emerald-600/70">{carrier.pickupTime}</p>
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
                  <Button
                    size="sm"
                    fullWidth
                    onClick={() => handleMarkPickedUp(carrier.id)}
                    leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  >
                    Mark Picked Up
                  </Button>
                )}
                {carrier.status === 'picked_up' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => setShowManifest(carrier.id)}
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

      {/* Close Day Confirmation Modal */}
      <Modal
        open={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        title="Close Shipping Day"
        description="Review the summary before closing"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCloseConfirm(false)}>
              Cancel
            </Button>
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

          <div className="space-y-2">
            {carriers
              .filter((c) => c.status !== 'no_packages')
              .map((carrier) => (
                <div
                  key={carrier.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-800/50 border border-surface-700/50"
                >
                  <div className="flex items-center gap-3">
                    <Truck className={`h-4 w-4 ${carrier.color}`} />
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

      {/* Manifest Modal */}
      <Modal
        open={!!showManifest}
        onClose={() => setShowManifest(null)}
        title={`${manifestCarrier?.name || ''} Manifest`}
        description={manifestCarrier?.manifestId || ''}
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setShowManifest(null)}>
            Close
          </Button>
        }
      >
        {manifestCarrier && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <p className="text-xs text-surface-500 mb-1">Total Packages</p>
                <p className="text-lg font-bold text-surface-100">{manifestCarrier.packages}</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <p className="text-xs text-surface-500 mb-1">Pickup Time</p>
                <p className="text-lg font-bold text-surface-100">{manifestCarrier.pickupTime}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider mb-2">
                Manifest ID
              </p>
              <p className="font-mono text-sm text-primary-600 bg-surface-800/50 px-3 py-2 rounded-lg border border-surface-700/50">
                {manifestCarrier.manifestId}
              </p>
            </div>

            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider mb-2">
                Tracking Numbers
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {manifestCarrier.trackingNumbers.map((tn, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800/50 border border-surface-700/50"
                  >
                    <Package className="h-3.5 w-3.5 text-surface-500" />
                    <span className="font-mono text-xs text-surface-300">{tn}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
