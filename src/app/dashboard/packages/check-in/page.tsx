'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea, SearchInput } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  Search,
  ArrowLeft,
  ArrowRight,
  Check,
  ScanBarcode,
  Package,
  Mail,
  MessageSquare,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Snowflake } from 'lucide-react';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import { CustomerAvatar } from '@/components/ui/customer-avatar';
import { PerformedBy } from '@/components/ui/performed-by';
import { useActivityLog } from '@/components/activity-log-provider';
import { customers } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import type { Customer } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/*  Step Config                                                               */
/* -------------------------------------------------------------------------- */
const STEPS = [
  { id: 1, label: 'Identify Customer' },
  { id: 2, label: 'Carrier & Sender' },
  { id: 3, label: 'Package Details' },
  { id: 4, label: 'Confirm & Notify' },
];

/* -------------------------------------------------------------------------- */
/*  Carrier Config                                                            */
/* -------------------------------------------------------------------------- */
const carrierOptions = [
  { id: 'amazon', label: 'Amazon', color: 'border-orange-500/40 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20', active: 'border-orange-500 bg-orange-500/20 ring-1 ring-orange-500/30' },
  { id: 'ups', label: 'UPS', color: 'border-amber-700/40 bg-amber-900/20 text-amber-500 hover:bg-amber-900/30', active: 'border-amber-600 bg-amber-900/30 ring-1 ring-amber-500/30' },
  { id: 'fedex', label: 'FedEx', color: 'border-indigo-300/40 bg-indigo-50 text-indigo-600 hover:bg-indigo-100', active: 'border-indigo-500 bg-indigo-100 ring-1 ring-indigo-500/30' },
  { id: 'usps', label: 'USPS', color: 'border-blue-500/40 bg-blue-50 text-blue-600 hover:bg-blue-100', active: 'border-blue-500 bg-blue-100 ring-1 ring-blue-500/30' },
  { id: 'dhl', label: 'DHL', color: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20', active: 'border-yellow-500 bg-yellow-500/20 ring-1 ring-yellow-500/30' },
  { id: 'lasership', label: 'LaserShip', color: 'border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20', active: 'border-green-500 bg-green-500/20 ring-1 ring-green-500/30' },
  { id: 'temu', label: 'Temu', color: 'border-orange-600/40 bg-orange-600/10 text-orange-500 hover:bg-orange-600/20', active: 'border-orange-600 bg-orange-600/20 ring-1 ring-orange-600/30' },
  { id: 'ontrac', label: 'OnTrac', color: 'border-blue-600/40 bg-blue-600/10 text-blue-300 hover:bg-blue-600/20', active: 'border-blue-600 bg-blue-600/20 ring-1 ring-blue-600/30' },
  { id: 'walmart', label: 'Walmart', color: 'border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20', active: 'border-blue-500 bg-blue-500/20 ring-1 ring-blue-500/30' },
  { id: 'target', label: 'Target', color: 'border-red-500/40 bg-red-50 text-red-600 hover:bg-red-100', active: 'border-red-500 bg-red-100 ring-1 ring-red-500/30' },
  { id: 'other', label: 'Other', color: 'border-surface-600/40 bg-surface-700/20 text-surface-400 hover:bg-surface-700/30', active: 'border-surface-500 bg-surface-700/30 ring-1 ring-surface-500/30' },
];

const carrierSenderMap: Record<string, string> = {
  amazon: 'Amazon.com',
  ups: '',
  fedex: '',
  usps: '',
  dhl: '',
  lasership: '',
  temu: 'Temu.com',
  ontrac: '',
  walmart: 'Walmart Inc',
  target: 'Target Corporation',
  other: '' };

/* -------------------------------------------------------------------------- */
/*  Package type config                                                       */
/* -------------------------------------------------------------------------- */
const packageTypeOptions = [
  { id: 'letter', label: 'Letter', icon: '✉️', desc: 'Envelope / Flat' },
  { id: 'pack', label: 'Pack', icon: '📨', desc: 'Bubble mailer / Soft pack' },
  { id: 'small', label: 'Small', icon: '📦', desc: 'Up to 2 lbs' },
  { id: 'medium', label: 'Medium', icon: '📦', desc: 'Up to 8 lbs' },
  { id: 'large', label: 'Large', icon: '📦', desc: 'Up to 15 lbs' },
  { id: 'xlarge', label: 'Extra Large', icon: '🏗️', desc: '20+ lbs / Bulky' },
];

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */
export default function CheckInPage() {
  const [step, setStep] = useState(1);

  // Step 1 — Customer
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Step 2 — Carrier
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [senderName, setSenderName] = useState('');

  // Step 3 — Package Details
  const [packageType, setPackageType] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [hazardous, setHazardous] = useState(false);
  const [perishable, setPerishable] = useState(false);
  const [condition, setCondition] = useState('good');
  const [conditionOther, setConditionOther] = useState('');
  const [notes, setNotes] = useState('');

  // Step 4 — Notify
  const [printLabel, setPrintLabel] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(true);

  // Success state
  const [showSuccess, setShowSuccess] = useState(false);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.filter((c) => c.status === 'active').slice(0, 8);
    const q = customerSearch.toLowerCase();
    return customers
      .filter(
        (c) =>
          c.status === 'active' &&
          (c.firstName.toLowerCase().includes(q) ||
            c.lastName.toLowerCase().includes(q) ||
            c.pmbNumber.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.phone?.includes(q) ||
            c.businessName?.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [customerSearch]);

  // Validation per step
  const canProceed = (() => {
    switch (step) {
      case 1:
        return !!selectedCustomer;
      case 2:
        return !!selectedCarrier;
      case 3:
        return !!packageType;
      case 4:
        return true;
      default:
        return false;
    }
  })();

  // Handle carrier selection with auto-fill sender
  const handleCarrierSelect = (carrierId: string) => {
    setSelectedCarrier(carrierId);
    const autoSender = carrierSenderMap[carrierId];
    if (autoSender) setSenderName(autoSender);
    else setSenderName('');
  };

  // Handle submit — log the action
  const { log: logActivity, lastActionByVerb } = useActivityLog();
  const lastCheckIn = lastActionByVerb('package.check_in');

  const handleSubmit = () => {
    const carrierLabel = selectedCarrier ? selectedCarrier.toUpperCase() : 'Unknown';
    const custLabel = selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName} (${selectedCustomer.pmbNumber})` : '';
    logActivity({
      action: 'package.check_in',
      entityType: 'package',
      entityId: `pkg_${Date.now()}`,
      entityLabel: trackingNumber || `${carrierLabel} package`,
      description: `Checked in ${carrierLabel} package for ${custLabel}`,
      metadata: {
        carrier: selectedCarrier,
        trackingNumber,
        packageType,
        customerId: selectedCustomer?.id,
        customerName: custLabel,
        hazardous,
        perishable,
      },
    });
    setShowSuccess(true);
  };

  // Reset for new check-in
  const handleReset = () => {
    setStep(1);
    setCustomerSearch('');
    setSelectedCustomer(null);
    setSelectedCarrier('');
    setSenderName('');
    setPackageType('');
    setTrackingNumber('');
    setHazardous(false);
    setPerishable(false);
    setCondition('good');
    setConditionOther('');
    setNotes('');
    setPrintLabel(true);
    setSendEmail(true);
    setSendSms(true);
    setShowSuccess(false);
  };

  /* ======================================================================== */
  /*  Store badge                                                             */
  /* ======================================================================== */
  const platformColors: Record<string, string> = {
    physical: 'warning',
    iPostal: 'info',
    anytime: 'success',
    postscan: 'warning',
    other: 'default' };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check In Package"
        description="Process a new incoming package"
        badge={lastCheckIn ? <PerformedBy entry={lastCheckIn} showAction className="ml-2" /> : undefined}
        actions={
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => (window.location.href = '/dashboard/packages')}
          >
            Back to Packages
          </Button>
        }
      />

      {/* Step Progress Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center">
            <button
              onClick={() => {
                // Allow clicking back to previous steps
                if (s.id < step) setStep(s.id);
              }}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all',
                step === s.id
                  ? 'bg-primary-50 text-primary-600 font-medium'
                  : s.id < step
                    ? 'text-emerald-600 cursor-pointer hover:bg-surface-800'
                    : 'text-surface-500 cursor-default'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                  step === s.id
                    ? 'bg-primary-600 text-white'
                    : s.id < step
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-surface-700 text-surface-500'
                )}
              >
                {s.id < step ? <Check className="h-3.5 w-3.5" /> : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-1 h-px w-8 sm:w-12',
                  s.id < step ? 'bg-emerald-500/40' : 'bg-surface-700'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card padding="lg">
        {/* ================================================================ */}
        {/*  Step 1: Identify Customer                                       */}
        {/* ================================================================ */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-surface-100 mb-1">
                Identify Customer
              </h2>
              <p className="text-sm text-surface-400">
                Search by PMB number, name, email, or phone
              </p>
            </div>

            <SearchInput
              placeholder="Search by PMB, name, email, or phone..."
              value={customerSearch}
              onSearch={setCustomerSearch}
              className="max-w-lg"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCustomers.map((cust) => {
                const isSelected = selectedCustomer?.id === cust.id;
                return (
                  <button
                    key={cust.id}
                    onClick={() => setSelectedCustomer(cust)}
                    className={cn(
                      'flex items-center gap-4 rounded-xl border p-4 text-left transition-all',
                      isSelected
                        ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500/30'
                        : 'border-surface-700/50 bg-surface-900/60 hover:border-surface-600 hover:bg-surface-800/60'
                    )}
                  >
                    {/* Avatar */}
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
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/*  Step 2: Carrier & Sender                                        */}
        {/* ================================================================ */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-surface-100 mb-1">
                Carrier & Sender
              </h2>
              <p className="text-sm text-surface-400">
                Select the shipping carrier and enter sender information
              </p>
            </div>

            {/* Carrier Grid */}
            <div>
              <label className="text-sm font-medium text-surface-300 mb-3 block">
                Carrier
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {carrierOptions.map((carrier) => {
                  const isActive = selectedCarrier === carrier.id;
                  return (
                    <button
                      key={carrier.id}
                      onClick={() => handleCarrierSelect(carrier.id)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 rounded-xl border px-4 py-4 transition-all',
                        isActive
                          ? carrier.active
                          : carrier.color
                      )}
                    >
                      <CarrierLogo carrier={carrier.id} size={28} />
                      <span className="text-xs font-medium opacity-80">{carrier.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sender Name */}
            <div className="max-w-md">
              <Input
                label="Sender Name"
                placeholder="e.g. Amazon.com, John Smith"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/*  Step 3: Package Details                                         */}
        {/* ================================================================ */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-surface-100 mb-1">
                Package Details
              </h2>
              <p className="text-sm text-surface-400">
                Describe the package characteristics
              </p>
            </div>

            {/* Package Type Selector */}
            <div>
              <label className="text-sm font-medium text-surface-300 mb-3 block">
                Package Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {packageTypeOptions.map((pt) => {
                  const isActive = packageType === pt.id;
                  return (
                    <button
                      key={pt.id}
                      onClick={() => setPackageType(pt.id)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border p-4 transition-all',
                        isActive
                          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500/30'
                          : 'border-surface-700/50 bg-surface-900/60 hover:border-surface-600'
                      )}
                    >
                      <span className="text-2xl">{pt.icon}</span>
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isActive ? 'text-primary-600' : 'text-surface-300'
                        )}
                      >
                        {pt.label}
                      </span>
                      <span className="text-[10px] text-surface-500">
                        {pt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tracking Number */}
            <div className="max-w-lg flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="Tracking Number"
                  placeholder="Enter or scan tracking number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                leftIcon={<ScanBarcode className="h-4 w-4" />}
                className="shrink-0"
              >
                Scan
              </Button>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-4">
              <ToggleSwitch
                label="Hazardous Materials"
                icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
                checked={hazardous}
                onChange={setHazardous}
              />
              <ToggleSwitch
                label="Perishable"
                icon={<Snowflake className="h-4 w-4 text-blue-600" />}
                checked={perishable}
                onChange={setPerishable}
              />
            </div>

            {/* Condition */}
            <div className="max-w-xs">
              <Select
                label="Condition"
                value={condition}
                onChange={(e) => {
                  setCondition(e.target.value);
                  if (e.target.value !== 'other') setConditionOther('');
                }}
                options={[
                  { value: 'good', label: 'Good' },
                  { value: 'damaged', label: 'Damaged' },
                  { value: 'wet', label: 'Wet' },
                  { value: 'opened', label: 'Opened' },
                  { value: 'partially_opened', label: 'Partially Opened' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </div>

            {/* Other condition description */}
            {condition === 'other' && (
              <div className="max-w-lg">
                <Input
                  label="Describe Condition"
                  placeholder="Describe the condition of the package..."
                  value={conditionOther}
                  onChange={(e) => setConditionOther(e.target.value)}
                />
              </div>
            )}

            {/* Notes */}
            <div className="max-w-lg">
              <Textarea
                label="Notes"
                placeholder="Any special handling instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/*  Step 4: Confirm & Notify                                        */}
        {/* ================================================================ */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-surface-100 mb-1">
                Confirm & Notify
              </h2>
              <p className="text-sm text-surface-400">
                Review the information and select notification options
              </p>
            </div>

            {/* Summary Card */}
            <div className="rounded-xl border border-surface-700/50 bg-surface-900/60 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">
                Package Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <SummaryField
                  label="Customer"
                  value={
                    selectedCustomer
                      ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                      : '—'
                  }
                />
                <SummaryField
                  label="PMB"
                  value={selectedCustomer?.pmbNumber || '—'}
                  mono
                />
                <SummaryField
                  label="Store"
                  value={selectedCustomer?.platform || '—'}
                />
                <SummaryField
                  label="Carrier"
                  value={
                    carrierOptions.find((c) => c.id === selectedCarrier)
                      ?.label || '—'
                  }
                />
                <SummaryField
                  label="Sender"
                  value={senderName || '—'}
                />
                <SummaryField
                  label="Package Type"
                  value={
                    packageTypeOptions.find((p) => p.id === packageType)
                      ?.label || '—'
                  }
                />
                <SummaryField
                  label="Tracking #"
                  value={trackingNumber || 'Not provided'}
                  mono
                />
                <SummaryField
                  label="Condition"
                  value={
                    condition === 'other'
                      ? conditionOther
                        ? `Other — ${conditionOther}`
                        : 'Other'
                      : condition === 'partially_opened'
                        ? 'Partially Opened'
                        : condition.charAt(0).toUpperCase() + condition.slice(1)
                  }
                />
                <SummaryField
                  label="Special"
                  value={
                    [hazardous && 'Hazardous', perishable && 'Perishable']
                      .filter(Boolean)
                      .join(', ') || 'None'
                  }
                />
              </div>
              {notes && (
                <div className="pt-3 border-t border-surface-800">
                  <SummaryField label="Notes" value={notes} />
                </div>
              )}
            </div>

            {/* Notification Preview */}
            <div className="rounded-xl border border-surface-700/50 bg-surface-900/60 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">
                Notification Settings
              </h3>

              {selectedCustomer?.email && (
                <div className="flex items-center gap-3 text-sm text-surface-400">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span>
                    Email will be sent to{' '}
                    <span className="text-surface-200">
                      {selectedCustomer.email}
                    </span>
                  </span>
                </div>
              )}
              {selectedCustomer?.phone && (
                <div className="flex items-center gap-3 text-sm text-surface-400">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  <span>
                    SMS will be sent to{' '}
                    <span className="text-surface-200">
                      {selectedCustomer.phone}
                    </span>
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <CheckboxOption
                  label="Print shelf label"
                  checked={printLabel}
                  onChange={setPrintLabel}
                  icon={<Printer className="h-4 w-4" />}
                />
                <CheckboxOption
                  label="Send email notification"
                  checked={sendEmail}
                  onChange={setSendEmail}
                  icon={<Mail className="h-4 w-4" />}
                  disabled={!selectedCustomer?.notifyEmail}
                />
                <CheckboxOption
                  label="Send SMS notification"
                  checked={sendSms}
                  onChange={setSendSms}
                  icon={<MessageSquare className="h-4 w-4" />}
                  disabled={!selectedCustomer?.notifySms}
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-surface-800">
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            Back
          </Button>
          <span className="text-xs text-surface-500">
            Step {step} of {STEPS.length}
          </span>
          {step < 4 ? (
            <Button
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => setStep(step + 1)}
              disabled={!canProceed}
            >
              Next
            </Button>
          ) : (
            <Button
              leftIcon={<Package className="h-4 w-4" />}
              onClick={handleSubmit}
            >
              Check In Package
            </Button>
          )}
        </div>
      </Card>

      {/* Success Modal */}
      <Modal
        open={showSuccess}
        onClose={handleReset}
        title="Package Checked In"
        size="sm"
        persistent
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => (window.location.href = '/dashboard/packages')}
            >
              View Packages
            </Button>
            <Button onClick={handleReset}>Check In Another</Button>
          </>
        }
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-surface-100 mb-1">
            Successfully Checked In!
          </h3>
          <p className="text-sm text-surface-400 max-w-xs">
            Package for{' '}
            <span className="text-surface-200 font-medium">
              {selectedCustomer?.firstName} {selectedCustomer?.lastName}
            </span>{' '}
            ({selectedCustomer?.pmbNumber}) has been checked in and notifications
            have been sent.
          </p>
          {trackingNumber && (
            <p className="mt-3 font-mono text-xs text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg">
              {trackingNumber}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */
function ToggleSwitch({
  label,
  icon,
  checked,
  onChange }: {
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm transition-all',
        checked
          ? 'border-primary-300 bg-primary-50 text-primary-600'
          : 'border-surface-700/50 bg-surface-900/60 text-surface-400 hover:border-surface-600'
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
      <div
        className={cn(
          'ml-2 relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary-600' : 'bg-surface-600'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform shadow-sm',
            checked ? 'translate-x-4' : 'translate-x-0.5'
          )}
        />
      </div>
    </button>
  );
}

function CheckboxOption({
  label,
  checked,
  onChange,
  icon,
  disabled }: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex items-center gap-3 text-sm cursor-pointer',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all',
          checked
            ? 'bg-primary-600 border-primary-500 text-surface-100'
            : 'bg-surface-900 border-surface-600 text-transparent'
        )}
      >
        <Check className="h-3 w-3" />
      </button>
      {icon && <span className="text-surface-500">{icon}</span>}
      <span className="text-surface-300">{label}</span>
    </label>
  );
}

function SummaryField({
  label,
  value,
  mono }: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-surface-500 mb-0.5">
        {label}
      </p>
      <p
        className={cn(
          'text-sm text-surface-200',
          mono && 'font-mono text-xs'
        )}
      >
        {value}
      </p>
    </div>
  );
}
