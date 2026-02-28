'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchInput, Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { Modal } from '@/components/ui/modal';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import { cn, formatDate } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Package,
  Loader2,
  AlertTriangle,
  Eye,
  CheckSquare,
  Square,
  RefreshCw,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface PendingItem {
  id: string;
  trackingNumber: string | null;
  carrier: string;
  senderName: string | null;
  senderAddress: string | null;
  recipientName: string | null;
  pmbNumber: string | null;
  packageSize: string;
  serviceType: string | null;
  confidence: number;
  carrierConfidence: string | null;
  trackingNumberValid: boolean;
  recipientIsBusiness: boolean;
  status: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  batchId: string | null;
  checkedInPackageId: string | null;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Carrier config                                                            */
/* -------------------------------------------------------------------------- */
const carrierLabels: Record<string, string> = {
  amazon: 'Amazon', ups: 'UPS', fedex: 'FedEx', usps: 'USPS', dhl: 'DHL',
  lasership: 'LaserShip', ontrac: 'OnTrac', other: 'Other',
};

const carrierColors: Record<string, { bg: string; text: string }> = {
  ups: { bg: 'bg-amber-900/30', text: 'text-amber-500' },
  fedex: { bg: 'bg-indigo-900/30', text: 'text-indigo-400' },
  usps: { bg: 'bg-blue-900/30', text: 'text-blue-400' },
  amazon: { bg: 'bg-orange-900/30', text: 'text-orange-400' },
  dhl: { bg: 'bg-yellow-900/30', text: 'text-yellow-400' },
  lasership: { bg: 'bg-green-900/30', text: 'text-green-400' },
  ontrac: { bg: 'bg-blue-900/30', text: 'text-blue-300' },
  other: { bg: 'bg-surface-700/30', text: 'text-surface-400' },
};

function CarrierBadge({ carrier }: { carrier: string }) {
  const cfg = carrierColors[carrier.toLowerCase()] || carrierColors.other;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <CarrierLogo carrier={carrier} size={14} />
      {carrierLabels[carrier.toLowerCase()] || carrier}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Service type labels                                                       */
/* -------------------------------------------------------------------------- */
const serviceTypeLabels: Record<string, string> = {
  pmb_customer: 'PMB Customer',
  ipostal: 'iPostal1',
  ups_access_point: 'UPS Access Point',
  fedex_hal: 'FedEx HAL',
  kinek: 'Kinek',
  amazon_hub: 'Amazon Hub',
  general_delivery: 'General Delivery',
};

/* -------------------------------------------------------------------------- */
/*  Package size labels                                                       */
/* -------------------------------------------------------------------------- */
const packageSizeLabels: Record<string, string> = {
  letter: 'Letter', pack: 'Pack', small: 'Small',
  medium: 'Medium', large: 'Large', xlarge: 'Extra Large',
};

/* -------------------------------------------------------------------------- */
/*  Status badge                                                              */
/* -------------------------------------------------------------------------- */
function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Pending' },
    approved: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Approved' },
    rejected: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Rejected' },
  };
  const cfg = configs[status] || configs.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {status === 'approved' && <CheckCircle2 className="h-3 w-3" />}
      {status === 'rejected' && <XCircle className="h-3 w-3" />}
      {status === 'pending' && <Sparkles className="h-3 w-3" />}
      {cfg.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Confidence indicator                                                      */
/* -------------------------------------------------------------------------- */
function ConfidenceIndicator({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 90
    ? 'text-emerald-400'
    : pct >= 75
      ? 'text-amber-400'
      : 'text-red-400';
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {pct}%
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Toast banner                                                              */
/* -------------------------------------------------------------------------- */
interface ToastState { message: string; type: 'success' | 'error' | 'info' }

function ToastBanner({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const bg = toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm shadow-lg text-white ${bg}`}>
      <span>{toast.message}</span>
      <button onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page constants                                                            */
/* -------------------------------------------------------------------------- */
const PAGE_SIZE = 12;

/* -------------------------------------------------------------------------- */
/*  Main page component                                                       */
/* -------------------------------------------------------------------------- */
export default function PendingCheckinPage() {
  // Data
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({ pending: 0, approved: 0, rejected: 0 });
  const [total, setTotal] = useState(0);

  // Filters
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [detailItem, setDetailItem] = useState<PendingItem | null>(null);
  const [editItem, setEditItem] = useState<PendingItem | null>(null);
  const [rejectModal, setRejectModal] = useState<{ ids: string[] } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  // Processing states
  const [batchProcessing, setBatchProcessing] = useState(false);

  /* ── Fetch data ─────────────────────────────────────────────────────── */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('status', activeTab);
      if (search) params.set('search', search);
      params.set('limit', '100');

      const res = await fetch(`/api/packages/smart-intake/pending?${params}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setStatusCounts(data.statusCounts || { pending: 0, approved: 0, rejected: 0 });
    } catch (err) {
      console.error('Failed to fetch pending items:', err);
      setToast({ message: 'Failed to load pending items', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  /* ── Tab definitions with counts ────────────────────────────────────── */
  const tabs = useMemo(() => [
    { id: 'all', label: 'All', count: (statusCounts.pending || 0) + (statusCounts.approved || 0) + (statusCounts.rejected || 0) },
    { id: 'pending', label: 'Pending', count: statusCounts.pending || 0 },
    { id: 'approved', label: 'Approved', count: statusCounts.approved || 0 },
    { id: 'rejected', label: 'Rejected', count: statusCounts.rejected || 0 },
  ], [statusCounts]);

  /* ── Pagination ─────────────────────────────────────────────────────── */
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const paged = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  /* ── Selection helpers ──────────────────────────────────────────────── */
  const pendingItems = useMemo(() => items.filter(i => i.status === 'pending'), [items]);
  const pageSelectableIds = useMemo(() => paged.filter(i => i.status === 'pending').map(i => i.id), [paged]);
  const allSelected = pageSelectableIds.length > 0 && pageSelectableIds.every(id => selectedIds.has(id));

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pageSelectableIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pageSelectableIds.forEach(id => next.add(id));
        return next;
      });
    }
  }, [allSelected, pageSelectableIds]);

  /* ── Single item actions ────────────────────────────────────────────── */
  const approveItem = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/packages/smart-intake/pending/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: data.warning || 'Package approved and checked in', type: data.warning ? 'info' : 'success' });
        fetchItems();
        setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        setDetailItem(null);
      } else {
        setToast({ message: data.error || 'Failed to approve', type: 'error' });
      }
    } catch {
      setToast({ message: 'Failed to approve item', type: 'error' });
    }
  }, [fetchItems]);

  const rejectItem = useCallback(async (ids: string[], reason: string) => {
    try {
      if (ids.length === 1) {
        const res = await fetch(`/api/packages/smart-intake/pending/${ids[0]}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', rejectionReason: reason }),
        });
        const data = await res.json();
        if (!data.success) {
          setToast({ message: data.error || 'Failed to reject', type: 'error' });
          return;
        }
      } else {
        const res = await fetch('/api/packages/smart-intake/pending/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', ids, rejectionReason: reason }),
        });
        const data = await res.json();
        if (!data.success) {
          setToast({ message: data.error || 'Batch reject failed', type: 'error' });
          return;
        }
      }
      setToast({ message: `${ids.length} item${ids.length > 1 ? 's' : ''} rejected`, type: 'success' });
      setRejectModal(null);
      setRejectionReason('');
      setSelectedIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
      setDetailItem(null);
      fetchItems();
    } catch {
      setToast({ message: 'Failed to reject', type: 'error' });
    }
  }, [fetchItems]);

  const saveEdit = useCallback(async (id: string, updates: Partial<PendingItem>) => {
    try {
      const res = await fetch(`/api/packages/smart-intake/pending/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: 'Item updated', type: 'success' });
        setEditItem(null);
        fetchItems();
      } else {
        setToast({ message: data.error || 'Failed to update', type: 'error' });
      }
    } catch {
      setToast({ message: 'Failed to update item', type: 'error' });
    }
  }, [fetchItems]);

  /* ── Batch actions ──────────────────────────────────────────────────── */
  const batchApprove = useCallback(async (ids: string[]) => {
    setBatchProcessing(true);
    try {
      const res = await fetch('/api/packages/smart-intake/pending/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', ids }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: `${data.processed} package${data.processed > 1 ? 's' : ''} approved and checked in`, type: 'success' });
        setSelectedIds(new Set());
        fetchItems();
      } else {
        setToast({ message: data.error || 'Batch approve failed', type: 'error' });
      }
    } catch {
      setToast({ message: 'Batch approve failed', type: 'error' });
    } finally {
      setBatchProcessing(false);
    }
  }, [fetchItems]);

  const approveAll = useCallback(() => {
    const allPendingIds = pendingItems.map(i => i.id);
    if (allPendingIds.length > 0) batchApprove(allPendingIds);
  }, [pendingItems, batchApprove]);

  /* ── Tab / search handlers ──────────────────────────────────────────── */
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    setPage(0);
    setSelectedIds(new Set());
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && <ToastBanner toast={toast} onDismiss={() => setToast(null)} />}

      {/* Page Header */}
      <PageHeader
        title="Pending Check-In"
        description={`${statusCounts.pending || 0} packages awaiting clerk review · ${total} total scanned`}
        actions={
          <div className="flex items-center gap-2">
            {pendingItems.length > 0 && (
              <Button
                variant="secondary"
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
                onClick={approveAll}
                disabled={batchProcessing}
              >
                Approve All ({pendingItems.length})
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={fetchItems}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Tabs + Search + Batch Actions */}
      <div className="space-y-4">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput
            placeholder="Search by tracking #, recipient, carrier, PMB..."
            value={search}
            onSearch={handleSearch}
            className="w-80"
          />

          {/* Batch action buttons when items selected */}
          {selectedIds.size > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-surface-400">{selectedIds.size} selected</span>
              <Button
                size="sm"
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                onClick={() => batchApprove(Array.from(selectedIds))}
                disabled={batchProcessing}
              >
                {batchProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `Approve (${selectedIds.size})`}
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<XCircle className="h-3.5 w-3.5" />}
                onClick={() => setRejectModal({ ids: Array.from(selectedIds) })}
              >
                Reject ({selectedIds.size})
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800 bg-surface-900/80">
                <th className="px-4 py-3 text-left w-8">
                  {pageSelectableIds.length > 0 && (
                    <button onClick={toggleSelectAll} className="text-surface-400 hover:text-surface-200">
                      {allSelected ? <CheckSquare className="h-4 w-4 text-primary-500" /> : <Square className="h-4 w-4" />}
                    </button>
                  )}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Confidence</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Tracking #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Carrier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Recipient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">PMB</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Service</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Size</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Scanned</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center text-surface-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary-500 mb-3" />
                    <p>Loading pending items…</p>
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center text-surface-500">
                    <Package className="mx-auto h-8 w-8 text-surface-600 mb-3" />
                    <p className="font-medium">No {activeTab === 'all' ? '' : activeTab} items found</p>
                    <p className="text-xs mt-1 text-surface-600">
                      {activeTab === 'pending' ? 'All scanned packages have been reviewed' : 'Scan packages via Smart Intake to populate this queue'}
                    </p>
                  </td>
                </tr>
              ) : (
                paged.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const lowConfidence = item.confidence < 0.75;
                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        'border-b border-surface-700/60 table-row-hover cursor-pointer',
                        isSelected && 'bg-primary-500/5',
                        lowConfidence && item.status === 'pending' && 'bg-amber-500/5'
                      )}
                      onClick={() => setDetailItem(item)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {item.status === 'pending' && (
                          <button onClick={() => toggleSelect(item.id)} className="text-surface-400 hover:text-surface-200">
                            {isSelected ? <CheckSquare className="h-4 w-4 text-primary-500" /> : <Square className="h-4 w-4" />}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <ConfidenceIndicator score={item.confidence} />
                          {lowConfidence && <AlertTriangle className="h-3 w-3 text-amber-400" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs text-surface-300">{item.trackingNumber || '—'}</span>
                          {item.trackingNumberValid && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                        </div>
                      </td>
                      <td className="px-4 py-3"><CarrierBadge carrier={item.carrier} /></td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-surface-200 text-sm">{item.recipientName || '—'}</p>
                          {item.recipientIsBusiness && (
                            <span className="text-[10px] text-surface-500">Business</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-surface-300">{item.pmbNumber || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-surface-400">
                          {item.serviceType ? serviceTypeLabels[item.serviceType] || item.serviceType : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-surface-400">
                          {packageSizeLabels[item.packageSize] || item.packageSize}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-surface-400 text-xs">{formatDate(item.createdAt)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" iconOnly title="View details" onClick={() => setDetailItem(item)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {item.status === 'pending' && (
                            <>
                              <Button variant="ghost" size="sm" iconOnly title="Edit" onClick={() => setEditItem(item)}>
                                <Edit3 className="h-4 w-4 text-blue-400" />
                              </Button>
                              <Button variant="ghost" size="sm" iconOnly title="Approve" onClick={() => approveItem(item.id)}>
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              </Button>
                              <Button variant="ghost" size="sm" iconOnly title="Reject" onClick={() => setRejectModal({ ids: [item.id] })}>
                                <XCircle className="h-4 w-4 text-red-400" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700/60">
            <span className="text-xs text-surface-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, items.length)} of {items.length}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" iconOnly disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-xs text-surface-400">{page + 1} / {totalPages}</span>
              <Button variant="ghost" size="sm" iconOnly disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      {detailItem && (
        <DetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onApprove={() => approveItem(detailItem.id)}
          onReject={() => { setRejectModal({ ids: [detailItem.id] }); }}
          onEdit={() => { setEditItem(detailItem); setDetailItem(null); }}
        />
      )}

      {/* Edit Modal */}
      {editItem && (
        <EditModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={(updates) => saveEdit(editItem.id, updates)}
        />
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <Modal
          open
          onClose={() => { setRejectModal(null); setRejectionReason(''); }}
          title={`Reject ${rejectModal.ids.length} Item${rejectModal.ids.length > 1 ? 's' : ''}`}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setRejectModal(null); setRejectionReason(''); }}>Cancel</Button>
              <Button variant="danger" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => rejectItem(rejectModal.ids, rejectionReason)}>
                Reject
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-surface-300">
              {rejectModal.ids.length > 1
                ? `Are you sure you want to reject ${rejectModal.ids.length} pending items?`
                : 'Are you sure you want to reject this item?'
              }
            </p>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Reason (optional)</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Unreadable label, wrong store, duplicate…"
                rows={3}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Detail modal                                                              */
/* -------------------------------------------------------------------------- */
function DetailModal({
  item,
  onClose,
  onApprove,
  onReject,
  onEdit,
}: {
  item: PendingItem;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Pending Item Details"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {item.status === 'pending' && (
            <>
              <Button variant="secondary" leftIcon={<Edit3 className="h-4 w-4" />} onClick={onEdit}>Edit</Button>
              <Button variant="danger" leftIcon={<XCircle className="h-4 w-4" />} onClick={onReject}>Reject</Button>
              <Button leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={onApprove}>Approve & Check In</Button>
            </>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {/* Status bar */}
        <div className="flex items-center gap-3">
          <StatusBadge status={item.status} />
          <ConfidenceIndicator score={item.confidence} />
          {item.carrierConfidence && (
            <Badge variant={item.carrierConfidence === 'high' ? 'success' : item.carrierConfidence === 'medium' ? 'warning' : 'danger'}>
              Carrier: {item.carrierConfidence}
            </Badge>
          )}
          {item.trackingNumberValid && (
            <Badge variant="success">Tracking ✓</Badge>
          )}
        </div>

        {/* Extracted Data Grid */}
        <div className="grid grid-cols-2 gap-4">
          <InfoField label="Tracking Number" value={item.trackingNumber || '—'} mono />
          <InfoField label="Carrier" value={carrierLabels[item.carrier] || item.carrier} />
          <InfoField label="Recipient" value={item.recipientName || '—'} />
          <InfoField label="PMB Number" value={item.pmbNumber || '—'} mono />
          <InfoField label="Sender" value={item.senderName || '—'} />
          <InfoField label="Sender Address" value={item.senderAddress || '—'} />
          <InfoField label="Service Type" value={item.serviceType ? serviceTypeLabels[item.serviceType] || item.serviceType : '—'} />
          <InfoField label="Package Size" value={packageSizeLabels[item.packageSize] || item.packageSize} />
          <InfoField label="Scanned At" value={formatDate(item.createdAt)} />
          <InfoField label="Batch ID" value={item.batchId ? item.batchId.substring(0, 20) + '…' : '—'} mono />
        </div>

        {/* Rejection reason */}
        {item.status === 'rejected' && item.rejectionReason && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p className="text-xs text-red-400 font-semibold mb-1">Rejection Reason</p>
            <p className="text-sm text-surface-300">{item.rejectionReason}</p>
          </div>
        )}

        {/* Approval link */}
        {item.status === 'approved' && item.checkedInPackageId && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
            <p className="text-xs text-emerald-400 font-semibold mb-1">Checked In</p>
            <p className="text-sm text-surface-300">
              Package created with ID: <span className="font-mono text-xs">{item.checkedInPackageId}</span>
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Edit modal                                                                */
/* -------------------------------------------------------------------------- */
function EditModal({
  item,
  onClose,
  onSave,
}: {
  item: PendingItem;
  onClose: () => void;
  onSave: (updates: Partial<PendingItem>) => void;
}) {
  const [form, setForm] = useState({
    trackingNumber: item.trackingNumber || '',
    carrier: item.carrier,
    recipientName: item.recipientName || '',
    pmbNumber: item.pmbNumber || '',
    senderName: item.senderName || '',
    senderAddress: item.senderAddress || '',
    packageSize: item.packageSize,
    serviceType: item.serviceType || '',
  });

  const handleSave = () => {
    // Only include changed fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};
    if (form.trackingNumber !== (item.trackingNumber || '')) updates.trackingNumber = form.trackingNumber;
    if (form.carrier !== item.carrier) updates.carrier = form.carrier;
    if (form.recipientName !== (item.recipientName || '')) updates.recipientName = form.recipientName;
    if (form.pmbNumber !== (item.pmbNumber || '')) updates.pmbNumber = form.pmbNumber;
    if (form.senderName !== (item.senderName || '')) updates.senderName = form.senderName;
    if (form.senderAddress !== (item.senderAddress || '')) updates.senderAddress = form.senderAddress;
    if (form.packageSize !== item.packageSize) updates.packageSize = form.packageSize;
    if (form.serviceType !== (item.serviceType || '')) updates.serviceType = form.serviceType;

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }
    onSave(updates);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit Extracted Data"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={handleSave}>Save Changes</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-surface-400 mb-1">Tracking Number</label>
          <Input
            value={form.trackingNumber}
            onChange={(e) => setForm(p => ({ ...p, trackingNumber: e.target.value }))}
            placeholder="Enter tracking number"
          />
        </div>
        <div>
          <label className="block text-xs text-surface-400 mb-1">Carrier</label>
          <Select
            value={form.carrier}
            onChange={(e) => setForm(p => ({ ...p, carrier: e.target.value }))}
            options={[
              { value: 'amazon', label: 'Amazon' },
              { value: 'ups', label: 'UPS' },
              { value: 'fedex', label: 'FedEx' },
              { value: 'usps', label: 'USPS' },
              { value: 'dhl', label: 'DHL' },
              { value: 'lasership', label: 'LaserShip' },
              { value: 'ontrac', label: 'OnTrac' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </div>
        <div>
          <label className="block text-xs text-surface-400 mb-1">Recipient Name</label>
          <Input
            value={form.recipientName}
            onChange={(e) => setForm(p => ({ ...p, recipientName: e.target.value }))}
            placeholder="Enter recipient name"
          />
        </div>
        <div>
          <label className="block text-xs text-surface-400 mb-1">PMB Number</label>
          <Input
            value={form.pmbNumber}
            onChange={(e) => setForm(p => ({ ...p, pmbNumber: e.target.value }))}
            placeholder="e.g. PMB-0001"
          />
        </div>
        <div>
          <label className="block text-xs text-surface-400 mb-1">Sender Name</label>
          <Input
            value={form.senderName}
            onChange={(e) => setForm(p => ({ ...p, senderName: e.target.value }))}
            placeholder="Enter sender name"
          />
        </div>
        <div>
          <label className="block text-xs text-surface-400 mb-1">Sender Address</label>
          <Input
            value={form.senderAddress}
            onChange={(e) => setForm(p => ({ ...p, senderAddress: e.target.value }))}
            placeholder="Enter sender address"
          />
        </div>
        <div>
          <label className="block text-xs text-surface-400 mb-1">Package Size</label>
          <Select
            value={form.packageSize}
            onChange={(e) => setForm(p => ({ ...p, packageSize: e.target.value }))}
            options={[
              { value: 'letter', label: 'Letter' },
              { value: 'pack', label: 'Pack' },
              { value: 'small', label: 'Small' },
              { value: 'medium', label: 'Medium' },
              { value: 'large', label: 'Large' },
              { value: 'xlarge', label: 'Extra Large' },
            ]}
          />
        </div>
        <div>
          <label className="block text-xs text-surface-400 mb-1">Service Type</label>
          <Select
            value={form.serviceType}
            onChange={(e) => setForm(p => ({ ...p, serviceType: e.target.value }))}
            options={[
              { value: '', label: 'None' },
              { value: 'pmb_customer', label: 'PMB Customer' },
              { value: 'ipostal', label: 'iPostal1' },
              { value: 'ups_access_point', label: 'UPS Access Point' },
              { value: 'fedex_hal', label: 'FedEx HAL' },
              { value: 'kinek', label: 'Kinek' },
              { value: 'amazon_hub', label: 'Amazon Hub' },
              { value: 'general_delivery', label: 'General Delivery' },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helper components                                                         */
/* -------------------------------------------------------------------------- */
function InfoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-surface-500 mb-0.5">{label}</p>
      <p className={cn('text-sm text-surface-200', mono && 'font-mono text-xs')}>{value}</p>
    </div>
  );
}
