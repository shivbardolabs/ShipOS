'use client';
/* eslint-disable */

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, cn } from '@/lib/utils';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
  Loader2,
  Ban,
  CalendarClock,
  Shield,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface ClosureRecord {
  id: string;
  firstName: string;
  lastName: string;
  pmbNumber: string;
  status: string;
  dateClosed: string | null;
  closureReason: string | null;
  crdClosureStatus: string | null;
  crdClosureDate: string | null;
  documentRetentionUntil: string | null;
  retentionOfferResult: string | null;
  daysSinceClosure: number;
  crdOverdue: boolean;
}

interface ClosureSummary {
  total: number;
  pendingCrd: number;
  submittedCrd: number;
  confirmedCrd: number;
  overdueCrd: number;
}

/* ── Status Badge ──────────────────────────────────────────────────────── */

function getCrdBadge(status: string | null) {
  switch (status) {
    case 'confirmed':
      return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Confirmed</Badge>;
    case 'submitted':
      return <Badge variant="info" className="gap-1"><Send className="h-3 w-3" /> Submitted</Badge>;
    case 'pending':
      return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    default:
      return <Badge variant="muted">Unknown</Badge>;
  }
}

/* ── Main Component ────────────────────────────────────────────────────── */

export default function CrdClosuresPage() {
  const [closures, setClosures] = useState<ClosureRecord[]>([]);
  const [summary, setSummary] = useState<ClosureSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchClosures = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/compliance/closures');
      if (res.ok) {
        const data = await res.json();
        setClosures(data.closures || []);
        setSummary(data.summary || null);
      }
    } catch (e) {
      console.error('Failed to fetch closures', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClosures();
  }, [fetchClosures]);

  const handleCrdUpdate = async (customerId: string, status: string) => {
    setUpdating(customerId);
    try {
      await fetch(`/api/customers/${customerId}/closure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_crd_closure', crdClosureStatus: status }),
      });
      await fetchClosures();
    } catch (e) {
      console.error('CRD update failed', e);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRD Closure Report"
        description="Track same-day CRD closures and document retention for USPIS compliance."
        icon={<FileText className="h-6 w-6" />}
        actions={
          <Button variant="outline" onClick={fetchClosures} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Refresh
          </Button>
        }
      />

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={<Ban className="h-5 w-5" />} title="Total Closures" value={summary.total} />
          <StatCard icon={<Clock className="h-5 w-5" />} title="Pending CRD" value={summary.pendingCrd} />
          <StatCard icon={<Send className="h-5 w-5" />} title="Submitted" value={summary.submittedCrd} />
          <StatCard icon={<CheckCircle2 className="h-5 w-5" />} title="Confirmed" value={summary.confirmedCrd} />
          <StatCard icon={<AlertTriangle className="h-5 w-5" />} title="Overdue" value={summary.overdueCrd} />
        </div>
      )}

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left px-4 py-3 font-medium text-surface-400">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-surface-400">PMB</th>
                <th className="text-left px-4 py-3 font-medium text-surface-400">Closed Date</th>
                <th className="text-left px-4 py-3 font-medium text-surface-400">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-surface-400">CRD Status</th>
                <th className="text-left px-4 py-3 font-medium text-surface-400">Retention Until</th>
                <th className="text-right px-4 py-3 font-medium text-surface-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-surface-500" />
                    <p className="text-sm text-surface-500 mt-2">Loading closures…</p>
                  </td>
                </tr>
              ) : closures.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-surface-500">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No closed PMBs found</p>
                  </td>
                </tr>
              ) : (
                closures.map((c) => (
                  <tr
                    key={c.id}
                    className={cn(
                      'border-b border-surface-800 hover:bg-surface-900/50',
                      c.crdOverdue && 'bg-red-950/10'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-surface-200">{c.firstName} {c.lastName}</div>
                      {c.retentionOfferResult && (
                        <span className="text-xs text-surface-500 capitalize">
                          Retention: {c.retentionOfferResult}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-surface-300 font-mono">{c.pmbNumber}</td>
                    <td className="px-4 py-3">
                      <div className="text-surface-300">{c.dateClosed ? formatDate(c.dateClosed) : '—'}</div>
                      {c.crdOverdue && (
                        <span className="text-xs text-red-400">{c.daysSinceClosure}d ago — CRD overdue!</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-surface-300 capitalize">
                      {c.closureReason?.replace('_', ' ') || '—'}
                    </td>
                    <td className="px-4 py-3">{getCrdBadge(c.crdClosureStatus)}</td>
                    <td className="px-4 py-3 text-surface-300 text-xs">
                      {c.documentRetentionUntil ? (
                        <div className="flex items-center gap-1">
                          <CalendarClock className="h-3 w-3 text-surface-500" />
                          {formatDate(c.documentRetentionUntil)}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.crdClosureStatus !== 'confirmed' && (
                        <div className="flex items-center gap-1.5 justify-end">
                          {c.crdClosureStatus !== 'submitted' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCrdUpdate(c.id, 'submitted')}
                              loading={updating === c.id}
                            >
                              Submit
                            </Button>
                          )}
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleCrdUpdate(c.id, 'confirmed')}
                            loading={updating === c.id}
                          >
                            Confirm
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
