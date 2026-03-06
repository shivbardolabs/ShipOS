'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input, SearchInput } from '@/components/ui/input';
import {
  Search, Package, CheckCircle2, AlertTriangle, Undo2, UserPlus,
} from 'lucide-react';
import { CustomerAvatar } from '@/components/ui/customer-avatar';
import type { SearchCustomer, PackageProgram } from './types';
import { SEARCH_CATEGORY_META, detectSearchCategory, packageProgramOptions } from './types';

export interface Step1Props {
  packageProgram: PackageProgram;
  setPackageProgram: (v: PackageProgram) => void;
  enabledPrograms: typeof import('./types').packageProgramOptions;
  customerSearch: string;
  setCustomerSearch: (v: string) => void;
  filteredCustomers: SearchCustomer[];
  customersLoading: boolean;
  selectedCustomer: SearchCustomer | null;
  setSelectedCustomer: (v: SearchCustomer | null) => void;
  isWalkIn: boolean;
  setIsWalkIn: (v: boolean) => void;
  walkInName: string;
  setWalkInName: (v: string) => void;
  recipientName: string;
  setRecipientName: (v: string) => void;
  kinekNumber: string;
  setKinekNumber: (v: string) => void;
  handleCustomerSelect: (customer: SearchCustomer) => void;
  setShowRtsDialog: (v: boolean) => void;
  setStep: (v: number) => void;
  step: number;
}

const platformColors: Record<string, string> = {
  mailbox: 'info', carrier: 'success', platform: 'warning', premium: 'default',
};

export function Step1IdentifyCustomer(props: Step1Props) {
  const {
    packageProgram, setPackageProgram, enabledPrograms,
    customerSearch, setCustomerSearch, filteredCustomers, customersLoading,
    selectedCustomer, setSelectedCustomer,
    isWalkIn, setIsWalkIn, walkInName, setWalkInName,
    recipientName, setRecipientName, kinekNumber, setKinekNumber,
    handleCustomerSelect, setShowRtsDialog, setStep, step,
  } = props;

  const detectedCategory = detectSearchCategory(customerSearch);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-1">
          Identify Recipient
        </h2>
        <p className="text-sm text-surface-400">
          Select the package program, then identify the recipient
        </p>
      </div>

      {/* Package Program Selector (BAR-266) */}
      <div>
        <label className="text-sm font-medium text-surface-300 mb-3 block">
          Package Program
        </label>
        <div className="flex flex-wrap gap-2">
          {enabledPrograms.map((prog) => {
            const isActive = packageProgram === prog.id;
            return (
              <button type="button"
                key={prog.id}
                onClick={() => {
                  setPackageProgram(prog.id as PackageProgram);
                  // Reset recipient fields when switching programs
                  setSelectedCustomer(null);
                  setCustomerSearch('');
                  setIsWalkIn(false);
                  setWalkInName('');
                  setRecipientName('');
                  setKinekNumber('');
                }}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all',
                  isActive ? prog.activeColor : prog.color
                )}
              >
                <span>{prog.icon}</span>
                <span>{prog.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── PMB Flow ─────────────────────────────────────────────── */}
      {packageProgram === 'pmb' && (
        <>
          {/* Walk-in toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-800/40 border border-surface-700/50 max-w-lg">
            <input
              type="checkbox"
              checked={isWalkIn}
              onChange={(e) => { setIsWalkIn(e.target.checked); if (!e.target.checked) setWalkInName(''); setSelectedCustomer(null); }}
              className="h-4 w-4 rounded border-surface-600 text-primary-600 focus:ring-primary-500"
              id="walk-in-toggle"
            />
            <label htmlFor="walk-in-toggle" className="text-sm text-surface-300 cursor-pointer">
              Walk-in customer (no mailbox)
            </label>
          </div>

          {isWalkIn ? (
            <div className="max-w-lg">
              <label className="text-sm font-medium text-surface-300 mb-2 block">Walk-In Customer Name</label>
              <Input
                placeholder="Enter customer name..."
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                className="!py-3"
              />
              {walkInName.trim() && (
                <p className="mt-2 text-xs text-status-success-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Package will be checked in for walk-in: {walkInName}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* BAR-324: Unified search box with auto-detect indicator */}
              <div className="max-w-lg space-y-2">
                <SearchInput
                  placeholder="Search by PMB #, name, phone, or company..."
                  value={customerSearch}
                  onSearch={setCustomerSearch}
                  autoFocus
                />
                {/* Detected category indicator — only show when user is typing */}
                {customerSearch.trim() && (
                  <div className="flex items-center gap-2">
                    {(() => {
                      const meta = SEARCH_CATEGORY_META[detectedCategory];
                      const Icon = meta.icon;
                      return (
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-all',
                          meta.color,
                        )}>
                          <Icon className="h-3 w-3" />
                          Searching {meta.label}
                        </span>
                      );
                    })()}
                    <span className="text-[11px] text-surface-500">
                      {detectedCategory === 'pmb' && 'Detected number pattern'}
                      {detectedCategory === 'phone' && 'Detected phone pattern'}
                      {detectedCategory === 'name_company' && 'Searching name & company'}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {!isWalkIn && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCustomers.map((cust) => {
                const isSelected = selectedCustomer?.id === cust.id;
                return (
                  <button type="button"
                    key={cust.id}
                    onClick={() => handleCustomerSelect(cust)}
                    className={cn(
                      'flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200',
                      isSelected
                        ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500/30 scale-[0.98]'
                        : 'border-surface-700/50 bg-surface-900/60 hover:border-surface-600 hover:bg-surface-800/60'
                    )}
                  >
                    <CustomerAvatar
                      firstName={cust.firstName}
                      lastName={cust.lastName}
                      photoUrl={cust.photoUrl}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-surface-200 text-sm truncate">
                          {cust.firstName} {cust.lastName}
                        </p>
                        <Badge
                          variant={
                            (platformColors[cust.platform] as 'default' | 'info' | 'success' | 'warning') ||
                            'default'
                          }
                          dot={false}
                        >
                          {cust.platform}
                        </Badge>
                        {/* BAR-38: Status badge for non-active customers */}
                        {cust.status !== 'active' && (
                          <Badge
                            variant={cust.status === 'suspended' ? 'warning' : 'default'}
                            dot={false}
                          >
                            {cust.status === 'suspended' ? 'Suspended' : 'Closed'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs font-mono text-primary-600">
                          {cust.pmbNumber}
                        </span>
                        {cust.businessName && (
                          <span className="text-xs text-surface-500 truncate">
                            {cust.businessName}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 text-primary-600 shrink-0" />
                    )}
                  </button>
                );
              })}
              {filteredCustomers.length === 0 && (
                <div className="col-span-2 py-12 text-center text-surface-500">
                  <Search className="mx-auto h-8 w-8 mb-3 text-surface-600" />
                  <p>No customers found matching your search</p>
                  <p className="text-xs text-surface-600 mt-2">
                    If no customer can be matched, you can return this package to the sender.
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-3">
                    <a
                      href="/dashboard/customers/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary-900/20 text-primary-400 hover:bg-primary-900/30 border border-primary-800/30 transition-colors"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Create New Customer
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowRtsDialog(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-red-900/20 text-status-error-400 hover:bg-red-900/30 border border-status-error-800/30 transition-colors"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Return to Sender
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── UPS AP / FedEx HAL / Amazon Flow (BAR-266) ───────────── */}
      {(packageProgram === 'ups_ap' || packageProgram === 'fedex_hal' || packageProgram === 'amazon') && (
        <div className="max-w-lg space-y-4">
          <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/50">
            <p className="text-xs text-surface-400 flex items-center gap-2">
              <Package className="h-3.5 w-3.5" />
              {packageProgram === 'ups_ap' && 'UPS Access Point — transient recipient (no customer profile required)'}
              {packageProgram === 'fedex_hal' && 'FedEx Hold At Location — transient recipient (no customer profile required)'}
              {packageProgram === 'amazon' && 'Amazon package — transient recipient (no customer profile required)'}
            </p>
          </div>
          <div>
            <Input
              label="Recipient Name"
              placeholder="Enter recipient name from package..."
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="!py-3"
            />
          </div>
          {recipientName.trim() && (
            <p className="text-xs text-status-success-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Package will be checked in for: {recipientName}
              <Badge variant="default" dot={false} className="ml-1">
                {packageProgram === 'ups_ap' ? 'UPS AP' : packageProgram === 'fedex_hal' ? 'FedEx HAL' : 'Amazon'}
              </Badge>
            </p>
          )}
        </div>
      )}

      {/* ── KINEK Flow (BAR-266) ─────────────────────────────────── */}
      {packageProgram === 'kinek' && (
        <div className="max-w-lg space-y-4">
          <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/50">
            <p className="text-xs text-surface-400 flex items-center gap-2">
              <Package className="h-3.5 w-3.5" />
              KINEK network — recipient identified by 7-digit KINEK number
            </p>
          </div>
          <div>
            <Input
              label="Recipient Name"
              placeholder="Enter recipient name from package..."
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="!py-3"
            />
          </div>
          <div>
            <Input
              label="KINEK Number"
              placeholder="Enter 7-digit KINEK number..."
              value={kinekNumber}
              onChange={(e) => {
                // Only allow digits, max 7
                const val = e.target.value.replace(/\D/g, '').slice(0, 7);
                setKinekNumber(val);
              }}
              className="!py-3 font-mono"
            />
            {kinekNumber.length > 0 && kinekNumber.length < 7 && (
              <p className="mt-1 text-xs text-status-warning-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                KINEK number must be 7 digits ({kinekNumber.length}/7)
              </p>
            )}
            {kinekNumber.length === 7 && (
              <p className="mt-1 text-xs text-status-success-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Valid KINEK number
              </p>
            )}
          </div>
          {recipientName.trim() && kinekNumber.length === 7 && (
            <p className="text-xs text-status-success-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Package will be checked in for: {recipientName}
              <Badge variant="default" dot={false} className="ml-1">KINEK #{kinekNumber}</Badge>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
