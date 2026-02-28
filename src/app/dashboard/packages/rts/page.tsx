'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import { Modal } from '@/components/ui/modal';
import { RtsInitiateDialog } from '@/components/packages/rts-initiate-dialog';
import { RtsProcessingModal } from '@/components/packages/rts-processing-modal';
import { RtsReportPanel } from '@/components/packages/rts-report-panel';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import { formatDate, cn } from '@/lib/utils';
import {
  Undo2,
  Printer,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Package,
  Mail,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface RtsRecord {
  id: string;
  tenantId: string;
  packageId: string | null;
  mailPieceId: string | null;
  reason: string;
  reasonDetail: string | null;
  step: string;
  carrier: string | null;
  returnTrackingNumber: string | null;
  carrierNotes: string | null;
  initiatedAt: string;
  labelPrintedAt: string | null;
  carrierHandoffAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  initiatedById: string;
  customerId: string | null;
  pmbNumber: string | null;
  createdAt: string;
  updatedAt: string;
  package?: {
    id: string;
    trackingNumber: string | null;
    carrier: string;
    packageType: string;
    senderName: string | null;
    storageLocation: string | null;
    customer?: { id: string; firstName: string; lastName: string; pmbNumber: string };
  } | null;
  mailPiece?: {
    id: string;
    type: string;
    sender: string | null;
  } | null;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */
const STEP_LABELS: Record<string, string> = {
  initiated: 'Initiated',
  label_printed: 'Label Printed',
  carrier_handoff: 'Carrier Handoff',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STEP_COLORS: Record<string, string> = {
  initiated: 'bg-amber-900/30 text-amber-400',
  label_printed: 'bg-blue-900/30 text-blue-400',
  carrier_handoff: 'bg-indigo-900/30 text-indigo-400',
  completed: 'bg-emerald-900/30 text-emerald-400',
  cancelled: 'bg-red-900/30 text-red-400',
};

const REASON_LABELS: Record<string, string> = {
  no_matching_customer: 'No Matching Customer',
  closed_pmb: 'Closed PMB',
  expired_pmb: 'Expired PMB',
  customer_request: 'Customer Request',
  storage_policy_expiry: 'Storage Policy Expiry',
  refused: 'Refused',
  unclaimed: 'Unclaimed',
  other: 'Other',
};

const STEP_ICONS: Record<string, React.ElementType> = {
  initiated: Clock,
  label_printed: Printer,
  carrier_handoff: Truck,
  completed: CheckCircle2,
  cancelled: XCircle,
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function RtsPage() {
  const [records, setRecords] = useState<RtsRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showInitiate, setShowInitiate] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RtsRecord | null>(null);
  const [showReport, setShowReport] = useState(false);

  const limit = 25;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (activeTab !== 'all') params.set('step', activeTab);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/packages/rts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRecords(data.records || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load RTS records:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, search]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const stepCounts = {
    all: total,
    initiated: records.filter((r) => r.step === 'initiated').length,
    label_printed: records.filter((r) => r.step === 'label_printed').length,
    carrier_handoff: records.filter((r) => r.step === 'carrier_handoff').length,
    completed: records.filter((r) => r.step === 'completed').length,
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Return to Sender"
        description={`${total} RTS record${total !== 1 ? 's' : ''} · Track and manage package/mail returns`}
        icon={<Undo2 className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReport(true)}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Report
            </Button>
            <Button
              size="sm"
              onClick={() => setShowInitiate(true)}
              className="gap-2"
            >
              <Undo2 className="h-4 w-4" />
              Initiate RTS
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={Clock}
          label="Initiated"
          count={stepCounts.initiated}
          color="text-amber-400"
          bg="bg-amber-900/20"
        />
        <SummaryCard
          icon={Printer}
          label="Label Printed"
          count={stepCounts.label_printed}
          color="text-blue-400"
          bg="bg-blue-900/20"
        />
        <SummaryCard
          icon={Truck}
          label="Carrier Handoff"
          count={stepCounts.carrier_handoff}
          color="text-indigo-400"
          bg="bg-indigo-900/20"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Completed"
          count={stepCounts.completed}
          color="text-emerald-400"
          bg="bg-emerald-900/20"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-full sm:w-80">
          <SearchInput
            placeholder="Search tracking #, PMB, or reason..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Tabs
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'initiated', label: 'Initiated' },
            { id: 'label_printed', label: 'Labeled' },
            { id: 'carrier_handoff', label: 'Handoff' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' },
          ]}
          activeTab={activeTab}
          onChange={(t) => { setActiveTab(t); setPage(1); }}
        />
      </div>

      {/* Records Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-surface-400">
            <div className="animate-pulse">Loading RTS records…</div>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-surface-400">
            <Undo2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No RTS records found</p>
            <p className="text-sm mt-1">Initiate a Return to Sender from the button above or from the Package Check-In wizard.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700/50 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">PMB</th>
                  <th className="px-4 py-3">Carrier</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Step</th>
                  <th className="px-4 py-3">Initiated</th>
                  <th className="px-4 py-3">Return Tracking</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/50">
                {records.map((record) => {
                  const StepIcon = STEP_ICONS[record.step] || Clock;
                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-surface-800/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedRecord(record)}
                    >
                      <td className="px-4 py-3">
                        {record.packageId ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-surface-300">
                            <Package className="h-3.5 w-3.5" /> Package
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-surface-300">
                            <Mail className="h-3.5 w-3.5" /> Mail
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-surface-100">
                          {record.package?.trackingNumber || record.mailPiece?.sender || '—'}
                        </div>
                        {record.package?.senderName && (
                          <div className="text-xs text-surface-400">From: {record.package.senderName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-surface-300">{record.pmbNumber || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {record.carrier ? (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <CarrierLogo carrier={record.carrier} size={14} />
                            <span className="text-surface-300 capitalize">{record.carrier}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-surface-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-surface-300">{REASON_LABELS[record.reason] || record.reason}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium', STEP_COLORS[record.step])}>
                          <StepIcon className="h-3 w-3" />
                          {STEP_LABELS[record.step] || record.step}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-surface-400">
                        {formatDate(record.initiatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-surface-300 font-mono">
                          {record.returnTrackingNumber || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {record.step === 'initiated' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setSelectedRecord(record); }}
                          >
                            Process
                          </Button>
                        )}
                        {record.step === 'label_printed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setSelectedRecord(record); }}
                          >
                            Handoff
                          </Button>
                        )}
                        {record.step === 'carrier_handoff' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setSelectedRecord(record); }}
                          >
                            Complete
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-surface-400">
          <span>
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Initiate RTS Dialog */}
      {showInitiate && (
        <RtsInitiateDialog
          onClose={() => setShowInitiate(false)}
          onSuccess={() => {
            setShowInitiate(false);
            fetchRecords();
          }}
        />
      )}

      {/* Processing Modal */}
      {selectedRecord && (
        <RtsProcessingModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onUpdate={() => {
            setSelectedRecord(null);
            fetchRecords();
          }}
        />
      )}

      {/* Report Panel */}
      {showReport && (
        <Modal
          open={true}
          title="RTS Report"
          onClose={() => setShowReport(false)}
          size="lg"
        >
          <RtsReportPanel />
        </Modal>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Summary Card                                                              */
/* -------------------------------------------------------------------------- */
function SummaryCard({
  icon: Icon,
  label,
  count,
  color,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
  bg: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn('rounded-lg p-2', bg)}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
        <div>
          <p className="text-2xl font-bold text-surface-100">{count}</p>
          <p className="text-xs text-surface-400">{label}</p>
        </div>
      </div>
    </Card>
  );
}
