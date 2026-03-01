'use client';

import { useState, useMemo, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExpandableStatCard } from '@/components/ui/expandable-stat-card';
import type { DetailSection } from '@/components/ui/expandable-stat-card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Tabs } from '@/components/ui/tabs';
import { Modal } from '@/components/ui/modal';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
// mailPieces and customers now fetched from API
import { useActivityLog } from '@/components/activity-log-provider';
import { PerformedBy } from '@/components/ui/performed-by';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { MailPiece } from '@/lib/types';
import {
  ScanLine,
  Inbox,
  Eye,
  Forward,
  Hand,
  Trash2,
  Mail,
  FileText,
  BookOpen,
  ScrollText,
  MoreVertical,
  Send,
  Clock,
  ArrowUpRight,
  ExternalLink,
  FileImage,
  User,
  ClipboardCopy,
  CheckCircle2,
  Plus,
  Hash,
  Upload,
  Camera,
  Search,
  X,
  Loader2,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const mailTypeIcon: Record<string, React.ReactNode> = {
  letter: <Mail className="h-4 w-4 text-blue-600" />,
  magazine: <BookOpen className="h-4 w-4 text-indigo-600" />,
  catalog: <ScrollText className="h-4 w-4 text-amber-600" />,
  legal: <FileText className="h-4 w-4 text-red-600" />,
  other: <Inbox className="h-4 w-4 text-surface-400" />,
};

const mailTypeIconClass: Record<string, { icon: typeof Mail; color: string }> = {
  letter: { icon: Mail, color: 'text-blue-400' },
  magazine: { icon: BookOpen, color: 'text-indigo-400' },
  catalog: { icon: ScrollText, color: 'text-amber-400' },
  legal: { icon: FileText, color: 'text-red-400' },
  other: { icon: Inbox, color: 'text-surface-400' },
};

type MailRow = MailPiece & Record<string, unknown>;

/** Generate a unique mail code (format: ML-XXXXXX) */
function generateUniqueMailCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ML-${code}`;
}

/* -------------------------------------------------------------------------- */
/*  countByField                                                              */
/* -------------------------------------------------------------------------- */

function countByField<T>(
  items: T[],
  accessor: (item: T) => string,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const key = accessor(item);
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Stats + detail breakdowns                                                 */
/* -------------------------------------------------------------------------- */

function useMailStats(mailPieces: MailPiece[] = []) {
  return useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    const receivedTodayItems = mailPieces.filter(
      (m) => new Date(m.receivedAt).getTime() >= todayMs,
    );
    const pendingItems = mailPieces.filter(
      (m) => m.status === 'received' || m.status === 'scanned',
    );
    const forwardedItems = mailPieces.filter((m) => m.status === 'forwarded');
    const heldItems = mailPieces.filter((m) => m.status === 'held');

    /* ---- Received Today ---- */
    const rtByType = countByField(receivedTodayItems, (m) => m.type);
    const rtTotal = receivedTodayItems.length || 1;
    const receivedTodayDetails: DetailSection[] = [
      {
        title: 'By Type',
        rows: Object.entries(rtByType)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => ({
            label: type.charAt(0).toUpperCase() + type.slice(1),
            value: count,
            bar: Math.round((count / rtTotal) * 100),
            barColor:
              type === 'letter'
                ? 'bg-blue-500'
                : type === 'legal'
                  ? 'bg-red-400'
                  : type === 'magazine'
                    ? 'bg-indigo-400'
                    : type === 'catalog'
                      ? 'bg-amber-400'
                      : 'bg-surface-500',
            icon: mailTypeIconClass[type]?.icon || Inbox,
            iconColor: mailTypeIconClass[type]?.color || 'text-surface-400',
          })),
      },
      {
        title: 'By Customer',
        rows: Object.entries(
          countByField(receivedTodayItems, (m) =>
            m.customer
              ? `${m.customer.firstName} ${m.customer.lastName}`
              : 'Unknown',
          ),
        )
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({
            label: name,
            value: count,
            icon: User,
            iconColor: 'text-blue-400',
          })),
      },
    ];

    /* ---- Pending Action ---- */
    const pendByStatus = countByField(pendingItems, (m) => m.status);
    const pendByType = countByField(pendingItems, (m) => m.type);
    const pendTotal = pendingItems.length || 1;
    const pendingDetails: DetailSection[] = [
      {
        title: 'By Status',
        rows: Object.entries(pendByStatus)
          .sort(([, a], [, b]) => b - a)
          .map(([status, count]) => ({
            label: status.charAt(0).toUpperCase() + status.slice(1),
            value: count,
            bar: Math.round((count / pendTotal) * 100),
            barColor: status === 'received' ? 'bg-yellow-400' : 'bg-cyan-400',
            icon: status === 'received' ? Inbox : ScanLine,
            iconColor:
              status === 'received' ? 'text-yellow-400' : 'text-cyan-400',
          })),
      },
      {
        title: 'By Type',
        rows: Object.entries(pendByType)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => ({
            label: type.charAt(0).toUpperCase() + type.slice(1),
            value: count,
            bar: Math.round((count / pendTotal) * 100),
            barColor:
              type === 'letter'
                ? 'bg-blue-400'
                : type === 'legal'
                  ? 'bg-red-400'
                  : type === 'magazine'
                    ? 'bg-indigo-400'
                    : type === 'catalog'
                      ? 'bg-amber-400'
                      : 'bg-surface-400',
            icon: mailTypeIconClass[type]?.icon || Inbox,
            iconColor: mailTypeIconClass[type]?.color || 'text-surface-400',
          })),
      },
      {
        title: 'Top Customers Waiting',
        rows: Object.entries(
          countByField(pendingItems, (m) =>
            m.customer
              ? `${m.customer.firstName} ${m.customer.lastName}`
              : 'Unknown',
          ),
        )
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({
            label: name,
            value: count,
            icon: User,
            iconColor: 'text-yellow-400',
          })),
      },
    ];

    /* ---- Forwarded ---- */
    const fwdByType = countByField(forwardedItems, (m) => m.type);
    const fwdTotal = forwardedItems.length || 1;
    const forwardedDetails: DetailSection[] = [
      {
        title: 'By Type',
        rows: Object.entries(fwdByType)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => ({
            label: type.charAt(0).toUpperCase() + type.slice(1),
            value: count,
            bar: Math.round((count / fwdTotal) * 100),
            barColor: 'bg-indigo-400',
            icon: mailTypeIconClass[type]?.icon || Inbox,
            iconColor: mailTypeIconClass[type]?.color || 'text-surface-400',
          })),
      },
      {
        title: 'By Customer',
        rows: Object.entries(
          countByField(forwardedItems, (m) =>
            m.customer
              ? `${m.customer.firstName} ${m.customer.lastName}`
              : 'Unknown',
          ),
        )
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({
            label: name,
            value: count,
            icon: User,
            iconColor: 'text-indigo-400',
          })),
      },
    ];

    /* ---- Held ---- */
    const heldByType = countByField(heldItems, (m) => m.type);
    const heldTotal = heldItems.length || 1;
    const heldDuration = { under24h: 0, d1to3: 0, d4to7: 0, over7: 0 };
    for (const m of heldItems) {
      const hrs =
        (now.getTime() - new Date(m.receivedAt).getTime()) / 3600000;
      if (hrs < 24) heldDuration.under24h++;
      else if (hrs < 72) heldDuration.d1to3++;
      else if (hrs < 168) heldDuration.d4to7++;
      else heldDuration.over7++;
    }
    const heldDetails: DetailSection[] = [
      {
        title: 'By Type',
        rows: Object.entries(heldByType)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => ({
            label: type.charAt(0).toUpperCase() + type.slice(1),
            value: count,
            bar: Math.round((count / heldTotal) * 100),
            barColor: 'bg-amber-400',
            icon: mailTypeIconClass[type]?.icon || Inbox,
            iconColor: mailTypeIconClass[type]?.color || 'text-surface-400',
          })),
      },
      {
        title: 'Hold Duration',
        rows: [
          {
            label: '< 24 hours',
            value: heldDuration.under24h,
            bar: Math.round((heldDuration.under24h / heldTotal) * 100),
            barColor: 'bg-emerald-400',
          },
          {
            label: '1\u20133 days',
            value: heldDuration.d1to3,
            bar: Math.round((heldDuration.d1to3 / heldTotal) * 100),
            barColor: 'bg-yellow-400',
          },
          {
            label: '4\u20137 days',
            value: heldDuration.d4to7,
            bar: Math.round((heldDuration.d4to7 / heldTotal) * 100),
            barColor: 'bg-orange-400',
          },
          {
            label: '7+ days',
            value: heldDuration.over7,
            bar: Math.round((heldDuration.over7 / heldTotal) * 100),
            barColor: 'bg-red-400',
          },
        ].filter((r) => r.value > 0),
      },
      {
        title: 'By Customer',
        rows: Object.entries(
          countByField(heldItems, (m) =>
            m.customer
              ? `${m.customer.firstName} ${m.customer.lastName}`
              : 'Unknown',
          ),
        )
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({
            label: name,
            value: count,
            icon: User,
            iconColor: 'text-amber-400',
          })),
      },
    ];

    return {
      receivedToday: receivedTodayItems.length,
      pending: pendingItems.length,
      forwarded: forwardedItems.length,
      held: heldItems.length,
      receivedTodayDetails,
      pendingDetails,
      forwardedDetails,
      heldDetails,
      receivedTodaySummary:
        receivedTodayItems.length > 0
          ? `${receivedTodayItems.filter((m) => m.status === 'received').length} unscanned \u00b7 ${receivedTodayItems.filter((m) => m.scanImage).length} already scanned`
          : 'No mail received today yet',
      pendingSummary: `${pendByStatus['received'] || 0} awaiting scan \u00b7 ${pendByStatus['scanned'] || 0} scanned & awaiting next step`,
      forwardedSummary:
        forwardedItems.length > 0
          ? `${forwardedItems.length} piece${forwardedItems.length !== 1 ? 's' : ''} forwarded to customers`
          : 'No forwarded mail',
      heldSummary:
        heldItems.length > 0
          ? `${heldItems.length} piece${heldItems.length !== 1 ? 's' : ''} on hold \u00b7 Oldest: ${Math.round(Math.max(...heldItems.map((m) => (now.getTime() - new Date(m.receivedAt).getTime()) / 86400000)))} days`
          : 'No mail on hold',
    };
  }, [mailPieces]);
}

/* -------------------------------------------------------------------------- */
/*  Columns                                                                   */
/* -------------------------------------------------------------------------- */

function useColumns(onView: (mail: MailPiece) => void) {
  return useMemo<Column<MailRow>[]>(
    () => [
      {
        key: 'mailCode',
        label: 'Code',
        width: 'w-28',
        sortable: true,
        render: (row) => (
          <span className="font-mono text-xs text-brand-400 font-semibold tracking-wide">
            {row.mailCode || '\u2014'}
          </span>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        width: 'w-24',
        render: (row) => (
          <div className="flex items-center gap-2">
            {mailTypeIcon[row.type] || mailTypeIcon.other}
            <span className="capitalize text-xs font-medium">{row.type}</span>
          </div>
        ),
      },
      {
        key: 'customer',
        label: 'Customer',
        sortable: true,
        render: (row) => {
          const c = row.customer;
          return c ? (
            <div>
              <span className="text-sm text-surface-200 font-medium">
                {c.firstName} {c.lastName}
              </span>
              <span className="ml-2 text-[10px] text-surface-500">
                {c.pmbNumber}
              </span>
            </div>
          ) : (
            <span className="text-surface-500">{'\u2014'}</span>
          );
        },
      },
      {
        key: 'sender',
        label: 'Sender',
        sortable: true,
        render: (row) => (
          <span className="text-sm">{row.sender || '\u2014'}</span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => (
          <Badge status={row.status} className="text-xs">
            {row.status}
          </Badge>
        ),
      },
      {
        key: 'receivedAt',
        label: 'Received',
        sortable: true,
        render: (row) => (
          <span className="text-xs text-surface-400">
            {formatDate(row.receivedAt)}
          </span>
        ),
      },
      {
        key: 'scan',
        label: 'Scan',
        width: 'w-16',
        align: 'center',
        render: (row) =>
          row.scanImage ? (
            <a
              href={row.scanImage}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-brand-400 hover:bg-brand-400/10 hover:text-brand-300 transition-colors"
              title="View scanned mail"
            >
              <FileImage className="h-4 w-4" />
            </a>
          ) : (
            <span className="text-surface-600">{'\u2014'}</span>
          ),
      },
      {
        key: 'actions',
        label: '',
        align: 'right',
        width: 'w-12',
        render: (row) => (
          <DropdownMenu
            trigger={
              <div className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors">
                <MoreVertical className="h-4 w-4" />
              </div>
            }
            items={[
              {
                id: 'view',
                label: 'View Details',
                icon: <Eye className="h-4 w-4" />,
                onClick: () => onView(row),
              },
              {
                id: 'notify',
                label: 'Notify Customer',
                icon: <Send className="h-4 w-4" />,
              },
              {
                id: 'hold',
                label: 'Hold',
                icon: <Hand className="h-4 w-4" />,
              },
              {
                id: 'forward',
                label: 'Forward',
                icon: <Forward className="h-4 w-4" />,
              },
              'separator',
              {
                id: 'discard',
                label: 'Discard',
                icon: <Trash2 className="h-4 w-4" />,
                danger: true,
              },
            ]}
          />
        ),
      },
    ],
    [onView],
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function MailPage() {
  return (
    <Suspense>
      <MailContent />
    </Suspense>
  );
}

function MailContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('all');
  const [insertModalOpen, setInsertModalOpen] = useState(false);
  const [insertStep, setInsertStep] = useState<'form' | 'success'>('form');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const { lastActionByVerb } = useActivityLog();
  const lastMailAction =
    lastActionByVerb('mail.insert') || lastActionByVerb('mail.scan');

  const [detailModal, setDetailModal] = useState<MailPiece | null>(null);

  /* ── Scan New Mail form state ─────────────────────────────── */
  const [scanCustomerId, setScanCustomerId] = useState('');
  const [scanMailType, setScanMailType] = useState('letter');
  const [scanSender, setScanSender] = useState('');
  const [scanNotes, setScanNotes] = useState('');
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanImageBack, setScanImageBack] = useState<string | null>(null);
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const [scanError, setScanError] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  /* ── Fetch mail + customers from API ────────────────────────── */
  const [mailPieces, setMailPieces] = useState<MailPiece[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customers, setCustomers] = useState<any[]>([]);

  const refreshMailPieces = useCallback(() => {
    fetch('/api/mail?limit=100')
      .then((r) => r.json())
      .then((data) => setMailPieces(data.mailPieces ?? []))
      .catch((err) => console.error('Failed to fetch mail:', err));
  }, []);

  useEffect(() => {
    refreshMailPieces();
    fetch('/api/customers?limit=200&status=active')
      .then((r) => r.json())
      .then((data) => setCustomers(data.customers ?? []))
      .catch((err) => console.error('Failed to fetch customers:', err));
  }, [refreshMailPieces]);

  // Auto-open detail modal when navigated with ?highlight={id}
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId) {
      const target = mailPieces.find((m) => m.id === highlightId);
      if (target) setDetailModal(target);
    }
  }, [searchParams, mailPieces]);
  const stats = useMailStats(mailPieces);

  const filtered = useMemo<MailRow[]>(() => {
    if (activeTab === 'all') return mailPieces as MailRow[];
    return mailPieces.filter((m) => m.status === activeTab) as MailRow[];
  }, [activeTab, mailPieces]);

  const columns = useColumns((mail) => setDetailModal(mail));

  const tabs = [
    { id: 'all', label: 'All', count: mailPieces.length },
    {
      id: 'received',
      label: 'Received',
      count: mailPieces.filter((m) => m.status === 'received').length,
    },
    {
      id: 'scanned',
      label: 'Scanned',
      count: mailPieces.filter((m) => m.status === 'scanned').length,
    },
    {
      id: 'notified',
      label: 'Notified',
      count: mailPieces.filter((m) => m.status === 'notified').length,
    },
    {
      id: 'held',
      label: 'Held',
      count: mailPieces.filter((m) => m.status === 'held').length,
    },
    {
      id: 'forwarded',
      label: 'Forwarded',
      count: mailPieces.filter((m) => m.status === 'forwarded').length,
    },
  ];

  /* ------ File to base64 helper ------ */
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  /* ------ Insert / Scan mail handlers ------ */

  const handleOpenInsertModal = useCallback(() => {
    setInsertStep('form');
    setGeneratedCode('');
    setCodeCopied(false);
    setScanCustomerId('');
    setScanMailType('letter');
    setScanSender('');
    setScanNotes('');
    setScanImage(null);
    setScanImageBack(null);
    setScanError('');
    setScanSubmitting(false);
    setCustomerSearch('');
    setInsertModalOpen(true);
  }, []);

  const handleCloseInsertModal = useCallback(() => {
    setInsertModalOpen(false);
    setInsertStep('form');
    setGeneratedCode('');
    setCodeCopied(false);
  }, []);

  const handleFrontImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setScanImage(base64);
    }
  }, [fileToBase64]);

  const handleBackImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setScanImageBack(base64);
    }
  }, [fileToBase64]);

  // Filtered customers for PMB lookup
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const q = customerSearch.toLowerCase();
    return customers
      .filter(
        (c) =>
          c.pmbNumber?.toLowerCase().includes(q) ||
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [customerSearch, customers]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === scanCustomerId),
    [scanCustomerId, customers],
  );

  const handleConfirmInsert = useCallback(async () => {
    if (!scanCustomerId) {
      setScanError('Please select a customer.');
      return;
    }
    setScanSubmitting(true);
    setScanError('');
    try {
      const res = await fetch('/api/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: scanMailType,
          sender: scanSender || undefined,
          customerId: scanCustomerId,
          scanImage: scanImage || undefined,
          scanImageBack: scanImageBack || undefined,
          notes: scanNotes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setScanError(err.error || 'Failed to create mail piece');
        setScanSubmitting(false);
        return;
      }
      const code = generateUniqueMailCode();
      setGeneratedCode(code);
      setInsertStep('success');
      // Refresh mail list
      refreshMailPieces();
    } catch {
      setScanError('Network error. Please try again.');
    } finally {
      setScanSubmitting(false);
    }
  }, [scanCustomerId, scanMailType, scanSender, scanImage, scanImageBack, scanNotes, refreshMailPieces]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [generatedCode]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Mail Management"
        badge={
          lastMailAction ? (
            <PerformedBy entry={lastMailAction} showAction className="ml-2" />
          ) : undefined
        }
        description="Process and route incoming mail."
        actions={
          <Button
            leftIcon={<ScanLine className="h-4 w-4" />}
            onClick={handleOpenInsertModal}
          >
            Scan New Mail
          </Button>
        }
      />

      {/* Expandable Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ExpandableStatCard
          icon={<Inbox className="h-5 w-5 text-blue-400" />}
          title="Received Today"
          value={stats.receivedToday}
          className="[&_div.bg-primary-50]:bg-blue-500/15 [&_div.text-primary-600]:text-blue-400"
          details={stats.receivedTodayDetails}
          detailSummary={stats.receivedTodaySummary}
        />
        <ExpandableStatCard
          icon={<Clock className="h-5 w-5 text-yellow-400" />}
          title="Pending Action"
          value={stats.pending}
          className="[&_div.bg-primary-50]:bg-yellow-500/15 [&_div.text-primary-600]:text-yellow-400"
          details={stats.pendingDetails}
          detailSummary={stats.pendingSummary}
        />
        <ExpandableStatCard
          icon={<ArrowUpRight className="h-5 w-5 text-indigo-400" />}
          title="Forwarded"
          value={stats.forwarded}
          className="[&_div.bg-primary-50]:bg-indigo-500/15 [&_div.text-primary-600]:text-indigo-400"
          details={stats.forwardedDetails}
          detailSummary={stats.forwardedSummary}
        />
        <ExpandableStatCard
          icon={<Hand className="h-5 w-5 text-amber-400" />}
          title="Held"
          value={stats.held}
          className="[&_div.bg-primary-50]:bg-amber-500/15 [&_div.text-primary-600]:text-amber-400"
          details={stats.heldDetails}
          detailSummary={stats.heldSummary}
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        keyAccessor={(row) => row.id}
        searchable={true}
        searchPlaceholder="Search mail by customer, sender, code..."
        pageSize={10}
        emptyMessage="No mail pieces found"
        onRowClick={(row) => setDetailModal(row)}
      />

      {/* Detail Modal */}
      <Modal
        open={!!detailModal}
        onClose={() => setDetailModal(null)}
        title="Mail Piece Details"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetailModal(null)}>
              Close
            </Button>
            <Button leftIcon={<Send className="h-4 w-4" />}>
              Notify Customer
            </Button>
          </>
        }
      >
        {detailModal && (
          <div className="space-y-4">
            {/* Mail Code Banner */}
            {detailModal.mailCode && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-500/10 border border-brand-500/20">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400">
                  <Hash className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-surface-500">Mail Code</p>
                  <p className="text-lg font-mono font-bold text-brand-400 tracking-wider">
                    {detailModal.mailCode}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-surface-500">Type</p>
                <div className="flex items-center gap-2 mt-1">
                  {mailTypeIcon[detailModal.type]}
                  <span className="text-sm text-surface-200 capitalize font-medium">
                    {detailModal.type}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-surface-500">Status</p>
                <div className="mt-1">
                  <Badge status={detailModal.status}>
                    {detailModal.status}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-surface-500">Customer</p>
                <p className="text-sm text-surface-200 mt-1">
                  {detailModal.customer
                    ? `${detailModal.customer.firstName} ${detailModal.customer.lastName} (${detailModal.customer.pmbNumber})`
                    : '\u2014'}
                </p>
              </div>
              <div>
                <p className="text-xs text-surface-500">Sender</p>
                <p className="text-sm text-surface-200 mt-1">
                  {detailModal.sender || '\u2014'}
                </p>
              </div>
              <div>
                <p className="text-xs text-surface-500">Received</p>
                <p className="text-sm text-surface-200 mt-1">
                  {formatDateTime(detailModal.receivedAt)}
                </p>
              </div>
              {detailModal.action && (
                <div>
                  <p className="text-xs text-surface-500">Action</p>
                  <p className="text-sm text-surface-200 mt-1 capitalize">
                    {detailModal.action.replace('_', ' ')}
                  </p>
                </div>
              )}
            </div>

            {/* Scan Preview */}
            {detailModal.scanImage && (
              <a
                href={detailModal.scanImage}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-3 rounded-lg bg-brand-500/10 border border-brand-500/20 hover:bg-brand-500/20 transition-colors cursor-pointer"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400 group-hover:bg-brand-500/30 transition-colors">
                  <FileImage className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-surface-200">
                    Scanned Document
                  </p>
                  <p className="text-xs text-surface-400 truncate">
                    {detailModal.scanImage}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-surface-400 group-hover:text-brand-400 transition-colors shrink-0" />
              </a>
            )}

            {!detailModal.scanImage && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-700/50 text-surface-500">
                  <FileImage className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-surface-400">No scan available</p>
                  <p className="text-xs text-surface-500">
                    Mail has not been scanned yet
                  </p>
                </div>
              </div>
            )}

            {detailModal.notes && (
              <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <p className="text-xs text-surface-500 mb-1">Notes</p>
                <p className="text-sm text-surface-300">
                  {detailModal.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Scan New Mail Modal */}
      <Modal
        open={insertModalOpen}
        onClose={handleCloseInsertModal}
        title={
          insertStep === 'form'
            ? 'Scan New Mail'
            : 'Mail Created Successfully'
        }
        description={
          insertStep === 'form'
            ? 'Scan incoming mail, assign to a customer, and notify them automatically'
            : undefined
        }
        size="lg"
        footer={
          insertStep === 'form' ? (
            <>
              <Button
                variant="secondary"
                onClick={handleCloseInsertModal}
              >
                Cancel
              </Button>
              <Button
                leftIcon={scanSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                onClick={handleConfirmInsert}
                disabled={scanSubmitting || !scanCustomerId}
              >
                {scanSubmitting ? 'Creating…' : 'Create Mail Piece'}
              </Button>
            </>
          ) : (
            <Button onClick={handleCloseInsertModal}>Done</Button>
          )
        }
      >
        {insertStep === 'form' ? (
          <div className="space-y-5">
            {/* ── Front & Back Scan Upload ────────────────────── */}
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-2">Mail Scan Images</label>
              <div className="grid grid-cols-2 gap-3">
                {/* Front scan */}
                <div
                  className={`relative group rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                    scanImage
                      ? 'border-brand-500/30 bg-brand-500/5'
                      : 'border-surface-700 hover:border-surface-500 bg-surface-800/30'
                  }`}
                  onClick={() => frontInputRef.current?.click()}
                >
                  <input
                    ref={frontInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFrontImageUpload}
                  />
                  {scanImage ? (
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={scanImage} alt="Front scan" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs text-white font-medium">Replace</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setScanImage(null); }}
                        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500/80 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                      <Camera className="h-6 w-6 text-surface-500 mb-2" />
                      <p className="text-xs text-surface-400 font-medium">Front Scan</p>
                      <p className="text-[10px] text-surface-600 mt-0.5">Tap to capture or upload</p>
                    </div>
                  )}
                </div>
                {/* Back scan (optional) */}
                <div
                  className={`relative group rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                    scanImageBack
                      ? 'border-brand-500/30 bg-brand-500/5'
                      : 'border-surface-700 hover:border-surface-500 bg-surface-800/30'
                  }`}
                  onClick={() => backInputRef.current?.click()}
                >
                  <input
                    ref={backInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleBackImageUpload}
                  />
                  {scanImageBack ? (
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={scanImageBack} alt="Back scan" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs text-white font-medium">Replace</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setScanImageBack(null); }}
                        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500/80 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                      <Upload className="h-6 w-6 text-surface-500 mb-2" />
                      <p className="text-xs text-surface-400 font-medium">Back Scan</p>
                      <p className="text-[10px] text-surface-600 mt-0.5">Optional</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Customer PMB Lookup ─────────────────────────── */}
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">
                Customer <span className="text-red-400">*</span>
              </label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-brand-500/10 border border-brand-500/20">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold">
                      {selectedCustomer.firstName?.[0]}{selectedCustomer.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-200">
                        {selectedCustomer.firstName} {selectedCustomer.lastName}
                      </p>
                      <p className="text-xs text-surface-500">PMB {selectedCustomer.pmbNumber}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setScanCustomerId(''); setCustomerSearch(''); }}
                    className="text-xs text-surface-400 hover:text-surface-200 px-2 py-1 rounded-md hover:bg-surface-700 transition-colors"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by PMB number, name, or phone..."
                    className="w-full rounded-lg border border-surface-700 bg-surface-800 pl-10 pr-3.5 py-2.5 text-sm text-surface-200 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-colors"
                    autoFocus
                  />
                  {/* Search results dropdown */}
                  {customerSearch.trim() && filteredCustomers.length > 0 && (
                    <div className="absolute z-20 top-full mt-1 w-full bg-surface-800 border border-surface-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setScanCustomerId(c.id);
                            setCustomerSearch('');
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-700/50 transition-colors"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-600 text-[10px] font-bold text-surface-200">
                            {c.firstName?.[0]}{c.lastName?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-surface-200 truncate">
                              {c.firstName} {c.lastName}
                            </p>
                            <p className="text-[10px] text-surface-500">
                              PMB {c.pmbNumber}
                              {c.phone && ` · ${c.phone}`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {customerSearch.trim() && filteredCustomers.length === 0 && (
                    <div className="absolute z-20 top-full mt-1 w-full bg-surface-800 border border-surface-700 rounded-lg shadow-xl px-4 py-3">
                      <p className="text-xs text-surface-500">No matching customers found</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Mail Type ───────────────────────────────────── */}
            <Select
              label="Mail Type"
              value={scanMailType}
              onChange={(e) => setScanMailType(e.target.value)}
              options={[
                { value: 'letter', label: '✉️ Letter' },
                { value: 'magazine', label: '📖 Magazine' },
                { value: 'catalog', label: '📜 Catalog' },
                { value: 'legal', label: '📄 Legal' },
                { value: 'other', label: '📬 Other' },
              ]}
            />

            {/* ── Sender (optional) ───────────────────────────── */}
            <Input
              label="Sender"
              value={scanSender}
              onChange={(e) => setScanSender(e.target.value)}
              placeholder="e.g. IRS, Chase Bank, Amazon..."
            />

            {/* ── Notes (optional) ────────────────────────────── */}
            <Textarea
              label="Notes"
              value={scanNotes}
              onChange={(e) => setScanNotes(e.target.value)}
              placeholder="Any additional notes about this mail piece..."
            />

            {/* ── Error ───────────────────────────────────────── */}
            {scanError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                <X className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{scanError}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Success icon */}
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 border-2 border-green-500/30">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
            </div>

            <p className="text-center text-sm text-surface-300">
              Mail piece has been created and the customer has been notified.
              Write the code below on the physical mail piece.
            </p>

            {/* Generated Code Display */}
            <div className="mx-auto max-w-xs">
              <div className="rounded-xl bg-surface-800/80 border-2 border-brand-500/30 p-5">
                <p className="text-center text-xs text-surface-500 uppercase tracking-wider mb-2">
                  Unique Mail Code
                </p>
                <p className="text-center text-3xl font-mono font-bold text-brand-400 tracking-[0.2em] select-all">
                  {generatedCode}
                </p>
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 border border-brand-500/20 transition-colors"
                  >
                    {codeCopied ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <ClipboardCopy className="h-4 w-4" />
                        Copy Code
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
              <p className="text-xs text-amber-400 font-medium">
                {'\u26a0\ufe0f'} Write this code clearly on the physical mail
                piece before filing it.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
