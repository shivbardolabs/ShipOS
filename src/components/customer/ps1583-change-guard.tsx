'use client';
/* eslint-disable */

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  FileText,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface ProtectedFieldChange {
  field: string;
  label: string;
  oldValue: string | null;
  newValue: string | null;
}

interface PS1583ChangeGuardProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  protectedChanges: ProtectedFieldChange[];
  customerName: string;
  pmbNumber: string;
  form1583Status: string;
}

/* ── Main Component ────────────────────────────────────────────────────── */

export function PS1583ChangeGuard({
  open,
  onClose,
  onConfirm,
  loading,
  protectedChanges,
  customerName,
  pmbNumber,
  form1583Status,
}: PS1583ChangeGuardProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <Modal
      open={open}
      onClose={() => { setAcknowledged(false); onClose(); }}
      title="⚠️ PS Form 1583 Warning"
      description={`${customerName} · ${pmbNumber}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={() => { setAcknowledged(false); onClose(); }}>
            Cancel Changes
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={onConfirm}
            loading={loading}
            disabled={!acknowledged}
          >
            Confirm & Trigger Re-Filing
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Warning Banner */}
        <div className="rounded-lg p-4 bg-orange-950/30 border border-orange-800/50">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-orange-300">
                PS1583-Protected Fields Are Being Changed
              </h3>
              <p className="text-xs text-orange-300/70 mt-1">
                This customer has an active Form 1583 (status: <strong>{form1583Status}</strong>).
                The changes below affect fields that appear on PS Form 1583. Per USPS regulations,
                modifying these fields requires a new Form 1583 to be filed and notarized.
              </p>
            </div>
          </div>
        </div>

        {/* Field Changes */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-surface-400 uppercase tracking-wider">
            Protected Fields Being Modified
          </h4>
          {protectedChanges.map((change) => (
            <div
              key={change.field}
              className="rounded-lg bg-surface-800/50 p-3 border border-surface-700"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className="h-3.5 w-3.5 text-surface-500" />
                <span className="text-xs font-medium text-surface-400">{change.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-400/80 line-through flex-1 min-w-0 truncate">
                  {change.oldValue || '(empty)'}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-surface-600 flex-shrink-0" />
                <span className="text-sm text-emerald-400 font-medium flex-1 min-w-0 truncate">
                  {change.newValue || '(empty)'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* What Happens */}
        <div className="rounded-lg p-3 bg-surface-800/30 border border-surface-700">
          <h4 className="text-xs font-medium text-surface-400 uppercase mb-2">What will happen</h4>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2 text-xs text-surface-300">
              <AlertTriangle className="h-3 w-3 text-yellow-400 mt-0.5 flex-shrink-0" />
              Form 1583 status will be set to <Badge variant="danger" className="text-xs ml-1">Needs Re-Filing</Badge>
            </li>
            <li className="flex items-start gap-2 text-xs text-surface-300">
              <AlertTriangle className="h-3 w-3 text-yellow-400 mt-0.5 flex-shrink-0" />
              An audit trail entry will be created with the old and new values
            </li>
            <li className="flex items-start gap-2 text-xs text-surface-300">
              <AlertTriangle className="h-3 w-3 text-yellow-400 mt-0.5 flex-shrink-0" />
              Customer must file a new notarized PS Form 1583 to restore compliance
            </li>
          </ul>
        </div>

        {/* Acknowledgment Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer rounded-lg p-3 hover:bg-surface-800/30 transition-colors">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500/30"
          />
          <span className="text-sm text-surface-300">
            I understand that these changes will invalidate the current PS Form 1583 and require a
            new notarized form to be filed before the customer is compliant again.
          </span>
        </label>
      </div>
    </Modal>
  );
}
