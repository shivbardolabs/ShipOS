'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput, Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { customers as mockCustomers } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import type { Customer } from '@/lib/types';
import {
  UserPlus, Package, Mail, Phone, ChevronLeft, ChevronRight, LayoutGrid, List,
  AlertTriangle, Upload, FileSpreadsheet, CheckCircle2, XCircle, ChevronDown,
  User, Download, AlertCircle,
} from 'lucide-react';
import { CustomerAvatar } from '@/components/ui/customer-avatar';

const platformBadge: Record<string, { label: string; classes: string }> = {
  physical: { label: 'Physical PMB', classes: 'bg-amber-100 text-amber-600 border-amber-500/30' },
  iPostal: { label: 'iPostal', classes: 'bg-blue-100 text-blue-600 border-blue-500/30' },
  anytime: { label: 'Anytime', classes: 'bg-emerald-100 text-emerald-600 border-emerald-200' },
  postscan: { label: 'PostScan', classes: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
  other: { label: 'Other', classes: 'bg-surface-600/30 text-surface-300 border-surface-600/40' },
};

const statusDot: Record<string, string> = { active: 'bg-emerald-400', suspended: 'bg-yellow-400', closed: 'bg-surface-500' };

function getIdExpirationStatus(customer: Customer): { label: string; color: string } | null {
  if (!customer.idExpiration) return null;
  const now = new Date();
  const exp = new Date(customer.idExpiration);
  const days = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
  if (days < 0) return { label: 'EXPIRED', color: 'bg-red-100 text-red-600 border-red-200' };
  if (days <= 30) return { label: `${days}d left`, color: 'bg-red-100 text-red-600 border-red-200' };
  if (days <= 90) return { label: `${days}d left`, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
  return { label: `${days}d left`, color: 'bg-emerald-100 text-emerald-600 border-emerald-200' };
}

const STATUS_FILTERS = [
  { id: 'all', label: 'All' }, { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' }, { id: 'closed', label: 'Closed' },
] as const;

const PLATFORM_FILTERS = [
  { id: 'all', label: 'All Stores' },
  { id: 'physical', label: 'Physical PMB' }, { id: 'iPostal', label: 'iPostal' },
  { id: 'anytime', label: 'Anytime' }, { id: 'postscan', label: 'PostScan' },
  { id: 'other', label: 'Other' },
] as const;

const PAGE_SIZE = 12;

const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', phone: '', businessName: '',
  pmbNumber: '', platform: 'iPostal' as Customer['platform'],
  billingTerms: 'Monthly', idType: '' as string,
  notifyEmail: true, notifySms: true, notes: '',
};

interface ParsedRow { [key: string]: string }

interface ImportPreview {
  fileName: string; headers: string[]; rows: ParsedRow[];
  mapping: Record<string, string>;
}

const IMPORTABLE_FIELDS = [
  { key: 'firstName', label: 'First Name', required: true },
  { key: 'lastName', label: 'Last Name', required: true },
  { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
  { key: 'businessName', label: 'Business Name' },
  { key: 'pmbNumber', label: 'PMB Number' },
  { key: 'platform', label: 'Store' },
  { key: 'billingTerms', label: 'Billing Terms' },
  { key: 'notes', label: 'Notes' },
];

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';
  const parseLine = (line: string): string[] => {
    const result: string[] = []; let current = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i+1] === '"') { current += '"'; i++; } else inQ = !inQ; }
      else if (ch === delimiter && !inQ) { result.push(current.trim()); current = ''; }
      else current += ch;
    }
    result.push(current.trim()); return result;
  };
  const headers = parseLine(lines[0]);
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: ParsedRow = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  return { headers, rows };
}

function autoMapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const patterns: Record<string, RegExp> = {
    firstName: /first.?name|fname|first/i, lastName: /last.?name|lname|last|surname/i,
    email: /email|e.?mail/i, phone: /phone|mobile|cell|telephone/i,
    businessName: /business|company|org/i, pmbNumber: /pmb|mailbox|box.?num/i,
    platform: /platform|store|source|channel/i, billingTerms: /billing|term|plan/i,
    notes: /note|comment|memo/i,
  };
  for (const header of headers) {
    for (const [field, regex] of Object.entries(patterns)) {
      if (regex.test(header) && !Object.values(mapping).includes(field)) {
        mapping[header] = field; break;
      }
    }
  }
  return mapping;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers] = useState<Customer[]>(mockCustomers);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [addSuccess, setAddSuccess] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload');
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let result = customers;
    if (statusFilter !== 'all') result = result.filter((c) => c.status === statusFilter);
    if (platformFilter !== 'all') result = result.filter((c) => c.platform === platformFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.pmbNumber.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.businessName && c.businessName.toLowerCase().includes(q))
      );
    }
    return result;
  }, [customers, search, statusFilter, platformFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const activeCount = customers.filter((c) => c.status === 'active').length;

  const handleFormChange = useCallback((field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!form.firstName.trim()) errors.firstName = 'First name is required';
    if (!form.lastName.trim()) errors.lastName = 'Last name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Invalid email address';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  const handleAddCustomer = useCallback(() => {
    if (!validateForm()) return;
    setAddSuccess(true);
    setTimeout(() => { setShowAddModal(false); setAddSuccess(false); setForm(EMPTY_FORM); setFormErrors({}); }, 1500);
  }, [validateForm]);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (headers.length === 0 || rows.length === 0) { setImportErrors(['Could not parse file. Please check the format.']); return; }
      const mapping = autoMapColumns(headers);
      setImportPreview({ fileName: file.name, headers, rows, mapping });
      setImportErrors([]); setImportStep('map');
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.tsv') || file.name.endsWith('.txt'))) handleFileUpload(file);
    else setImportErrors(['Please upload a CSV file']);
  }, [handleFileUpload]);

  const handleMappingChange = useCallback((csvHeader: string, field: string) => {
    setImportPreview((prev) => {
      if (!prev) return prev;
      const newMapping = { ...prev.mapping };
      if (field === '') { delete newMapping[csvHeader]; }
      else { for (const key of Object.keys(newMapping)) { if (newMapping[key] === field) delete newMapping[key]; } newMapping[csvHeader] = field; }
      return { ...prev, mapping: newMapping };
    });
  }, []);

  const validateImportMapping = useCallback((): boolean => {
    if (!importPreview) return false;
    const mapped = new Set(Object.values(importPreview.mapping));
    const missing = IMPORTABLE_FIELDS.filter((f) => f.required && !mapped.has(f.key));
    if (missing.length > 0) { setImportErrors(missing.map((f) => `"${f.label}" must be mapped to a column`)); return false; }
    setImportErrors([]); return true;
  }, [importPreview]);

  const handleImportConfirm = useCallback(() => {
    if (!importPreview) return;
    setImportedCount(importPreview.rows.length); setImportStep('done');
  }, [importPreview]);

  const resetImport = useCallback(() => {
    setImportStep('upload'); setImportPreview(null); setImportErrors([]); setImportedCount(0);
  }, []);

  const downloadTemplate = useCallback(() => {
    const csv = 'First Name,Last Name,Email,Phone,Business Name,PMB Number,Store,Billing Terms,Notes\nJohn,Smith,john@example.com,(555) 555-0100,Smith LLC,PMB-0100,iPostal,Monthly,VIP customer';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'customer_import_template.csv'; a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description={`${customers.length} total · ${activeCount} active`}
        actions={
          <div className="relative">
            <div className="flex items-center">
              <Button leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => router.push('/dashboard/customers/new')} className="rounded-r-none">New Customer Setup</Button>
              <Button variant="default" className="rounded-l-none border-l border-primary-700 px-2" onClick={() => setShowAddDropdown(!showAddDropdown)}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            {showAddDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAddDropdown(false)} />
                <div className="absolute right-0 top-11 z-50 w-52 rounded-lg border border-surface-700 bg-surface-900 shadow-xl py-1">
                  <button onClick={() => { setShowAddDropdown(false); router.push('/dashboard/customers/new'); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-surface-300 hover:bg-surface-800 transition-colors">
                    <User className="h-4 w-4 text-surface-400" /> Full Setup Wizard
                  </button>
                  <button onClick={() => { setShowAddDropdown(false); setShowAddModal(true); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-surface-300 hover:bg-surface-800 transition-colors">
                    <User className="h-4 w-4 text-surface-400" /> Quick Add (Basic)
                  </button>
                  <button onClick={() => { setShowAddDropdown(false); setShowImportModal(true); resetImport(); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-surface-300 hover:bg-surface-800 transition-colors">
                    <Upload className="h-4 w-4 text-surface-400" /> Bulk Import (CSV)
                  </button>
                </div>
              </>
            )}
          </div>
        }
      />

      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput placeholder="Search by name, PMB, email, phone..." value={search} onSearch={(v) => { setSearch(v); setPage(0); }} className="flex-1 min-w-[280px]" />
          <div className="flex items-center gap-1 ml-auto">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" iconOnly onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" iconOnly onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-1">
            {STATUS_FILTERS.map((f) => (
              <button key={f.id} onClick={() => { setStatusFilter(f.id); setPage(0); }}
                className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  statusFilter === f.id ? 'bg-primary-50 text-primary-600 border border-primary-200' : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200 border border-transparent')}>
                {f.label}{f.id !== 'all' && <span className="ml-1.5 text-xs opacity-70">{customers.filter((c) => c.status === f.id).length}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {PLATFORM_FILTERS.map((f) => (
              <button key={f.id} onClick={() => { setPlatformFilter(f.id); setPage(0); }}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  platformFilter === f.id ? 'bg-surface-700 text-surface-200 border border-surface-600' : 'text-surface-500 hover:bg-surface-800 hover:text-surface-300 border border-transparent')}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm text-surface-500">{filtered.length} customer{filtered.length !== 1 ? 's' : ''} found</p>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paged.map((customer) => {
            const idStatus = getIdExpirationStatus(customer);
            const plat = platformBadge[customer.platform];
            return (
              <div key={customer.id} onClick={() => router.push(`/dashboard/customers/${customer.id}`)} className="glass-card p-5 card-hover cursor-pointer group">
                <div className="flex items-start gap-4">
                  <CustomerAvatar firstName={customer.firstName} lastName={customer.lastName} photoUrl={customer.photoUrl} size="lg" className="shadow-lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-surface-100 truncate group-hover:text-primary-600 transition-colors">{customer.firstName} {customer.lastName}</h3>
                      <span className={cn('h-2 w-2 rounded-full flex-shrink-0', statusDot[customer.status])} />
                    </div>
                    {customer.businessName && <p className="text-xs text-surface-400 truncate mt-0.5">{customer.businessName}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge dot={false} className="text-[10px]">{customer.pmbNumber}</Badge>
                      <span className={cn('status-badge text-[10px]', plat.classes)}>{plat.label}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-surface-800 space-y-2">
                  {customer.email && <p className="text-xs text-surface-400 truncate"><Mail className="inline h-3 w-3 mr-1.5 -mt-0.5" />{customer.email}</p>}
                  {customer.phone && <p className="text-xs text-surface-400"><Phone className="inline h-3 w-3 mr-1.5 -mt-0.5" />{customer.phone}</p>}
                </div>
                <div className="mt-3 pt-3 border-t border-surface-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-surface-500 flex items-center gap-1"><Package className="h-3 w-3" />{customer.packageCount ?? 0}</span>
                    <span className="text-xs text-surface-500 flex items-center gap-1"><Mail className="h-3 w-3" />{customer.mailCount ?? 0}</span>
                  </div>
                  {idStatus && <span className={cn('status-badge text-[10px]', idStatus.color)}>{idStatus.label === 'EXPIRED' && <AlertTriangle className="h-3 w-3 mr-1" />}{idStatus.label}</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {paged.map((customer) => {
            const idStatus = getIdExpirationStatus(customer);
            const plat = platformBadge[customer.platform];
            return (
              <div key={customer.id} onClick={() => router.push(`/dashboard/customers/${customer.id}`)} className="glass-card p-4 card-hover cursor-pointer group flex items-center gap-4">
                <CustomerAvatar firstName={customer.firstName} lastName={customer.lastName} photoUrl={customer.photoUrl} size="sm" />
                <div className="flex-1 min-w-0 flex items-center gap-4 flex-wrap">
                  <div className="min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-surface-100 group-hover:text-primary-600 transition-colors">{customer.firstName} {customer.lastName}</span>
                      <span className={cn('h-2 w-2 rounded-full', statusDot[customer.status])} />
                    </div>
                    {customer.businessName && <p className="text-xs text-surface-400 truncate">{customer.businessName}</p>}
                  </div>
                  <Badge dot={false} className="text-[10px]">{customer.pmbNumber}</Badge>
                  <span className={cn('status-badge text-[10px]', plat.classes)}>{plat.label}</span>
                  <span className="text-xs text-surface-400 hidden md:inline">{customer.email}</span>
                  <div className="flex items-center gap-3 ml-auto">
                    <span className="text-xs text-surface-500 flex items-center gap-1"><Package className="h-3 w-3" /> {customer.packageCount ?? 0}</span>
                    {idStatus && <span className={cn('status-badge text-[10px]', idStatus.color)}>{idStatus.label}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && <div className="glass-card p-12 text-center"><p className="text-surface-400 text-sm">No customers match your filters.</p></div>}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-surface-400">
          <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" iconOnly disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="px-3 text-surface-300">{page + 1} / {totalPages}</span>
            <Button variant="ghost" size="sm" iconOnly disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Add Single Customer Modal */}
      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setForm(EMPTY_FORM); setFormErrors({}); setAddSuccess(false); }}
        title="Add Customer" description="Create a new customer record" size="lg"
        footer={addSuccess ? undefined : (
          <>
            <Button variant="secondary" onClick={() => { setShowAddModal(false); setForm(EMPTY_FORM); setFormErrors({}); }}>Cancel</Button>
            <Button leftIcon={<UserPlus className="h-4 w-4" />} onClick={handleAddCustomer}>Add Customer</Button>
          </>
        )}>
        {addSuccess ? (
          <div className="flex flex-col items-center text-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 mb-4"><CheckCircle2 className="h-8 w-8 text-emerald-600" /></div>
            <h3 className="text-lg font-semibold text-surface-100 mb-1">Customer Added!</h3>
            <p className="text-sm text-surface-400"><span className="font-medium text-surface-200">{form.firstName} {form.lastName}</span>{form.pmbNumber ? ` (${form.pmbNumber})` : ''} has been created.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="First Name *" placeholder="John" value={form.firstName} onChange={(e) => handleFormChange('firstName', e.target.value)} error={formErrors.firstName} />
                <Input label="Last Name *" placeholder="Smith" value={form.lastName} onChange={(e) => handleFormChange('lastName', e.target.value)} error={formErrors.lastName} />
                <Input label="Email" type="email" placeholder="john@example.com" value={form.email} onChange={(e) => handleFormChange('email', e.target.value)} error={formErrors.email} />
                <Input label="Phone" type="tel" placeholder="(555) 555-0100" value={form.phone} onChange={(e) => handleFormChange('phone', e.target.value)} />
                <div className="sm:col-span-2"><Input label="Business Name" placeholder="Optional — business or LLC name" value={form.businessName} onChange={(e) => handleFormChange('businessName', e.target.value)} /></div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">Mailbox Setup</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="PMB Number" placeholder="PMB-0100" value={form.pmbNumber} onChange={(e) => handleFormChange('pmbNumber', e.target.value)} error={formErrors.pmbNumber} />
                <Select label="Store" options={[{ value: 'physical', label: 'Physical PMB' },{ value: 'iPostal', label: 'iPostal' },{ value: 'anytime', label: 'Anytime Mailbox' },{ value: 'postscan', label: 'PostScan Mail' },{ value: 'other', label: 'Other' }]} value={form.platform} onChange={(e) => handleFormChange('platform', e.target.value)} />
                <Select label="Billing Terms" options={[{ value: 'Monthly', label: 'Monthly' },{ value: 'Quarterly', label: 'Quarterly' },{ value: 'Semiannual', label: 'Semiannual (6 months)' },{ value: 'Annual', label: 'Annual' },{ value: 'Custom', label: 'Custom' }]} value={form.billingTerms} onChange={(e) => handleFormChange('billingTerms', e.target.value)} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">ID & Compliance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="ID Type" placeholder="Select..." options={[{ value: 'drivers_license', label: "Driver's License" },{ value: 'passport', label: 'Passport' },{ value: 'both', label: "Both Driver's License and Passport" },{ value: 'military_id', label: 'Military ID' },{ value: 'other', label: 'Other' }]} value={form.idType} onChange={(e) => handleFormChange('idType', e.target.value)} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">Proof of Address (CMRA)</h3>
              <div className="rounded-lg border border-surface-700/50 bg-surface-800/20 p-4">
                <p className="text-sm text-surface-400">Proof of address documents will be configurable here. <span className="text-surface-500 italic">— details coming soon from Charlie.</span></p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">Notification Preferences</h3>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.notifyEmail} onChange={(e) => handleFormChange('notifyEmail', e.target.checked)} className="h-4 w-4 rounded border-surface-600 bg-surface-800 text-primary-600 focus:ring-primary-500/30" />
                  <span className="text-sm text-surface-300">Email notifications</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.notifySms} onChange={(e) => handleFormChange('notifySms', e.target.checked)} className="h-4 w-4 rounded border-surface-600 bg-surface-800 text-primary-600 focus:ring-primary-500/30" />
                  <span className="text-sm text-surface-300">SMS notifications</span>
                </label>
              </div>
            </div>
            <Textarea label="Notes" placeholder="Any notes about this customer..." value={form.notes} onChange={(e) => handleFormChange('notes', e.target.value)} rows={3} />
          </div>
        )}
      </Modal>

      {/* Bulk Import Modal */}
      <Modal open={showImportModal} onClose={() => { setShowImportModal(false); resetImport(); }}
        title="Bulk Import Customers"
        description={importStep === 'upload' ? 'Upload a CSV file with customer data' : importStep === 'map' ? 'Map your columns to customer fields' : importStep === 'preview' ? 'Review before importing' : 'Import complete'}
        size="xl"
        footer={
          importStep === 'upload' ? (
            <><Button variant="ghost" leftIcon={<Download className="h-4 w-4" />} onClick={downloadTemplate}>Download Template</Button><Button variant="secondary" onClick={() => setShowImportModal(false)}>Cancel</Button></>
          ) : importStep === 'map' ? (
            <><Button variant="secondary" onClick={() => { setImportStep('upload'); setImportPreview(null); setImportErrors([]); }}>Back</Button><Button onClick={() => { if (validateImportMapping()) setImportStep('preview'); }}>Next: Preview</Button></>
          ) : importStep === 'preview' ? (
            <><Button variant="secondary" onClick={() => setImportStep('map')}>Back</Button><Button leftIcon={<Upload className="h-4 w-4" />} onClick={handleImportConfirm}>Import {importPreview?.rows.length} Customer{importPreview && importPreview.rows.length !== 1 ? 's' : ''}</Button></>
          ) : (<Button onClick={() => { setShowImportModal(false); resetImport(); }}>Done</Button>)
        }>

        {importStep === 'upload' && (
          <div className="space-y-4">
            <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 p-12 rounded-xl border-2 border-dashed border-surface-600 bg-surface-800/30 hover:border-primary-500/50 hover:bg-surface-800/50 transition-all cursor-pointer">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-700/50"><FileSpreadsheet className="h-6 w-6 text-surface-400" /></div>
              <div className="text-center">
                <p className="text-sm font-medium text-surface-200">Drag & drop your CSV here</p>
                <p className="text-xs text-surface-500 mt-1">or click to browse &bull; CSV, TSV supported</p>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); e.target.value = ''; }} />
            {importErrors.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" /><div className="text-sm text-red-400">{importErrors.join('. ')}</div>
              </div>
            )}
            <div className="rounded-lg border border-surface-700/50 bg-surface-800/30 p-4">
              <h4 className="text-sm font-medium text-surface-200 mb-2">Expected Format</h4>
              <p className="text-xs text-surface-400 mb-3">Your CSV should have a header row. We auto-detect the column mapping. Required: <span className="text-surface-200">First Name, Last Name</span></p>
              <div className="overflow-x-auto">
                <table className="text-xs text-surface-400 border border-surface-700 rounded">
                  <thead><tr className="bg-surface-800">
                    <th className="px-3 py-1.5 text-left font-medium text-surface-300">First Name</th>
                    <th className="px-3 py-1.5 text-left font-medium text-surface-300">Last Name</th>
                    <th className="px-3 py-1.5 text-left font-medium text-surface-300">Email</th>
                    <th className="px-3 py-1.5 text-left font-medium text-surface-300">Phone</th>
                    <th className="px-3 py-1.5 text-left font-medium text-surface-300">PMB Number</th>
                    <th className="px-3 py-1.5 text-left font-medium text-surface-300">Store</th>
                  </tr></thead>
                  <tbody><tr>
                    <td className="px-3 py-1.5">John</td><td className="px-3 py-1.5">Smith</td>
                    <td className="px-3 py-1.5">john@example.com</td><td className="px-3 py-1.5">(555) 555-0100</td>
                    <td className="px-3 py-1.5">PMB-0100</td><td className="px-3 py-1.5">iPostal</td>
                  </tr></tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {importStep === 'map' && importPreview && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-surface-400">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="font-medium text-surface-200">{importPreview.fileName}</span>
              <span>&mdash; {importPreview.rows.length} row{importPreview.rows.length !== 1 ? 's' : ''} detected</span>
            </div>
            <div className="rounded-lg border border-surface-700/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-surface-800/80">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">CSV Column</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Sample Value</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Maps To</th>
                </tr></thead>
                <tbody className="divide-y divide-surface-800">
                  {importPreview.headers.map((header) => {
                    const mapped = importPreview.mapping[header] || '';
                    const fieldInfo = IMPORTABLE_FIELDS.find((f) => f.key === mapped);
                    return (
                      <tr key={header} className="hover:bg-surface-800/40">
                        <td className="px-4 py-2.5 text-surface-200 font-medium">{header}</td>
                        <td className="px-4 py-2.5 text-surface-400 text-xs font-mono truncate max-w-[200px]">{importPreview.rows[0]?.[header] || '\u2014'}</td>
                        <td className="px-4 py-2.5">
                          <select value={mapped} onChange={(e) => handleMappingChange(header, e.target.value)}
                            className={cn('w-full rounded-md border bg-surface-900 px-2.5 py-1.5 text-xs outline-none transition-colors',
                              mapped ? 'border-emerald-500/40 text-emerald-400' : 'border-surface-700 text-surface-400')}>
                            <option value="">&mdash; Skip this column &mdash;</option>
                            {IMPORTABLE_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>)}
                          </select>
                          {fieldInfo?.required && <span className="text-[10px] text-emerald-500 ml-1">Required &#10003;</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {importErrors.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div className="text-sm text-red-400 space-y-1">{importErrors.map((err, i) => <p key={i}>{err}</p>)}</div>
              </div>
            )}
          </div>
        )}

        {importStep === 'preview' && importPreview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-surface-400"><span className="text-surface-200 font-semibold">{importPreview.rows.length}</span> customers will be imported</p>
              <Badge variant="info" dot={false}>Preview</Badge>
            </div>
            <div className="rounded-lg border border-surface-700/50 overflow-x-auto max-h-[350px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface-800/95 backdrop-blur-sm">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-surface-400 w-10">#</th>
                    {Object.entries(importPreview.mapping).map(([, field]) => {
                      const info = IMPORTABLE_FIELDS.find((f) => f.key === field);
                      return <th key={field} className="px-3 py-2 text-left font-medium text-surface-400">{info?.label || field}</th>;
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/50">
                  {importPreview.rows.slice(0, 20).map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-800/30">
                      <td className="px-3 py-2 text-surface-500">{idx + 1}</td>
                      {Object.entries(importPreview.mapping).map(([csvCol, field]) => (
                        <td key={field} className="px-3 py-2 text-surface-300 truncate max-w-[200px]">{row[csvCol] || <span className="text-surface-600">&mdash;</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {importPreview.rows.length > 20 && <p className="text-xs text-surface-500 text-center">Showing first 20 of {importPreview.rows.length} rows</p>}
          </div>
        )}

        {importStep === 'done' && (
          <div className="flex flex-col items-center text-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 mb-4"><CheckCircle2 className="h-8 w-8 text-emerald-600" /></div>
            <h3 className="text-lg font-semibold text-surface-100 mb-1">Import Complete!</h3>
            <p className="text-sm text-surface-400">Successfully imported <span className="text-surface-200 font-medium">{importedCount}</span> customer{importedCount !== 1 ? 's' : ''}.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
