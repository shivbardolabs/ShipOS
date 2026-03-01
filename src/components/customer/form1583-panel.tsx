'use client';
/* eslint-disable */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/input';
import { formatDate, cn } from '@/lib/utils';
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CalendarClock,
  History,
  RefreshCw,
  Loader2,
  PenLine,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface Form1583Data {
  id: string;
  firstName: string;
  lastName: string;
  pmbNumber: string;
  form1583Status: string | null;
  form1583Date: string | null;
  form1583Notarized: boolean;
  form1583FileUrl: string | null;
  form1583SignatureUrl: string | null;
  form1583NotarizedAt: string | null;
  form1583ExpiresAt: string | null;
  form1583Version: number;
  crdUploaded: boolean;
  crdUploadDate: string | null;
  daysUntilExpiry: number | null;
  auditLog: AuditEntry[];
}

interface AuditEntry {
  id: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedById: string;
  wasWarned: boolean;
  action: string;
  notes: string | null;
  createdAt: string;
}

interface Form1583PanelProps {
  customerId: string;
}

/* ── Status Badge ──────────────────────────────────────────────────────── */

function Form1583StatusBadge({ status }: { status: string | null }) {
  switch (status) {
    case 'verified':
    case 'approved':
      return <Badge variant="success" className="gap-1"><ShieldCheck className="h-3 w-3" /> Verified</Badge>;
    case 'submitted':
    case 'uploaded':
      return <Badge variant="info" className="gap-1"><Clock className="h-3 w-3" /> Pending Review</Badge>;
    case 'pending':
    case 'not_submitted':
      return <Badge variant="warning" className="gap-1"><ShieldAlert className="h-3 w-3" /> Not Submitted</Badge>;
    case 'expired':
      return <Badge variant="danger" className="gap-1"><ShieldX className="h-3 w-3" /> Expired</Badge>;
    case 'needs_refiling':
      return <Badge variant="danger" className="gap-1"><AlertTriangle className="h-3 w-3" /> Needs Re-Filing</Badge>;
    default:
      return <Badge variant="muted">Unknown</Badge>;
  }
}

/* ── Main Component ────────────────────────────────────────────────────── */

export function Form1583Panel({ customerId }: Form1583PanelProps) {
  const [data, setData] = useState<Form1583Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customers/${customerId}/form1583`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to fetch Form 1583 data', e);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = async () => {
    if (!newStatus) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/form1583`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form1583Status: newStatus,
          form1583Notarized: newStatus === 'verified',
          notes,
        }),
      });
      if (res.ok) {
        await fetchData();
        setShowUpdate(false);
        setNewStatus('');
        setNotes('');
      }
    } catch (e) {
      console.error('Failed to update Form 1583', e);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-surface-500" />
            <span className="ml-2 text-sm text-surface-500">Loading Form 1583 data…</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const isExpiringSoon = data.daysUntilExpiry !== null && data.daysUntilExpiry <= 60 && data.daysUntilExpiry > 0;
  const isExpired = data.daysUntilExpiry !== null && data.daysUntilExpiry <= 0;

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary-500" />
            <CardTitle className="text-sm">PS Form 1583 Status</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(true)}
              leftIcon={<History className="h-3.5 w-3.5" />}
            >
              History
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpdate(true)}
              leftIcon={<PenLine className="h-3.5 w-3.5" />}
            >
              Update Status
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status Row */}
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-xs text-surface-500 mb-1">Status</p>
                <Form1583StatusBadge status={data.form1583Status} />
              </div>
              <div>
                <p className="text-xs text-surface-500 mb-1">Version</p>
                <span className="text-sm font-medium text-surface-200">v{data.form1583Version}</span>
              </div>
              <div>
                <p className="text-xs text-surface-500 mb-1">Verified Date</p>
                <span className="text-sm text-surface-300">
                  {data.form1583Date ? formatDate(data.form1583Date) : '—'}
                </span>
              </div>
              <div>
                <p className="text-xs text-surface-500 mb-1">Notarized</p>
                <span className="text-sm text-surface-300">
                  {data.form1583Notarized ? (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {data.form1583NotarizedAt ? formatDate(data.form1583NotarizedAt) : 'Yes'}
                    </span>
                  ) : 'No'}
                </span>
              </div>
              <div>
                <p className="text-xs text-surface-500 mb-1">CRD Uploaded</p>
                <span className="text-sm text-surface-300">
                  {data.crdUploaded ? (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {data.crdUploadDate ? formatDate(data.crdUploadDate) : 'Yes'}
                    </span>
                  ) : (
                    <span className="text-yellow-400">Pending</span>
                  )}
                </span>
              </div>
            </div>

            {/* Expiry Warning */}
            {data.form1583ExpiresAt && (
              <div className={cn(
                'rounded-lg p-3 border',
                isExpired
                  ? 'bg-red-950/30 border-red-800/50'
                  : isExpiringSoon
                    ? 'bg-yellow-950/30 border-yellow-800/50'
                    : 'bg-emerald-950/20 border-emerald-800/30'
              )}>
                <div className="flex items-center gap-2">
                  <CalendarClock className={cn(
                    'h-4 w-4',
                    isExpired ? 'text-red-400' : isExpiringSoon ? 'text-yellow-400' : 'text-emerald-400'
                  )} />
                  <span className={cn(
                    'text-sm font-medium',
                    isExpired ? 'text-red-300' : isExpiringSoon ? 'text-yellow-300' : 'text-emerald-300'
                  )}>
                    {isExpired
                      ? `Expired ${Math.abs(data.daysUntilExpiry!)}d ago — re-filing required`
                      : isExpiringSoon
                        ? `Expires in ${data.daysUntilExpiry}d (${formatDate(data.form1583ExpiresAt)})`
                        : `Valid until ${formatDate(data.form1583ExpiresAt)} (${data.daysUntilExpiry}d remaining)`}
                  </span>
                </div>
              </div>
            )}

            {/* Needs Re-Filing Banner */}
            {data.form1583Status === 'needs_refiling' && (
              <div className="rounded-lg p-3 border bg-orange-950/30 border-orange-800/50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  <span className="text-sm font-medium text-orange-300">
                    PS1583-protected field(s) changed — a new Form 1583 must be filed and notarized
                  </span>
                </div>
              </div>
            )}

            {/* Document Link */}
            {data.form1583FileUrl && (
              <div className="flex items-center gap-2 text-sm">
                <Upload className="h-3.5 w-3.5 text-surface-500" />
                <a
                  href={data.form1583FileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300 underline"
                >
                  View Uploaded Document
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Update Status Modal */}
      <Modal
        open={showUpdate}
        onClose={() => { setShowUpdate(false); setNewStatus(''); setNotes(''); }}
        title="Update Form 1583 Status"
        description={`${data.firstName} ${data.lastName} · ${data.pmbNumber}`}
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowUpdate(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpdateStatus}
              loading={updating}
              disabled={!newStatus}
            >
              Update Status
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="New Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={[
              { value: '', label: 'Select status…' },
              { value: 'not_submitted', label: 'Not Submitted' },
              { value: 'pending', label: 'Pending' },
              { value: 'uploaded', label: 'Uploaded / Submitted' },
              { value: 'verified', label: 'Verified (Notarized + Approved)' },
              { value: 'expired', label: 'Expired' },
              { value: 'needs_refiling', label: 'Needs Re-Filing' },
            ]}
          />
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for status change…"
          />
        </div>
      </Modal>

      {/* Audit History Modal */}
      <Modal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        title="Form 1583 Audit History"
        description={`${data.firstName} ${data.lastName} · ${data.pmbNumber}`}
        size="lg"
      >
        {data.auditLog.length === 0 ? (
          <p className="text-sm text-surface-500 py-4">No audit history yet.</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {data.auditLog.map((entry) => (
              <div key={entry.id} className="rounded-lg bg-surface-800/50 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-surface-300 uppercase">{entry.action}</span>
                    <p className="text-sm text-surface-200 mt-0.5">
                      <span className="text-surface-400">{entry.fieldName}</span>
                      {entry.oldValue && (
                        <span className="text-red-400/70 line-through mx-1">{entry.oldValue}</span>
                      )}
                      {entry.newValue && (
                        <span className="text-emerald-400 mx-1">→ {entry.newValue}</span>
                      )}
                    </p>
                    {entry.notes && (
                      <p className="text-xs text-surface-500 mt-1">{entry.notes}</p>
                    )}
                  </div>
                  <span className="text-xs text-surface-500">{formatDate(entry.createdAt)}</span>
                </div>
                {entry.wasWarned && (
                  <Badge variant="warning" className="mt-2 text-xs">User acknowledged warning</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
