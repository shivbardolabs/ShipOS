'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Stepper, type Step } from '@/components/ui/stepper';
import { SignaturePad } from '@/components/ui/signature-pad';
import { customers as mockCustomers } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import {
  DEFAULT_MAILBOX_RANGES,
  getAvailableBoxNumbers,
  getRangeStats,
  formatPmbNumber,
} from '@/lib/pmb-utils';
import { USPS_PRIMARY_IDS, USPS_SECONDARY_IDS, ALL_USPS_IDS, validateIdPair } from '@/lib/usps-ids';
import type { MailboxPlatform, ExtractedIdData, PS1583FormData } from '@/lib/types';
import {
  ArrowLeft, ArrowRight, User, CreditCard, FileText, Shield,
  ClipboardCheck, Upload, CheckCircle2, AlertCircle, X, Scan,
  Building2, Mail, Phone, MapPin, Calendar,
  Loader2, Mailbox, Info, ChevronDown, Search, Lock,
} from 'lucide-react';

const BUSINESS_DOC_TYPES = [
  { value: 'articles_of_incorporation', label: 'Articles of Incorporation' },
  { value: 'certificate_of_formation', label: 'Certificate of Formation / Organization' },
  { value: 'ein_letter', label: 'EIN Letter (IRS Determination)' },
  { value: 'operating_agreement', label: 'Operating Agreement' },
  { value: 'business_license', label: 'Business License' },
  { value: 'certificate_good_standing', label: 'Certificate of Good Standing' },
  { value: 'dba_filing', label: 'DBA / Fictitious Name Filing' },
  { value: 'other_business_doc', label: 'Other Business Document' },
];

/** Personal PMB fee structure */
const PERSONAL_FEES = {
  setupFee: 15,
  overageRate: 1.00,
  storageRate: 1.00,
  additionalCustomer: 10,
  additionalKey: 10,
  lateFee: 20,
  monthlyItems: 10,
  storageDays: 7,
};

/** Business PMB fee structure — higher base rates for commercial accounts */
const BUSINESS_FEES = {
  setupFee: 50,
  overageRate: 1.50,
  storageRate: 2.00,
  additionalCustomer: 15,
  additionalKey: 10,
  lateFee: 35,
  monthlyItems: 25,
  storageDays: 7,
};

const STORE_INFO = {
  name: 'ShipOS Mail Center',
  address: '123 Main Street',
  city: 'Anytown',
  state: 'CA',
  zip: '90210',
};

function getAgreementText(vars: Record<string, string>, isBusinessPmb = false) {
  const fees = isBusinessPmb ? BUSINESS_FEES : PERSONAL_FEES;
  return `CONTRACT FOR MAILBOX SERVICE

${vars.storeAddress || STORE_INFO.address} PMB ${vars.pmbNumber || '___'}
${vars.storeCity || STORE_INFO.city}, ${vars.storeState || STORE_INFO.state} ${vars.storeZip || STORE_INFO.zip}

This Agreement made ${vars.openDate || new Date().toLocaleDateString()} by and between ${vars.customerName || '___'}, hereinafter referred to as "Customer", and ${vars.storeName || STORE_INFO.name}, hereinafter referred to as "Mail Service", shall be governed by these terms and conditions.

CONTRACT: By completing this form and PS Form 1583, which will be made available to the United States Postal Service® (USPS), Customer appoints Mail Service as agent for the receipt of mail and packages on behalf of Customer.

LAWFUL USE: Customer agrees that they will not utilize PMB or Mail Service for any unlawful, illegitimate, or fraudulent purpose, or for any purpose prohibited by the USPS.

KEYS: Mail Service will provide up to two (2) mailbox keys to Customer. Mailbox keys remain the property of ${vars.storeName || STORE_INFO.name} and shall be returned upon termination of services. A charge of $10.00 will be assessed for each additional or replacement key.

DELIVERY BY USPS: Customer agrees to release and absolve the USPS and its direct representatives from any and all liability for mail that has been delivered to and accepted by Mail Service.

DELIVERY BY MAIL SERVICE: Once Mail Service has placed Customer's mail in PMB ${vars.pmbNumber || '___'}, the mail shall be deemed to have been delivered, and Mail Service shall not be responsible for loss, theft, or damage thereafter.

AUTHORIZED COLLECTOR: Customer authorizes themself as Authorized Collector of mail per USPS definition.

IDENTIFICATION: Per USPS regulation, Customer's Photo and Address identification must be current and not expired. Customer is required to provide updated Photo Identification if the ID has expired during the term of service.

FORWARDING: USPS regulation requires Customer to complete a new PS 1583 each time the official forwarding address for mail is changed.

COMPLIANCE: Customer agrees to use services in accordance with Mail Service rules and in compliance with USPS regulations.

CONFIDENTIALITY: Information provided by Customer will be kept confidential and will not knowingly be disclosed without Customer's prior consent, except for law enforcement or postal operation purposes.

RESTRICTIONS: Customer agrees that no hazardous or dangerous items will be shipped to this location.

FEES: Mail Service fees are due and payable in advance. Failure to pay such fees when due may result in termination of services.

ADDRESSING: Customer shall use only the address designation "PMB ${vars.pmbNumber || '___'}" or "#${vars.pmbNumber || '___'}".

END OF TERM: Upon conclusion of Mail Service Term, Customer agrees not to submit a Change of Address Order with the USPS.

${isBusinessPmb ? 'BUSINESS ACCOUNT — INCLUDED SERVICES' : 'INCLUDED SERVICES'}:
• Text/Email notification for accountable mail/packages
• Text/Email notification for new mail items distributed to PMB ${vars.pmbNumber || '___'}
• ${fees.monthlyItems} accountable mail/package items received per month
• ${fees.storageDays} days storage for mail/packages not placed in mailbox${isBusinessPmb ? '\n• Business entity documentation on file' : ''}

ADDITIONAL SERVICES:
• Accountable mail/packages over ${fees.monthlyItems}/month: $${fees.overageRate.toFixed(2)} each
• Storage beyond ${fees.storageDays} days: $${fees.storageRate.toFixed(2)} per day per item
• Additional customers: $${fees.additionalCustomer} per customer per month
• Additional keys: $${fees.additionalKey} each
• Setup Fee: $${fees.setupFee} at initial application
• Late Fee: $${fees.lateFee} per month after 7 days`;
}

const platformLabels: Record<MailboxPlatform, { label: string; color: string }> = {
  physical: { label: 'Store (Physical)', color: 'bg-surface-600/30 text-surface-300 border-surface-600/40' },
  anytime: { label: 'Anytime Mailbox', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  iPostal: { label: 'iPostal1', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  postscan: { label: 'PostScan Mail', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
};

export default function NewCustomerPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const fileInputRef3 = useRef<HTMLInputElement>(null);

  const [customerForm, setCustomerForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    businessName: '', platform: '' as MailboxPlatform | '',
    pmbNumber: '', billingTerms: 'Monthly',
    homeAddress: '', homeCity: '', homeState: '', homeZip: '',
    notifyEmail: true, notifySms: true, notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pmbSearch, setPmbSearch] = useState('');
  const [pmbDropdownOpen, setPmbDropdownOpen] = useState(false);

  const [primaryIdType, setPrimaryIdType] = useState('');
  const [secondaryIdType, setSecondaryIdType] = useState('');
  const [primaryIdFile, setPrimaryIdFile] = useState<File | null>(null);
  const [secondaryIdFile, setSecondaryIdFile] = useState<File | null>(null);
  const [primaryIdPreview, setPrimaryIdPreview] = useState<string | null>(null);
  const [secondaryIdPreview, setSecondaryIdPreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedIdData | null>(null);
  const [primaryIdExpiration, setPrimaryIdExpiration] = useState('');
  const [secondaryIdExpiration, setSecondaryIdExpiration] = useState('');
  const [businessDocType, setBusinessDocType] = useState('');
  const [businessDocFile, setBusinessDocFile] = useState<File | null>(null);
  const [businessDocPreview, setBusinessDocPreview] = useState<string | null>(null);

  const [form1583, setForm1583] = useState<Partial<PS1583FormData>>({
    cmraName: STORE_INFO.name, cmraAddress: STORE_INFO.address,
    cmraCity: STORE_INFO.city, cmraState: STORE_INFO.state, cmraZip: STORE_INFO.zip,
    notarized: false, crdUploaded: false,
  });

  const [agreementSigned, setAgreementSigned] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  const isBusinessPmb = customerForm.businessName.trim().length > 0;
  const WIZARD_STEPS: Step[] = [
    { id: 'info', label: 'Customer Info', description: 'Name & contact details' },
    { id: 'ids', label: 'Identification', description: isBusinessPmb ? 'Three forms of ID' : 'Two forms of ID' },
    { id: 'form1583', label: 'PS Form 1583', description: 'USPS CMRA form' },
    { id: 'agreement', label: 'Service Agreement', description: 'Sign & finalize' },
    { id: 'review', label: 'Review & Create', description: 'Confirm details' },
  ];

  const rangeStats = useMemo(() => getRangeStats(DEFAULT_MAILBOX_RANGES, mockCustomers), []);
  const availableBoxes = useMemo(() => {
    const platform = customerForm.platform as MailboxPlatform | '';
    return getAvailableBoxNumbers(DEFAULT_MAILBOX_RANGES, mockCustomers, platform || undefined);
  }, [customerForm.platform]);
  const filteredBoxes = useMemo(() => {
    if (!pmbSearch) return availableBoxes.slice(0, 50);
    const q = pmbSearch.toLowerCase();
    return availableBoxes.filter((b) => b.label.toLowerCase().includes(q) || String(b.number).includes(q)).slice(0, 50);
  }, [availableBoxes, pmbSearch]);

  const updateField = useCallback((field: string, value: string | boolean) => {
    setCustomerForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }, []);

  const selectPmb = useCallback((num: number, platform: MailboxPlatform) => {
    setCustomerForm((prev) => ({ ...prev, pmbNumber: String(num), platform }));
    setPmbDropdownOpen(false); setPmbSearch('');
    setFormErrors((prev) => { const next = { ...prev }; delete next['pmbNumber']; return next; });
  }, []);

  const handleFileUpload = useCallback((file: File, slot: 'primary' | 'secondary') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (slot === 'primary') { setPrimaryIdFile(file); setPrimaryIdPreview(url); }
      else { setSecondaryIdFile(file); setSecondaryIdPreview(url); }
    };
    reader.readAsDataURL(file);
  }, []);

  const simulateOCR = useCallback(() => {
    if (!primaryIdFile) return;
    setExtracting(true);
    setTimeout(() => {
      const mockExtracted: ExtractedIdData = {
        fullName: customerForm.firstName && customerForm.lastName ? `${customerForm.firstName} ${customerForm.lastName}` : 'John Doe',
        firstName: customerForm.firstName || 'John', lastName: customerForm.lastName || 'Doe',
        dateOfBirth: '1985-06-15',
        address: customerForm.homeAddress || '456 Oak Avenue',
        city: customerForm.homeCity || 'Springfield', state: customerForm.homeState || 'CA',
        zipCode: customerForm.homeZip || '90211',
        idNumber: 'DL' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        expirationDate: new Date(Date.now() + 365 * 3 * 86400000).toISOString().slice(0, 10),
        issuingAuthority: 'State of California',
      };
      setExtractedData(mockExtracted);
      setForm1583((prev) => ({
        ...prev, applicantName: mockExtracted.fullName || '', dateOfBirth: mockExtracted.dateOfBirth || '',
        homeAddress: mockExtracted.address || '', homeCity: mockExtracted.city || '',
        homeState: mockExtracted.state || '', homeZip: mockExtracted.zipCode || '',
        primaryIdNumber: mockExtracted.idNumber || '', primaryIdIssuer: mockExtracted.issuingAuthority || '',
        pmbNumber: customerForm.pmbNumber,
      }));
      if (!customerForm.homeAddress && mockExtracted.address) {
        setCustomerForm((prev) => ({
          ...prev, homeAddress: mockExtracted.address || prev.homeAddress,
          homeCity: mockExtracted.city || prev.homeCity, homeState: mockExtracted.state || prev.homeState,
          homeZip: mockExtracted.zipCode || prev.homeZip,
        }));
      }
      setExtracting(false);
    }, 2000);
  }, [primaryIdFile, customerForm]);

  const validateStep = useCallback((stepNum: number): boolean => {
    const errors: Record<string, string> = {};
    if (stepNum === 0) {
      if (!customerForm.firstName.trim()) errors.firstName = 'Required';
      if (!customerForm.lastName.trim()) errors.lastName = 'Required';
      if (!customerForm.email.trim()) errors.email = 'Required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerForm.email)) errors.email = 'Invalid email';
      if (!customerForm.phone.trim()) errors.phone = 'Required';
      if (!customerForm.homeAddress.trim()) errors.homeAddress = 'Required';
      if (!customerForm.homeCity.trim()) errors.homeCity = 'Required';
      if (!customerForm.homeState.trim()) errors.homeState = 'Required';
      if (!customerForm.homeZip.trim()) errors.homeZip = 'Required';
      if (!customerForm.pmbNumber) errors.pmbNumber = 'Required';
    }
    if (stepNum === 1) {
      const idValid = validateIdPair(primaryIdType, secondaryIdType);
      if (!idValid.valid) errors.ids = idValid.error || 'Invalid ID selection';
      if (!primaryIdFile) errors.primaryFile = 'Upload primary ID';
      if (!secondaryIdFile) errors.secondaryFile = 'Upload secondary ID';
      if (isBusinessPmb) {
        if (!businessDocType) errors.businessDocType = 'Business document type required';
        if (!businessDocFile) errors.businessDocFile = 'Upload business documentation';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [customerForm, primaryIdType, secondaryIdType, primaryIdFile, secondaryIdFile, isBusinessPmb, businessDocType, businessDocFile]);

  const handleNext = useCallback(() => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  }, [step, validateStep]);
  const handleBack = useCallback(() => { setStep((s) => Math.max(s - 1, 0)); }, []);
  const handleCreate = useCallback(() => { setCreated(true); }, []);

  if (created) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="glass-card p-12 text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-surface-100">Customer Created Successfully</h2>
          <p className="text-surface-400 max-w-md mx-auto">
            <span className="text-surface-200 font-medium">{customerForm.firstName} {customerForm.lastName}</span> has been
            set up{customerForm.pmbNumber ? <> at <span className="font-mono text-primary-400">{formatPmbNumber(parseInt(customerForm.pmbNumber))}</span></> : ''}{customerForm.platform ? <> ({platformLabels[customerForm.platform as MailboxPlatform]?.label})</> : ''} successfully.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto pt-4">
            <div className="glass-card p-3 text-center">
              <div className="text-xs text-surface-500">PMB</div>
              <div className="text-sm font-semibold text-surface-100 font-mono">{customerForm.pmbNumber ? formatPmbNumber(parseInt(customerForm.pmbNumber)) : 'N/A'}</div>
            </div>
            <div className="glass-card p-3 text-center">
              <div className="text-xs text-surface-500">IDs</div>
              <div className="text-sm font-semibold text-emerald-400">{isBusinessPmb ? '3' : '2'} Verified</div>
            </div>
            <div className="glass-card p-3 text-center">
              <div className="text-xs text-surface-500">PS 1583</div>
              <div className="text-sm font-semibold text-blue-400">Submitted</div>
            </div>
            <div className="glass-card p-3 text-center">
              <div className="text-xs text-surface-500">Agreement</div>
              <div className="text-sm font-semibold text-emerald-400">Signed</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button variant="ghost" onClick={() => router.push('/dashboard/customers')}>Back to Customers</Button>
            <Button variant="default" onClick={() => {
              setCreated(false); setStep(0);
              setCustomerForm({ firstName: '', lastName: '', email: '', phone: '', businessName: '', platform: '', pmbNumber: '', billingTerms: 'Monthly', homeAddress: '', homeCity: '', homeState: '', homeZip: '', notifyEmail: true, notifySms: true, notes: '' });
              setPrimaryIdType(''); setSecondaryIdType('');
              setPrimaryIdFile(null); setSecondaryIdFile(null);
              setPrimaryIdPreview(null); setSecondaryIdPreview(null);
              setExtractedData(null); setAgreementSigned(false); setSignatureDataUrl(null);
              setBusinessDocType(''); setBusinessDocFile(null); setBusinessDocPreview(null);
            }}>Add Another Customer</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/customers')} leftIcon={<ArrowLeft className="h-4 w-4" />}>Customers</Button>
          <div>
            <h1 className="text-xl font-bold text-surface-100">New Customer Setup</h1>
            <p className="text-sm text-surface-500">USPS CMRA-compliant mailbox registration</p>
          </div>
        </div>
      </div>

      <Card padding="md"><Stepper steps={WIZARD_STEPS} currentStep={step} /></Card>

      <div className="min-h-[500px]">
        {/* Step 1: Customer Info + PMB */}
        {step === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card padding="md">
                <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4 text-primary-500" />Customer Information</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="First Name *" placeholder="John" value={customerForm.firstName} onChange={(e) => updateField('firstName', e.target.value)} error={formErrors.firstName} />
                      <Input label="Last Name *" placeholder="Doe" value={customerForm.lastName} onChange={(e) => updateField('lastName', e.target.value)} error={formErrors.lastName} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Email *" type="email" placeholder="john@example.com" value={customerForm.email} onChange={(e) => updateField('email', e.target.value)} error={formErrors.email} leftIcon={<Mail className="h-4 w-4" />} />
                      <Input label="Phone *" type="tel" placeholder="(555) 555-0100" value={customerForm.phone} onChange={(e) => updateField('phone', e.target.value)} error={formErrors.phone} leftIcon={<Phone className="h-4 w-4" />} />
                    </div>
                    <Input label="Business Name (optional)" placeholder="Business LLC" value={customerForm.businessName} onChange={(e) => updateField('businessName', e.target.value)} leftIcon={<Building2 className="h-4 w-4" />} />
                    {isBusinessPmb && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-3">
                        <Building2 className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-amber-300">Business PMB Detected</p>
                            <Badge dot={false} className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30">Business Account</Badge>
                          </div>
                          <p className="text-xs text-surface-400 mt-1">Business mailboxes require a <span className="text-surface-200 font-medium">third form of documentation</span> (e.g. Articles of Incorporation, EIN Letter) and follow a <span className="text-surface-200 font-medium">business fee structure</span> with higher included volume.</p>
                        </div>
                      </div>
                    )}
                    <div className="border-t border-surface-800 pt-4">
                      <p className="text-sm font-medium text-surface-300 mb-3 flex items-center gap-2"><MapPin className="h-4 w-4 text-primary-500" />Home Address</p>
                      <div className="space-y-3">
                        <Input label="Street Address *" placeholder="123 Main St" value={customerForm.homeAddress} onChange={(e) => updateField('homeAddress', e.target.value)} error={formErrors.homeAddress} />
                        <div className="grid grid-cols-3 gap-3">
                          <Input label="City *" placeholder="Anytown" value={customerForm.homeCity} onChange={(e) => updateField('homeCity', e.target.value)} error={formErrors.homeCity} />
                          <Input label="State *" placeholder="CA" value={customerForm.homeState} onChange={(e) => updateField('homeState', e.target.value)} error={formErrors.homeState} />
                          <Input label="ZIP Code *" placeholder="90210" value={customerForm.homeZip} onChange={(e) => updateField('homeZip', e.target.value)} error={formErrors.homeZip} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-surface-800 pt-4">
                      <Select label="Billing Terms" options={[{ value: 'Monthly', label: 'Monthly' }, { value: 'Quarterly', label: 'Quarterly' }, { value: 'Semi-Annual', label: 'Semi-Annual' }, { value: 'Annual', label: 'Annual' }]} value={customerForm.billingTerms} onChange={(e) => updateField('billingTerms', e.target.value)} />
                      <div className="flex flex-col justify-end gap-2">
                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={customerForm.notifyEmail} onChange={(e) => updateField('notifyEmail', e.target.checked)} className="rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500/30" /><span className="text-sm text-surface-300">Email notifications</span></label>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={customerForm.notifySms} onChange={(e) => updateField('notifySms', e.target.checked)} className="rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500/30" /><span className="text-sm text-surface-300">SMS notifications</span></label>
                      </div>
                    </div>
                    <Textarea label="Notes (optional)" placeholder="VIP customer, special instructions..." value={customerForm.notes} onChange={(e) => updateField('notes', e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card padding="md">
                <CardHeader><CardTitle className="flex items-center gap-2"><Mailbox className="h-4 w-4 text-primary-500" />Assign PMB</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Select label="Platform" placeholder="All platforms" options={[
                      { value: '', label: 'All Platforms' },
                      { value: 'physical', label: 'Store (Physical) — 1–550' },
                      { value: 'anytime', label: 'Anytime Mailbox — 700–999' },
                      { value: 'iPostal', label: 'iPostal1 — 1000–1200' },
                      { value: 'postscan', label: 'PostScan Mail — 2000–2999' },
                    ]} value={customerForm.platform} onChange={(e) => { updateField('platform', e.target.value); updateField('pmbNumber', ''); }} />

                    <div className="relative">
                      <label className="text-sm font-medium text-surface-300 mb-1.5 block">PMB Number *</label>
                      <div className={cn('flex items-center gap-2 rounded-lg border bg-surface-900 px-3 py-2 cursor-pointer transition-colors', formErrors.pmbNumber ? 'border-red-500' : pmbDropdownOpen ? 'border-primary-500 ring-1 ring-primary-500/30' : 'border-surface-700 hover:border-surface-600')} onClick={() => setPmbDropdownOpen(!pmbDropdownOpen)}>
                        {customerForm.pmbNumber ? (
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-mono text-sm font-semibold text-primary-400">{formatPmbNumber(parseInt(customerForm.pmbNumber))}</span>
                            {customerForm.platform && <Badge dot={false} className={cn('text-[10px]', platformLabels[customerForm.platform as MailboxPlatform]?.color)}>{platformLabels[customerForm.platform as MailboxPlatform]?.label}</Badge>}
                            <button onClick={(e) => { e.stopPropagation(); updateField('pmbNumber', ''); updateField('platform', ''); }} className="ml-auto text-surface-500 hover:text-surface-300"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ) : (
                          <span className="text-sm text-surface-500 flex-1">Select available box...</span>
                        )}
                        <ChevronDown className={cn('h-4 w-4 text-surface-500 transition-transform', pmbDropdownOpen && 'rotate-180')} />
                      </div>
                      {formErrors.pmbNumber && <p className="text-xs text-red-500 mt-1">{formErrors.pmbNumber}</p>}
                      {pmbDropdownOpen && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-surface-700 bg-surface-900 shadow-xl max-h-64 overflow-hidden">
                          <div className="p-2 border-b border-surface-800">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-500" />
                              <input type="text" placeholder="Search box number..." value={pmbSearch} onChange={(e) => setPmbSearch(e.target.value)} className="w-full bg-surface-800 border border-surface-700 rounded-md pl-8 pr-3 py-1.5 text-sm text-surface-200 placeholder:text-surface-500 focus:outline-none focus:border-primary-500" autoFocus onClick={(e) => e.stopPropagation()} />
                            </div>
                          </div>
                          <div className="overflow-y-auto max-h-48 p-1">
                            {filteredBoxes.length === 0 ? (
                              <p className="px-3 py-4 text-sm text-surface-500 text-center">No available boxes found</p>
                            ) : filteredBoxes.map((box) => (
                              <button key={box.number} onClick={(e) => { e.stopPropagation(); selectPmb(box.number, box.platform); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-surface-800 transition-colors">
                                <span className="font-mono text-sm font-medium text-surface-200">{box.label}</span>
                                <Badge dot={false} className={cn('text-[10px]', platformLabels[box.platform]?.color)}>{platformLabels[box.platform]?.label}</Badge>
                              </button>
                            ))}
                            {filteredBoxes.length === 50 && <p className="px-3 py-2 text-[11px] text-surface-600 text-center">Showing first 50 — type to filter</p>}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-surface-500">{availableBoxes.length.toLocaleString()} boxes available{customerForm.platform ? ` in ${platformLabels[customerForm.platform as MailboxPlatform]?.label}` : ' across all platforms'}</p>
                  </div>
                </CardContent>
              </Card>
              {isBusinessPmb && (
                <Card padding="sm">
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-3.5 w-3.5 text-amber-400" />
                      <p className="text-xs font-medium text-amber-400">Business Fee Structure</p>
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between"><span className="text-surface-400">Setup Fee</span><span className="text-surface-200 font-medium">${BUSINESS_FEES.setupFee}</span></div>
                      <div className="flex justify-between"><span className="text-surface-400">Included Items/mo</span><span className="text-surface-200 font-medium">{BUSINESS_FEES.monthlyItems}</span></div>
                      <div className="flex justify-between"><span className="text-surface-400">Overage Rate</span><span className="text-surface-200 font-medium">${BUSINESS_FEES.overageRate.toFixed(2)}/item</span></div>
                      <div className="flex justify-between"><span className="text-surface-400">Storage Rate</span><span className="text-surface-200 font-medium">${BUSINESS_FEES.storageRate.toFixed(2)}/day</span></div>
                      <div className="flex justify-between"><span className="text-surface-400">Late Fee</span><span className="text-surface-200 font-medium">${BUSINESS_FEES.lateFee}/mo</span></div>
                    </div>
                  </div>
                </Card>
              )}
              <Card padding="sm">
                <div className="px-3 py-2">
                  <p className="text-xs font-medium text-surface-400 mb-2">Box Availability</p>
                  <div className="space-y-2">
                    {rangeStats.map((rs) => (
                      <div key={rs.id} className="flex items-center gap-2">
                        <span className="text-[11px] text-surface-400 w-20 truncate">{rs.label}</span>
                        <div className="flex-1 h-2 bg-surface-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${(rs.available / rs.total) * 100}%` }} /></div>
                        <span className="text-[11px] text-surface-500 w-12 text-right">{rs.available}/{rs.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Step 2: Identification */}
        {step === 1 && (
          <div className="space-y-6">
            <div className={cn("glass-card p-4 flex items-start gap-3 border-l-4", isBusinessPmb ? "border-amber-500" : "border-blue-500")}>
              <Info className={cn("h-5 w-5 mt-0.5 flex-shrink-0", isBusinessPmb ? "text-amber-400" : "text-blue-400")} />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-surface-200">{isBusinessPmb ? 'Three Forms of ID Required' : 'Two Forms of ID Required'}</p>
                  {isBusinessPmb && <Badge dot={false} className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30">Business PMB</Badge>}
                </div>
                <p className="text-xs text-surface-400 mt-1">
                  Per USPS regulations, a primary photo ID and a secondary form of identification are required.
                  {isBusinessPmb && <span className="text-amber-400 font-medium"> Business accounts also require a business entity document.</span>}
                  <a href="https://faq.usps.com/articles/Knowledge/Acceptable-Form-of-Identification" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 ml-1">USPS Acceptable IDs →</a>
                </p>
              </div>
            </div>
            {formErrors.ids && (
              <div className="glass-card p-3 flex items-center gap-2 border-l-4 border-red-500"><AlertCircle className="h-4 w-4 text-red-400" /><p className="text-sm text-red-400">{formErrors.ids}</p></div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card padding="md">
                <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary-500" />Primary ID (Photo Required)</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Select label="ID Type *" placeholder="Select primary ID..." options={USPS_PRIMARY_IDS.map((id) => ({ value: id.id, label: id.name }))} value={primaryIdType} onChange={(e) => { setPrimaryIdType(e.target.value); if (e.target.value === 'drivers_license' && secondaryIdType === 'drivers_license') setSecondaryIdType(''); }} />
                    {primaryIdType && <p className="text-xs text-surface-500">{USPS_PRIMARY_IDS.find((id) => id.id === primaryIdType)?.description}</p>}
                    <Input label="ID Expiration Date" type="date" value={primaryIdExpiration} onChange={(e) => setPrimaryIdExpiration(e.target.value)} leftIcon={<Calendar className="h-4 w-4" />} />
                    <div>
                      <label className="text-sm font-medium text-surface-300 mb-1.5 block">Upload Scan/Photo *</label>
                      <input ref={fileInputRef1} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'primary'); }} />
                      {primaryIdPreview ? (
                        <div className="relative rounded-lg border border-surface-700 overflow-hidden">
                          <img src={primaryIdPreview} alt="Primary ID" className="w-full h-40 object-cover" />
                          <div className="absolute top-2 right-2"><button onClick={() => { setPrimaryIdFile(null); setPrimaryIdPreview(null); setExtractedData(null); }} className="p-1.5 rounded-md bg-surface-900/80 text-surface-400 hover:text-red-400 backdrop-blur-sm"><X className="h-3.5 w-3.5" /></button></div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface-900/90 to-transparent p-2"><p className="text-xs text-surface-300 truncate">{primaryIdFile?.name}</p></div>
                        </div>
                      ) : (
                        <div onClick={() => fileInputRef1.current?.click()} className={cn('rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors', formErrors.primaryFile ? 'border-red-500/50 bg-red-500/5' : 'border-surface-700 hover:border-primary-500/50 hover:bg-primary-500/5')}>
                          <Upload className="h-8 w-8 text-surface-500 mx-auto mb-2" /><p className="text-sm text-surface-400">Click to upload or drag & drop</p><p className="text-xs text-surface-600 mt-1">JPG, PNG, PDF up to 10MB</p>
                        </div>
                      )}
                      {formErrors.primaryFile && <p className="text-xs text-red-500 mt-1">{formErrors.primaryFile}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card padding="md">
                <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary-500" />Secondary ID</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Select label="ID Type *" placeholder="Select secondary ID..." options={[
                      ...(primaryIdType !== 'drivers_license' ? [{ value: 'drivers_license', label: "Valid driver's license or state non-driver's ID card" }] : []),
                      ...USPS_SECONDARY_IDS.map((id) => ({ value: id.id, label: id.name })),
                    ]} value={secondaryIdType} onChange={(e) => setSecondaryIdType(e.target.value)} />
                    {secondaryIdType && <p className="text-xs text-surface-500">{ALL_USPS_IDS.find((id) => id.id === secondaryIdType)?.description}</p>}
                    {ALL_USPS_IDS.find((id) => id.id === secondaryIdType)?.hasExpiration && (
                      <Input label="ID Expiration Date" type="date" value={secondaryIdExpiration} onChange={(e) => setSecondaryIdExpiration(e.target.value)} leftIcon={<Calendar className="h-4 w-4" />} />
                    )}
                    <div>
                      <label className="text-sm font-medium text-surface-300 mb-1.5 block">Upload Scan/Photo *</label>
                      <input ref={fileInputRef2} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'secondary'); }} />
                      {secondaryIdPreview ? (
                        <div className="relative rounded-lg border border-surface-700 overflow-hidden">
                          <img src={secondaryIdPreview} alt="Secondary ID" className="w-full h-40 object-cover" />
                          <div className="absolute top-2 right-2"><button onClick={() => { setSecondaryIdFile(null); setSecondaryIdPreview(null); }} className="p-1.5 rounded-md bg-surface-900/80 text-surface-400 hover:text-red-400 backdrop-blur-sm"><X className="h-3.5 w-3.5" /></button></div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface-900/90 to-transparent p-2"><p className="text-xs text-surface-300 truncate">{secondaryIdFile?.name}</p></div>
                        </div>
                      ) : (
                        <div onClick={() => fileInputRef2.current?.click()} className={cn('rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors', formErrors.secondaryFile ? 'border-red-500/50 bg-red-500/5' : 'border-surface-700 hover:border-primary-500/50 hover:bg-primary-500/5')}>
                          <Upload className="h-8 w-8 text-surface-500 mx-auto mb-2" /><p className="text-sm text-surface-400">Click to upload or drag & drop</p><p className="text-xs text-surface-600 mt-1">JPG, PNG, PDF up to 10MB</p>
                        </div>
                      )}
                      {formErrors.secondaryFile && <p className="text-xs text-red-500 mt-1">{formErrors.secondaryFile}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            {isBusinessPmb && (
              <Card padding="md">
                <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4 text-amber-400" />Business Documentation</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Select label="Document Type *" placeholder="Select business document..." options={BUSINESS_DOC_TYPES.map((d) => ({ value: d.value, label: d.label }))} value={businessDocType} onChange={(e) => setBusinessDocType(e.target.value)} error={formErrors.businessDocType} />
                    {businessDocType && <p className="text-xs text-surface-500">This document verifies the business entity associated with this PMB.</p>}
                    <div>
                      <label className="text-sm font-medium text-surface-300 mb-1.5 block">Upload Document *</label>
                      <input ref={fileInputRef3} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { const file = e.target.files[0]; const reader = new FileReader(); reader.onload = (ev) => { setBusinessDocPreview(ev.target?.result as string); setBusinessDocFile(file); }; reader.readAsDataURL(file); } }} />
                      {businessDocPreview ? (
                        <div className="relative rounded-lg border border-surface-700 overflow-hidden">
                          <img src={businessDocPreview} alt="Business Doc" className="w-full h-40 object-cover" />
                          <div className="absolute top-2 right-2"><button onClick={() => { setBusinessDocFile(null); setBusinessDocPreview(null); }} className="p-1.5 rounded-md bg-surface-900/80 text-surface-400 hover:text-red-400 backdrop-blur-sm"><X className="h-3.5 w-3.5" /></button></div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface-900/90 to-transparent p-2"><p className="text-xs text-surface-300 truncate">{businessDocFile?.name}</p></div>
                        </div>
                      ) : (
                        <div onClick={() => fileInputRef3.current?.click()} className={cn('rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors', formErrors.businessDocFile ? 'border-red-500/50 bg-red-500/5' : 'border-surface-700 hover:border-amber-500/50 hover:bg-amber-500/5')}>
                          <Upload className="h-8 w-8 text-surface-500 mx-auto mb-2" /><p className="text-sm text-surface-400">Click to upload or drag & drop</p><p className="text-xs text-surface-600 mt-1">JPG, PNG, PDF up to 10MB</p>
                        </div>
                      )}
                      {formErrors.businessDocFile && <p className="text-xs text-red-500 mt-1">{formErrors.businessDocFile}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {primaryIdFile && (
              <Card padding="md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary-500/20 flex items-center justify-center"><Scan className="h-5 w-5 text-primary-400" /></div>
                    <div><p className="text-sm font-medium text-surface-200">ID Data Extraction</p><p className="text-xs text-surface-400">Extract name, address, and ID details to auto-fill PS Form 1583</p></div>
                  </div>
                  <Button variant={extractedData ? 'ghost' : 'default'} size="sm" onClick={simulateOCR} disabled={extracting} leftIcon={extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : extractedData ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Scan className="h-4 w-4" />}>
                    {extracting ? 'Extracting...' : extractedData ? 'Data Extracted' : 'Extract Data'}
                  </Button>
                </div>
                {extractedData && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-surface-800/50 border border-surface-700">
                    {Object.entries(extractedData).filter(([, v]) => v).map(([key, value]) => (
                      <div key={key}><p className="text-[10px] text-surface-500 uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1').trim()}</p><p className="text-xs text-surface-200 font-medium">{value}</p></div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* Step 3: PS Form 1583 */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="glass-card p-4 flex items-start gap-3 border-l-4 border-blue-500">
              <FileText className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-surface-200">USPS PS Form 1583 — Application for Delivery of Mail Through Agent</p>
                <p className="text-xs text-surface-400 mt-1">Required for all CMRA customers. Data has been pre-filled from customer info and ID extraction. <a href="https://about.usps.com/forms/ps1583.pdf" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 ml-1">View official form →</a></p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card padding="md">
                <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4 text-primary-500" />Applicant Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Input label="Full Name" value={form1583.applicantName || `${customerForm.firstName} ${customerForm.lastName}`} onChange={(e) => setForm1583((p) => ({ ...p, applicantName: e.target.value }))} />
                  <Input label="Date of Birth" type="date" value={form1583.dateOfBirth || ''} onChange={(e) => setForm1583((p) => ({ ...p, dateOfBirth: e.target.value }))} leftIcon={<Calendar className="h-4 w-4" />} />
                  {customerForm.businessName && <Input label="Business Name" value={form1583.businessName || customerForm.businessName} onChange={(e) => setForm1583((p) => ({ ...p, businessName: e.target.value }))} leftIcon={<Building2 className="h-4 w-4" />} />}
                  <div className="border-t border-surface-800 pt-3">
                    <p className="text-xs font-medium text-surface-400 mb-2">Home Address</p>
                    <div className="space-y-3">
                      <Input label="Street" value={form1583.homeAddress || customerForm.homeAddress} onChange={(e) => setForm1583((p) => ({ ...p, homeAddress: e.target.value }))} />
                      <div className="grid grid-cols-3 gap-3">
                        <Input label="City" value={form1583.homeCity || customerForm.homeCity} onChange={(e) => setForm1583((p) => ({ ...p, homeCity: e.target.value }))} />
                        <Input label="State" value={form1583.homeState || customerForm.homeState} onChange={(e) => setForm1583((p) => ({ ...p, homeState: e.target.value }))} />
                        <Input label="ZIP" value={form1583.homeZip || customerForm.homeZip} onChange={(e) => setForm1583((p) => ({ ...p, homeZip: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-6">
                <Card padding="md">
                  <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary-500" />CMRA (Mail Service) Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <Input label="CMRA Name" value={form1583.cmraName || ''} onChange={(e) => setForm1583((p) => ({ ...p, cmraName: e.target.value }))} />
                    <Input label="Address" value={form1583.cmraAddress || ''} onChange={(e) => setForm1583((p) => ({ ...p, cmraAddress: e.target.value }))} />
                    <div className="grid grid-cols-3 gap-3">
                      <Input label="City" value={form1583.cmraCity || ''} onChange={(e) => setForm1583((p) => ({ ...p, cmraCity: e.target.value }))} />
                      <Input label="State" value={form1583.cmraState || ''} onChange={(e) => setForm1583((p) => ({ ...p, cmraState: e.target.value }))} />
                      <Input label="ZIP" value={form1583.cmraZip || ''} onChange={(e) => setForm1583((p) => ({ ...p, cmraZip: e.target.value }))} />
                    </div>
                    <Input label="PMB Number" value={customerForm.pmbNumber ? formatPmbNumber(parseInt(customerForm.pmbNumber)) : ''} disabled leftIcon={<Lock className="h-4 w-4" />} />
                  </CardContent>
                </Card>
                <Card padding="md">
                  <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary-500" />Identification Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-surface-400">Primary ID</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="ID Type" value={USPS_PRIMARY_IDS.find((id) => id.id === primaryIdType)?.name || ''} disabled />
                        <Input label="ID Number" value={form1583.primaryIdNumber || ''} onChange={(e) => setForm1583((p) => ({ ...p, primaryIdNumber: e.target.value }))} placeholder="License/Passport #" />
                      </div>
                      <Input label="Issuing Authority" value={form1583.primaryIdIssuer || ''} onChange={(e) => setForm1583((p) => ({ ...p, primaryIdIssuer: e.target.value }))} placeholder="State of California, etc." />
                    </div>
                    <div className="border-t border-surface-800 pt-3 space-y-3">
                      <p className="text-xs font-medium text-surface-400">Secondary ID</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="ID Type" value={ALL_USPS_IDS.find((id) => id.id === secondaryIdType)?.name || ''} disabled />
                        <Input label="ID Number" value={form1583.secondaryIdNumber || ''} onChange={(e) => setForm1583((p) => ({ ...p, secondaryIdNumber: e.target.value }))} placeholder="Card number, etc." />
                      </div>
                      <Input label="Issuing Authority" value={form1583.secondaryIdIssuer || ''} onChange={(e) => setForm1583((p) => ({ ...p, secondaryIdIssuer: e.target.value }))} placeholder="Issuing entity" />
                    </div>
                  </CardContent>
                </Card>
                <Card padding="md">
                  <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary-500" />USPS CRD Status</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="glass-card p-3 flex items-start gap-3 border-l-4 border-yellow-500">
                        <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div><p className="text-xs text-surface-300">IDs must be uploaded to the USPS Customer Registration Database (CRD) within a few days to a week.</p><p className="text-[11px] text-surface-500 mt-1">No API access available — track status manually here.</p></div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form1583.crdUploaded || false} onChange={(e) => setForm1583((p) => ({ ...p, crdUploaded: e.target.checked, crdUploadDate: e.target.checked ? new Date().toISOString() : undefined }))} className="rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500/30" /><span className="text-sm text-surface-300">IDs uploaded to USPS CRD</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form1583.notarized || false} onChange={(e) => setForm1583((p) => ({ ...p, notarized: e.target.checked }))} className="rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500/30" /><span className="text-sm text-surface-300">Form 1583 notarized</span></label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Service Agreement */}
        {step === 3 && (
          <div className="space-y-6">
            <Card padding="md">
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary-500" />Mailbox Service Agreement</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-surface-400 mb-4">Review the agreement below. This is auto-populated with customer and store details. Stores can customize this template in Settings → Mailbox Configuration.</p>
                <div className="rounded-lg border border-surface-700 bg-surface-950 p-6 max-h-[400px] overflow-y-auto font-mono text-xs text-surface-300 leading-relaxed whitespace-pre-wrap">
                  {getAgreementText({ customerName: `${customerForm.firstName} ${customerForm.lastName}`, pmbNumber: customerForm.pmbNumber, storeName: STORE_INFO.name, storeAddress: STORE_INFO.address, storeCity: STORE_INFO.city, storeState: STORE_INFO.state, storeZip: STORE_INFO.zip, openDate: new Date().toLocaleDateString() }, isBusinessPmb)}
                </div>
              </CardContent>
            </Card>
            <Card padding="md">
              <CardHeader><CardTitle>Customer Signature</CardTitle></CardHeader>
              <CardContent>
                {signatureDataUrl ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <div><p className="text-sm font-medium text-emerald-400">Agreement Signed</p><p className="text-xs text-surface-400">Signed on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p></div>
                      <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setSignatureDataUrl(null); setAgreementSigned(false); }}>Re-sign</Button>
                    </div>
                    <div className="rounded-lg border border-surface-700 p-3 bg-white"><img src={signatureDataUrl} alt="Signature" className="max-h-24 mx-auto" /></div>
                  </div>
                ) : (
                  <SignaturePad onSign={(dataUrl) => { setSignatureDataUrl(dataUrl); setAgreementSigned(true); }} onClear={() => setAgreementSigned(false)} />
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 5: Review & Create */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card padding="md">
                <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4 text-primary-500" />Customer Details</CardTitle><Button variant="ghost" size="sm" onClick={() => setStep(0)}>Edit</Button></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-lg">{customerForm.firstName[0]}{customerForm.lastName[0]}</div>
                      <div>
                        <div className="flex items-center gap-2"><p className="text-base font-semibold text-surface-100">{customerForm.firstName} {customerForm.lastName}</p>{isBusinessPmb && <Badge dot={false} className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30">Business</Badge>}</div>
                        {customerForm.businessName && <p className="text-xs text-surface-400">{customerForm.businessName}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <p className="text-surface-500">PMB</p><p className="text-surface-200 font-mono font-medium">{customerForm.pmbNumber ? formatPmbNumber(parseInt(customerForm.pmbNumber)) : 'Not assigned'}</p>
                      <p className="text-surface-500">Platform</p><p className="text-surface-200">{platformLabels[customerForm.platform as MailboxPlatform]?.label}</p>
                      {customerForm.email && (<><p className="text-surface-500">Email</p><p className="text-surface-200">{customerForm.email}</p></>)}
                      {customerForm.phone && (<><p className="text-surface-500">Phone</p><p className="text-surface-200">{customerForm.phone}</p></>)}
                      <p className="text-surface-500">Billing</p><p className="text-surface-200">{customerForm.billingTerms}</p>
                      <p className="text-surface-500">Notifications</p><p className="text-surface-200">{[customerForm.notifyEmail && 'Email', customerForm.notifySms && 'SMS'].filter(Boolean).join(', ') || 'None'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card padding="md">
                <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary-500" />Compliance Status</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: 'Primary ID', value: USPS_PRIMARY_IDS.find((id) => id.id === primaryIdType)?.name || 'Not selected', ok: !!primaryIdFile && !!primaryIdType, step: 1 },
                      { label: 'Secondary ID', value: ALL_USPS_IDS.find((id) => id.id === secondaryIdType)?.name || 'Not selected', ok: !!secondaryIdFile && !!secondaryIdType, step: 1 },
                      ...(isBusinessPmb ? [{ label: 'Business Document', value: BUSINESS_DOC_TYPES.find((d) => d.value === businessDocType)?.label || 'Not selected', ok: !!businessDocFile && !!businessDocType, step: 1 }] : []),
                      { label: 'PS Form 1583', value: form1583.applicantName ? 'Completed' : 'Incomplete', ok: !!form1583.applicantName, step: 2 },
                      { label: 'USPS CRD Upload', value: form1583.crdUploaded ? 'Uploaded' : 'Pending', ok: form1583.crdUploaded, warn: !form1583.crdUploaded, step: 2 },
                      { label: 'Form 1583 Notarized', value: form1583.notarized ? 'Yes' : 'Pending', ok: form1583.notarized, warn: !form1583.notarized, step: 2 },
                      { label: 'Service Agreement', value: agreementSigned ? 'Signed' : 'Not signed', ok: agreementSigned, step: 3 },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3 text-sm">
                        {item.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" /> : item.warn ? <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0" /> : <X className="h-4 w-4 text-red-400 flex-shrink-0" />}
                        <div className="flex-1"><p className="text-surface-300">{item.label}</p><p className="text-xs text-surface-500">{item.value}</p></div>
                        <Button variant="ghost" size="sm" onClick={() => setStep(item.step)} className="text-xs">Edit</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            {!form1583.crdUploaded && (
              <div className="glass-card p-4 flex items-start gap-3 border-l-4 border-yellow-500">
                <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div><p className="text-sm font-medium text-yellow-400">CRD Upload Reminder</p><p className="text-xs text-surface-400 mt-1">Both ID documents must be uploaded to the USPS Customer Registration Database within a few days to a week. You can create the customer now and update the CRD status later.</p></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <Card padding="sm">
        <div className="flex items-center justify-between px-2">
          <Button variant="ghost" onClick={handleBack} disabled={step === 0} leftIcon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
          <div className="flex items-center gap-2 text-xs text-surface-500">Step {step + 1} of {WIZARD_STEPS.length}</div>
          {step < WIZARD_STEPS.length - 1 ? (
            <Button variant="default" onClick={handleNext} rightIcon={<ArrowRight className="h-4 w-4" />}>Continue</Button>
          ) : (
            <Button variant="default" onClick={handleCreate} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Create Customer</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
