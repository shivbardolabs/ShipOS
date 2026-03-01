'use client';
/* eslint-disable */

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/input';
import { formatDate, cn } from '@/lib/utils';
import {
  AlertTriangle,
  Ban,
  Package,
  Mail,
  FileText,
  CheckCircle2,
  Clock,
  Shield,
  Loader2,
  UserX,
  Gift,
  ArrowRight,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface ClosureData {
  customerId: string;
  customerName: string;
  pmbNumber: string;
  status: string;
  closureReason: string | null;
  closureInitiatedAt: string | null;
  dateClosed: string | null;
  retentionOfferSent: boolean;
  retentionOfferResult: string | null;
  mailHoldUntil: string | null;
  crdClosureStatus: string | null;
  crdClosureDate: string | null;
  documentRetentionUntil: string | null;
  preflight: {
    hasActivePackages: boolean;
    activePackageCount: number;
    hasActiveMail: boolean;
    activeMailCount: number;
    hasInventory: boolean;
    form1583Status: string | null;
    crdUploaded: boolean;
  };
}

interface PmbClosureDialogProps {
  customerId: string;
  open: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
}

type ClosureStep = 'preflight' | 'retention' | 'confirm' | 'post_closure';

/* ── Main Component ────────────────────────────────────────────────────── */

export function PmbClosureDialog({ customerId, open, onClose, onStatusChange }: PmbClosureDialogProps) {
  const [data, setData] = useState<ClosureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<ClosureStep>('preflight');
  const [closureReason, setClosureReason] = useState('voluntary');
  const [retentionResult, setRetentionResult] = useState('');
  const [notes, setNotes] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customers/${customerId}/closure`);
      if (res.ok) {
        const json = await res.json();
        setData(json);

        // Determine initial step based on current state
        if (json.status === 'closed') {
          setStep('post_closure');
        } else if (json.closureInitiatedAt && !json.retentionOfferResult) {
          setStep('retention');
        } else if (json.retentionOfferResult === 'declined' || json.retentionOfferResult === 'no_response') {
          setStep('confirm');
        } else {
          setStep('preflight');
        }
      }
    } catch (e) {
      console.error('Failed to fetch closure data', e);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const handleAction = async (action: string, payload: Record<string, any> = {}) => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/closure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      if (res.ok) {
        await fetchData();
        onStatusChange?.();
      }
    } catch (e) {
      console.error('Closure action failed', e);
    } finally {
      setProcessing(false);
    }
  };

  const renderContent = () => {
    if (loading || !data) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-surface-500" />
          <span className="ml-2 text-sm text-surface-500">Loading closure data…</span>
        </div>
      );
    }

    switch (step) {
      case 'preflight':
        return (
          <div className="space-y-4">
            {/* Inventory Check */}
            <div className="rounded-lg p-4 bg-surface-800/40 border border-surface-700">
              <h4 className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-3">
                Pre-Flight Inventory Check
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-surface-500" />
                    <span className="text-sm text-surface-300">Active Packages</span>
                  </div>
                  <Badge variant={data.preflight.hasActivePackages ? 'warning' : 'success'}>
                    {data.preflight.activePackageCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-surface-500" />
                    <span className="text-sm text-surface-300">Active Mail</span>
                  </div>
                  <Badge variant={data.preflight.hasActiveMail ? 'warning' : 'success'}>
                    {data.preflight.activeMailCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-surface-500" />
                    <span className="text-sm text-surface-300">Form 1583 Status</span>
                  </div>
                  <Badge variant={data.preflight.form1583Status === 'verified' ? 'success' : 'muted'}>
                    {data.preflight.form1583Status || 'N/A'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Inventory Warning */}
            {data.preflight.hasInventory && (
              <div className="rounded-lg p-3 bg-yellow-950/30 border border-yellow-800/50">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-300">
                    This customer has {data.preflight.activePackageCount} package(s) and{' '}
                    {data.preflight.activeMailCount} mail piece(s) still on-site. Closing the PMB will
                    mark all active packages for Return to Sender (RTS). Make sure the customer has
                    retrieved their items or approved RTS.
                  </p>
                </div>
              </div>
            )}

            {/* Closure Reason */}
            <Select
              label="Closure Reason"
              value={closureReason}
              onChange={(e) => setClosureReason(e.target.value)}
              options={[
                { value: 'voluntary', label: 'Voluntary — Customer requested' },
                { value: 'non_payment', label: 'Non-Payment — Account delinquent' },
                { value: 'deceased', label: 'Deceased — Customer passed away' },
                { value: 'other', label: 'Other' },
              ]}
            />

            <Button
              className="w-full"
              onClick={() => handleAction('initiate_closure', { closureReason })}
              loading={processing}
              leftIcon={<ArrowRight className="h-4 w-4" />}
            >
              Initiate Closure & Send Retention Offer
            </Button>
          </div>
        );

      case 'retention':
        return (
          <div className="space-y-4">
            <div className="rounded-lg p-4 bg-surface-800/40 border border-surface-700">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-4 w-4 text-primary-400" />
                <h4 className="text-sm font-medium text-surface-200">Retention Offer Sent</h4>
              </div>
              <p className="text-xs text-surface-400">
                A retention offer has been sent to the customer. Record their response below.
              </p>
              {data.mailHoldUntil && (
                <p className="text-xs text-surface-500 mt-2">
                  Mail hold expires: {formatDate(data.mailHoldUntil)}
                </p>
              )}
            </div>

            <Select
              label="Customer Response"
              value={retentionResult}
              onChange={(e) => setRetentionResult(e.target.value)}
              options={[
                { value: '', label: 'Select response…' },
                { value: 'accepted', label: '✅ Accepted — Customer staying' },
                { value: 'declined', label: '❌ Declined — Proceed with closure' },
                { value: 'no_response', label: '⏳ No Response — Proceed with closure' },
              ]}
            />

            <Button
              className="w-full"
              variant={retentionResult === 'accepted' ? 'primary' : 'danger'}
              onClick={() => handleAction('record_retention_result', { retentionResult })}
              loading={processing}
              disabled={!retentionResult}
            >
              {retentionResult === 'accepted' ? 'Cancel Closure — Customer Staying' : 'Record & Continue'}
            </Button>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-4">
            <div className="rounded-lg p-4 bg-red-950/20 border border-red-800/40">
              <div className="flex items-start gap-3">
                <Ban className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-red-300">Confirm PMB Closure</h4>
                  <p className="text-xs text-red-300/70 mt-1">
                    This will permanently close {data.pmbNumber} for {data.customerName}. The following
                    actions will be taken automatically:
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-red-300/60">
                    <li>• Customer status set to &quot;Closed&quot;</li>
                    <li>• All active packages marked for RTS</li>
                    <li>• No new mail/packages will be accepted</li>
                    <li>• CRD closure report initiated (same-day SLA)</li>
                    <li>• 6-month document retention period begins (USPIS compliance)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep('preflight')}>
                Go Back
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => handleAction('close_pmb')}
                loading={processing}
                leftIcon={<Ban className="h-4 w-4" />}
              >
                Close PMB
              </Button>
            </div>
          </div>
        );

      case 'post_closure':
        return (
          <div className="space-y-4">
            <div className="rounded-lg p-4 bg-surface-800/40 border border-surface-700">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-surface-400" />
                <h4 className="text-sm font-medium text-surface-200">PMB Closed</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-surface-400">Closed Date</span>
                  <span className="text-surface-200">{data.dateClosed ? formatDate(data.dateClosed) : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Closure Reason</span>
                  <span className="text-surface-200 capitalize">{data.closureReason?.replace('_', ' ') || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">CRD Closure</span>
                  <Badge variant={
                    data.crdClosureStatus === 'confirmed' ? 'success' :
                    data.crdClosureStatus === 'submitted' ? 'info' :
                    'warning'
                  }>
                    {data.crdClosureStatus || 'Pending'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Retention Offer</span>
                  <span className="text-surface-200 capitalize">{data.retentionOfferResult || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Document Retention Until</span>
                  <span className="text-surface-200">
                    {data.documentRetentionUntil ? formatDate(data.documentRetentionUntil) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* CRD Status Update */}
            {data.crdClosureStatus !== 'confirmed' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleAction('update_crd_closure', { crdClosureStatus: 'submitted' })}
                  loading={processing}
                  disabled={data.crdClosureStatus === 'submitted'}
                >
                  Mark CRD Submitted
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleAction('update_crd_closure', { crdClosureStatus: 'confirmed' })}
                  loading={processing}
                >
                  Mark CRD Confirmed
                </Button>
              </div>
            )}
          </div>
        );
    }
  };

  const stepTitles: Record<ClosureStep, string> = {
    preflight: 'PMB Closure — Pre-Flight Check',
    retention: 'PMB Closure — Retention Offer',
    confirm: 'PMB Closure — Final Confirmation',
    post_closure: 'PMB Closure — Post-Closure',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={stepTitles[step]}
      description={data ? `${data.customerName} · ${data.pmbNumber}` : ''}
      size="md"
    >
      {renderContent()}
    </Modal>
  );
}
