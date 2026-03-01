'use client';
/* eslint-disable */

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, SearchInput } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { formatDate, cn } from '@/lib/utils';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ShieldOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Search,
  Filter,
  Users,
  FileText,
  IdCard,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  BarChart3,
  XCircle,
  Eye,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface ComplianceSummary {
  total: number;
  compliant: number;
  warning: number;
  critical: number;
  expired: number;
  missing: number;
  complianceScore: number;
  expiringNext30: number;
  expiringNext60: number;
  expiringNext90: number;
}

interface ComplianceRecord {
  customerId: string;
  firstName: string;
  lastName: string;
  pmbNumber: string;
  email: string;
  phone: string;
  customerStatus: string;
  idType: string | null;
  idExpiration: string | null;
  daysUntilIdExpiry: number | null;
  secondaryIdType: string | null;
  secondaryIdExpiry: string | null;
  daysUntilSecondaryExpiry: number | null;
  form1583Status: string;
  form1583Date: string | null;
  proofOfAddressType: string | null;
  proofOfAddressDate: string | null;
  complianceStatus: 'compliant' | 'warning' | 'critical' | 'expired' | 'missing';
  issues: string[];
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */
const statusConfig: Record<string, { color: string; bg: string; border: string; icon: typeof ShieldCheck; label: string }> = {
  compliant: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: ShieldCheck, label: 'Compliant' },
  warning: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertTriangle, label: 'Warning' },
  critical: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: ShieldAlert, label: 'Critical' },
  expired: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: ShieldX, label: 'Expired' },
  missing: { color: 'text-surface-400', bg: 'bg-surface-800/50', border: 'border-surface-700/50', icon: ShieldOff, label: 'Missing' },
};

const idTypeLabels: Record<string, string> = {
  drivers_license: "Driver's License",
  passport: 'Passport',
  state_id: 'State ID',
  military_id: 'Military ID',
  green_card: 'Green Card/PR',
  tribal_id: 'Tribal ID',
};

/* -------------------------------------------------------------------------- */
/*  Compliance Dashboard Page                                                 */
/* -------------------------------------------------------------------------- */
export default function ComplianceDashboardPage() {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [records, setRecords] = useState<ComplianceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expirationFilter, setExpirationFilter] = useState('all');

  // Detail modal
  const [selectedRecord, setSelectedRecord] = useState<ComplianceRecord | null>(null);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/compliance');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSummary(data.summary);
      setRecords(data.records || []);
    } catch (err) {
      setError('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Export CSV
  const handleExport = () => {
    window.open('/api/compliance?export=csv', '_blank');
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    let filtered = records;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.complianceStatus === statusFilter);
    }

    if (expirationFilter !== 'all') {
      const days = parseInt(expirationFilter);
      filtered = filtered.filter((r) =>
        r.daysUntilIdExpiry !== null && r.daysUntilIdExpiry > 0 && r.daysUntilIdExpiry <= days
      );
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.firstName.toLowerCase().includes(q) ||
          r.lastName.toLowerCase().includes(q) ||
          r.pmbNumber.toLowerCase().includes(q) ||
          (r.email || '').toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [records, statusFilter, expirationFilter, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="CMRA Compliance"
        description="USPS CMRA compliance dashboard — ID expiration tracking, Form 1583 status, and audit readiness."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={fetchData}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={handleExport}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Compliance Score */}
          <Card className="col-span-2 sm:col-span-1">
            <div className="flex flex-col items-center text-center">
              <div className={`flex h-14 w-14 items-center justify-center rounded-full mb-2 ${
                summary.complianceScore >= 90 ? 'bg-emerald-500/20' :
                summary.complianceScore >= 70 ? 'bg-yellow-500/20' : 'bg-red-500/20'
              }`}>
                <span className={`text-2xl font-bold ${
                  summary.complianceScore >= 90 ? 'text-emerald-400' :
                  summary.complianceScore >= 70 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {summary.complianceScore}%
                </span>
              </div>
              <p className="text-xs text-surface-500">Compliance Score</p>
            </div>
          </Card>

          {/* Total Customers */}
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                <Users className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-surface-100">{summary.total}</p>
                <p className="text-xs text-surface-500">Total</p>
              </div>
            </div>
          </Card>

          {/* Compliant */}
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-400">{summary.compliant}</p>
                <p className="text-xs text-surface-500">Compliant</p>
              </div>
            </div>
          </Card>

          {/* Warning / Expiring Soon */}
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-yellow-400">{summary.warning + summary.critical}</p>
                <p className="text-xs text-surface-500">Expiring Soon</p>
              </div>
            </div>
          </Card>

          {/* Expired */}
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
                <ShieldX className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-red-400">{summary.expired}</p>
                <p className="text-xs text-surface-500">Expired</p>
              </div>
            </div>
          </Card>

          {/* Missing */}
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-800">
                <ShieldOff className="h-5 w-5 text-surface-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-surface-400">{summary.missing}</p>
                <p className="text-xs text-surface-500">Missing</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Expiration Timeline ────────────────────────────────────────────── */}
      {summary && (summary.expiringNext30 > 0 || summary.expiringNext60 > 0 || summary.expiringNext90 > 0) && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-5 w-5 text-surface-400" />
            <h3 className="text-sm font-medium text-surface-200">Upcoming Expirations</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <button
              className={cn(
                'p-4 rounded-lg border text-center transition-all',
                expirationFilter === '30'
                  ? 'border-red-500/50 bg-red-500/10'
                  : 'border-surface-700/50 bg-surface-800/30 hover:border-surface-600'
              )}
              onClick={() => setExpirationFilter(expirationFilter === '30' ? 'all' : '30')}
            >
              <p className="text-2xl font-bold text-red-400">{summary.expiringNext30}</p>
              <p className="text-xs text-surface-500">Next 30 Days</p>
            </button>
            <button
              className={cn(
                'p-4 rounded-lg border text-center transition-all',
                expirationFilter === '60'
                  ? 'border-orange-500/50 bg-orange-500/10'
                  : 'border-surface-700/50 bg-surface-800/30 hover:border-surface-600'
              )}
              onClick={() => setExpirationFilter(expirationFilter === '60' ? 'all' : '60')}
            >
              <p className="text-2xl font-bold text-orange-400">{summary.expiringNext60}</p>
              <p className="text-xs text-surface-500">Next 60 Days</p>
            </button>
            <button
              className={cn(
                'p-4 rounded-lg border text-center transition-all',
                expirationFilter === '90'
                  ? 'border-yellow-500/50 bg-yellow-500/10'
                  : 'border-surface-700/50 bg-surface-800/30 hover:border-surface-600'
              )}
              onClick={() => setExpirationFilter(expirationFilter === '90' ? 'all' : '90')}
            >
              <p className="text-2xl font-bold text-yellow-400">{summary.expiringNext90}</p>
              <p className="text-xs text-surface-500">Next 90 Days</p>
            </button>
          </div>
        </Card>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchInput
          placeholder="Search by name, PMB, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48"
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'compliant', label: 'Compliant' },
            { value: 'warning', label: 'Warning' },
            { value: 'critical', label: 'Critical' },
            { value: 'expired', label: 'Expired' },
            { value: 'missing', label: 'Missing' },
          ]}
        />
        <div className="text-xs text-surface-500 ml-auto">
          {filteredRecords.length} of {records.length} customers
        </div>
      </div>

      {/* ── Customer Compliance Table ─────────────────────────────────────── */}
      {loading ? (
        <Card>
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 text-surface-500 animate-spin" />
          </div>
        </Card>
      ) : error ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <XCircle className="h-8 w-8 text-red-400 mb-3" />
            <p className="text-sm text-surface-400">{error}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={fetchData}>
              Retry
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700/50 bg-surface-800/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">PMB</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Primary ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Expires</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Form 1583</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Issues</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/50">
                {filteredRecords.map((record) => {
                  const cfg = statusConfig[record.complianceStatus] || statusConfig.missing;
                  const Icon = cfg.icon;
                  return (
                    <tr key={record.customerId} className="hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className={cn('flex items-center gap-2 px-2.5 py-1 rounded-full w-fit', cfg.bg, cfg.border, 'border')}>
                          <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
                          <span className={cn('text-xs font-medium', cfg.color)}>{cfg.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-surface-200">
                          {record.firstName} {record.lastName}
                        </p>
                        <p className="text-xs text-surface-500">{record.email || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-primary-600">{record.pmbNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-surface-300">
                          {record.idType ? (idTypeLabels[record.idType] || record.idType) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {record.daysUntilIdExpiry !== null ? (
                          <div>
                            <span className={cn('text-xs font-medium', 
                              record.daysUntilIdExpiry <= 0 ? 'text-red-400' :
                              record.daysUntilIdExpiry <= 30 ? 'text-orange-400' :
                              record.daysUntilIdExpiry <= 90 ? 'text-yellow-400' : 'text-surface-300'
                            )}>
                              {record.daysUntilIdExpiry <= 0 ? 'Expired' : `${record.daysUntilIdExpiry}d`}
                            </span>
                            {record.idExpiration && (
                              <p className="text-[10px] text-surface-500">{formatDate(record.idExpiration)}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-surface-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            record.form1583Status === 'approved' || record.form1583Status === 'completed'
                              ? 'success'
                              : record.form1583Status === 'pending'
                              ? 'warning'
                              : 'default'
                          }
                          dot
                          className="text-[10px]"
                        >
                          {record.form1583Status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {record.issues.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <Badge variant="danger" className="text-[10px]">
                              {record.issues.length}
                            </Badge>
                            <span className="text-[10px] text-surface-500 max-w-[120px] truncate">
                              {record.issues[0]}
                            </span>
                          </div>
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="text-surface-500 hover:text-surface-300"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredRecords.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShieldCheck className="h-10 w-10 text-surface-600 mb-3" />
              <p className="text-sm text-surface-500">
                {records.length === 0 ? 'No customer data available' : 'No matching records'}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* ── Customer Detail Modal ─────────────────────────────────────────── */}
      <Modal
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title={selectedRecord ? `${selectedRecord.firstName} ${selectedRecord.lastName}` : ''}
        description={selectedRecord?.pmbNumber || ''}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setSelectedRecord(null)}>Close</Button>
        }
      >
        {selectedRecord && (
          <div className="space-y-5">
            {/* Status banner */}
            {(() => {
              const cfg = statusConfig[selectedRecord.complianceStatus] || statusConfig.missing;
              const Icon = cfg.icon;
              return (
                <div className={cn('flex items-center gap-3 p-4 rounded-lg border', cfg.bg, cfg.border)}>
                  <Icon className={cn('h-5 w-5', cfg.color)} />
                  <div>
                    <p className={cn('text-sm font-medium', cfg.color)}>{cfg.label}</p>
                    {selectedRecord.issues.length > 0 && (
                      <p className="text-xs text-surface-400 mt-0.5">
                        {selectedRecord.issues.join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <p className="text-xs text-surface-500 mb-1">Email</p>
                <p className="text-sm text-surface-200">{selectedRecord.email || '—'}</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <p className="text-xs text-surface-500 mb-1">Phone</p>
                <p className="text-sm text-surface-200">{selectedRecord.phone || '—'}</p>
              </div>
            </div>

            {/* Primary ID */}
            <div className="p-4 rounded-lg bg-surface-800/50 border border-surface-700/50">
              <div className="flex items-center gap-2 mb-3">
                <IdCard className="h-4 w-4 text-surface-400" />
                <h4 className="text-xs text-surface-500 uppercase tracking-wider">Primary ID</h4>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-surface-500">Type</p>
                  <p className="text-sm text-surface-200">
                    {selectedRecord.idType ? (idTypeLabels[selectedRecord.idType] || selectedRecord.idType) : 'Not on file'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-surface-500">Expiration</p>
                  <p className={cn('text-sm font-medium',
                    selectedRecord.daysUntilIdExpiry !== null && selectedRecord.daysUntilIdExpiry <= 0 ? 'text-red-400' :
                    selectedRecord.daysUntilIdExpiry !== null && selectedRecord.daysUntilIdExpiry <= 30 ? 'text-orange-400' :
                    'text-surface-200'
                  )}>
                    {selectedRecord.idExpiration ? formatDate(selectedRecord.idExpiration) : 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-surface-500">Days Remaining</p>
                  <p className={cn('text-sm font-bold',
                    selectedRecord.daysUntilIdExpiry !== null && selectedRecord.daysUntilIdExpiry <= 0 ? 'text-red-400' :
                    selectedRecord.daysUntilIdExpiry !== null && selectedRecord.daysUntilIdExpiry <= 30 ? 'text-orange-400' :
                    selectedRecord.daysUntilIdExpiry !== null && selectedRecord.daysUntilIdExpiry <= 90 ? 'text-yellow-400' :
                    'text-emerald-400'
                  )}>
                    {selectedRecord.daysUntilIdExpiry !== null
                      ? selectedRecord.daysUntilIdExpiry <= 0 ? 'EXPIRED' : `${selectedRecord.daysUntilIdExpiry} days`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Secondary ID */}
            {selectedRecord.secondaryIdType && (
              <div className="p-4 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <h4 className="text-xs text-surface-500 uppercase tracking-wider mb-3">Secondary ID</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-surface-500">Type</p>
                    <p className="text-sm text-surface-200">
                      {idTypeLabels[selectedRecord.secondaryIdType] || selectedRecord.secondaryIdType}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Expiration</p>
                    <p className={cn('text-sm',
                      selectedRecord.daysUntilSecondaryExpiry !== null && selectedRecord.daysUntilSecondaryExpiry <= 0 ? 'text-red-400' : 'text-surface-200'
                    )}>
                      {selectedRecord.secondaryIdExpiry ? formatDate(selectedRecord.secondaryIdExpiry) : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Form 1583 + Proof of Address */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-surface-400" />
                  <h4 className="text-xs text-surface-500 uppercase tracking-wider">Form 1583</h4>
                </div>
                <Badge
                  variant={
                    selectedRecord.form1583Status === 'approved' || selectedRecord.form1583Status === 'completed'
                      ? 'success'
                      : selectedRecord.form1583Status === 'pending'
                      ? 'warning'
                      : 'default'
                  }
                  dot
                >
                  {selectedRecord.form1583Status}
                </Badge>
                {selectedRecord.form1583Date && (
                  <p className="text-xs text-surface-500 mt-1">
                    Signed: {formatDate(selectedRecord.form1583Date)}
                  </p>
                )}
              </div>
              <div className="p-4 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <h4 className="text-xs text-surface-500 uppercase tracking-wider mb-2">Proof of Address</h4>
                <p className="text-sm text-surface-200">
                  {selectedRecord.proofOfAddressType || 'Not on file'}
                </p>
                {selectedRecord.proofOfAddressDate && (
                  <p className="text-xs text-surface-500 mt-1">
                    Verified: {formatDate(selectedRecord.proofOfAddressDate)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
