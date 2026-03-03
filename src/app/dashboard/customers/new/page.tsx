/* eslint-disable */
'use client';

/**
 * BAR-230: PMB Customer Onboarding Wizard
 *
 * 7-step wizard flow (expanded from original 5 steps):
 *   0. Customer Info + Existing Customer Check
 *   1. Mailbox & Rate Plan Selection
 *   2. Identification + Non-Compliant ID Detection
 *   3. PS Form 1583 (recipients, business fields, forwarding)
 *   4. Payment Processing
 *   5. Service Agreement + Dual Signatures (customer + CMRA)
 *   6. Review & Create
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Stepper, type Step } from '@/components/ui/stepper';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import type { ParsedAddress } from '@/components/ui/address-autocomplete';
import { SignaturePad } from '@/components/ui/signature-pad';
// Real customer data loaded from API (replaces mock-data for PMB availability)
import { cn } from '@/lib/utils';
import {
  DEFAULT_MAILBOX_RANGES,
  getAvailableBoxNumbers,
  getRangeStats,
  formatPmbNumber,
} from '@/lib/pmb-utils';
import { USPS_PRIMARY_IDS, validateIdPair } from '@/lib/usps-ids';
import { NON_COMPLIANT_IDS, checkIdExpiration } from '@/lib/non-compliant-ids';
import type { Customer, MailboxPlatform, ExtractedIdData, PS1583FormData, PlanTierOption, PmbRecipientData, PaymentMethod } from '@/lib/types';
import {
  ArrowLeft, ArrowRight, User, CreditCard, FileText, Shield,
  ClipboardCheck, Upload, CheckCircle2, AlertCircle, X, Scan,
  Building2, Mail, Phone, MapPin, Calendar, DollarSign,
  Loader2, Mailbox, Info, ChevronDown, Search, Lock,
  UserPlus, Crown, Trash2, AlertTriangle, Banknote, Smartphone,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

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

const PROOF_OF_ADDRESS_TYPES = [
  { value: 'home_vehicle_insurance', label: 'Home or Vehicle Insurance Policy' },
  { value: 'mortgage_deed_of_trust', label: 'Mortgage or Deed of Trust' },
  { value: 'current_lease', label: 'Current Lease Agreement' },
  { value: 'state_drivers_nondriver_id', label: "State Driver's License / Non-Driver ID" },
  { value: 'voter_id_card', label: 'Voter Registration Card' },
];

const BUSINESS_ENTITY_TYPES = [
  { value: 'sole_proprietor', label: 'Sole Proprietorship' },
  { value: 'llc', label: 'LLC' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'nonprofit', label: 'Nonprofit Organization' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string; description: string }[] = [
  { value: 'manual_entry', label: 'Card — Manual Entry', icon: '💳', description: 'Key in card number manually' },
  { value: 'text2pay', label: 'Text2Pay', icon: '📱', description: 'Send payment link via SMS' },
  { value: 'tap_to_glass', label: 'Tap to Glass', icon: '📲', description: 'Customer taps phone/card on device' },
  { value: 'nfc', label: 'NFC / Contactless', icon: '📡', description: 'Contactless card reader' },
  { value: 'cash', label: 'Cash', icon: '💵', description: 'Record cash payment' },
];

const STORE_INFO = {
  name: 'ShipOS Mail Center',
  address: '123 Main Street',
  city: 'Anytown',
  state: 'CA',
  zip: '90210',
};

const platformLabels: Record<MailboxPlatform, { label: string; color: string }> = {
  physical: { label: 'Store (Physical)', color: 'bg-surface-600/30 text-surface-300 border-surface-600/40' },
  anytime: { label: 'Anytime Mailbox', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  iPostal: { label: 'iPostal1', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  postscan: { label: 'PostScan Mail', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
};

/* -------------------------------------------------------------------------- */
/*  Agreement Text Generator                                                  */
/* -------------------------------------------------------------------------- */

function getAgreementText(vars: Record<string, string>, isBusinessPmb = false, planName?: string) {
  const baseText = `CONTRACT FOR MAILBOX SERVICE

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

END OF TERM: Upon conclusion of Mail Service Term, Customer agrees not to submit a Change of Address Order with the USPS.`;

  const planLine = planName ? `\nSELECTED PLAN: ${planName} (${vars.billingCycle || 'Monthly'})` : '';

  return baseText + planLine;
}

/* -------------------------------------------------------------------------- */
/*  Existing Customer Match Card                                              */
/* -------------------------------------------------------------------------- */

interface ExistingCustomerMatch {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  businessName: string | null;
  pmbNumber: string | null;
  status: string;
}

function ExistingCustomerCard({ match, onDismiss }: { match: ExistingCustomerMatch; onDismiss: () => void }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-400">Possible Existing Customer</p>
          <p className="text-xs text-surface-400 mt-1">
            A customer matching this info already exists. Review before creating a duplicate.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
            <div><span className="text-surface-500">Name</span><p className="text-surface-200">{match.firstName} {match.lastName}</p></div>
            {match.pmbNumber && <div><span className="text-surface-500">PMB</span><p className="text-surface-200 font-mono">{match.pmbNumber}</p></div>}
            {match.email && <div><span className="text-surface-500">Email</span><p className="text-surface-200">{match.email}</p></div>}
            <div><span className="text-surface-500">Status</span><Badge dot={false} className={cn('text-[10px]', match.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-600/30 text-surface-400')}>{match.status}</Badge></div>
          </div>
        </div>
        <button onClick={onDismiss} className="p-1 rounded-md text-surface-500 hover:text-surface-300"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Recipient Row Component                                                   */
/* -------------------------------------------------------------------------- */

function RecipientRow({
  recipient,
  index,
  onChange,
  onRemove,
}: {
  recipient: PmbRecipientData;
  index: number;
  onChange: (idx: number, field: string, value: string) => void;
  onRemove: (idx: number) => void;
}) {
  const typeOptions = [
    { value: 'additional_recipient', label: 'Additional Recipient' },
    { value: 'authorized_individual', label: 'Authorized Individual' },
    { value: 'minor_exception', label: 'Minor (under 18)' },
    { value: 'employee_exception', label: 'Employee' },
  ];

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-surface-200 flex items-center gap-2">
          <UserPlus className="h-3.5 w-3.5 text-primary-500" />
          Recipient #{index + 1}
        </h4>
        <button onClick={() => onRemove(index)} className="p-1 rounded-md text-surface-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select label="Type" options={typeOptions} value={recipient.type} onChange={(e) => onChange(index, 'type', e.target.value)} />
        <Input label="First Name *" value={recipient.firstName} onChange={(e) => onChange(index, 'firstName', e.target.value)} placeholder="First name" />
        <Input label="Last Name *" value={recipient.lastName} onChange={(e) => onChange(index, 'lastName', e.target.value)} placeholder="Last name" />
      </div>
      {(recipient.type === 'authorized_individual') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Phone" value={recipient.phone || ''} onChange={(e) => onChange(index, 'phone', e.target.value)} placeholder="Phone" leftIcon={<Phone className="h-4 w-4" />} />
          <Input label="Email" value={recipient.email || ''} onChange={(e) => onChange(index, 'email', e.target.value)} placeholder="Email" leftIcon={<Mail className="h-4 w-4" />} />
        </div>
      )}
      {recipient.type === 'minor_exception' && (
        <Input label="Date of Birth *" type="date" value={recipient.dateOfBirth || ''} onChange={(e) => onChange(index, 'dateOfBirth', e.target.value)} helperText="Minors under 18 are exempt from separate PS1583 per USPS DMM 508.4" leftIcon={<Calendar className="h-4 w-4" />} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Wizard Component                                                     */
/* -------------------------------------------------------------------------- */

export default function NewCustomerPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const fileInputRef3 = useRef<HTMLInputElement>(null);
  // fileInputRefPoa removed — proof of address merged into secondary ID

  /* ── Step 0: Customer Info state ── */
  const [customerForm, setCustomerForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    businessName: '', platform: '' as MailboxPlatform | '',
    pmbNumber: '', billingTerms: 'Monthly',
    homeAddress: '', homeCity: '', homeState: '', homeZip: '',
    notifyEmail: true, notifySms: true, notes: '',
    // BAR-230: Expanded business entity fields
    businessType: '',
    businessRegPlace: '',
    businessAddress: '', businessCity: '', businessState: '', businessZip: '',
    businessPhone: '', businessEmail: '', businessWebsite: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pmbSearch, setPmbSearch] = useState('');
  const [pmbDropdownOpen, setPmbDropdownOpen] = useState(false);

  /* ── Existing customer check ── */
  const [existingMatch, setExistingMatch] = useState<ExistingCustomerMatch | null>(null);
  const [existingCheckDone, setExistingCheckDone] = useState(false);
  const [existingCheckLoading, setExistingCheckLoading] = useState(false);
  const [existingCheckDismissed, setExistingCheckDismissed] = useState(false);

  /* ── Step 1: Rate plan state ── */
  const [planTiers, setPlanTiers] = useState<PlanTierOption[]>([]);
  const [planTiersLoading, setPlanTiersLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  /* ── Step 2: ID state ── */
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
  // BAR-230: Non-compliant ID detection
  const [nonCompliantWarning, setNonCompliantWarning] = useState<string | null>(null);
  const [expirationWarning, setExpirationWarning] = useState<string | null>(null);

  /* ── Proof of Address state removed — merged into secondary ID ── */

  /* ── Step 3: PS1583 + Recipients + Forwarding ── */
  const [form1583, setForm1583] = useState<Partial<PS1583FormData>>({
    cmraName: STORE_INFO.name, cmraAddress: STORE_INFO.address,
    cmraCity: STORE_INFO.city, cmraState: STORE_INFO.state, cmraZip: STORE_INFO.zip,
    notarized: false, crdUploaded: false,
    hasForwardingAddress: false,
    courtOrderedProtected: false, courtOrderUploaded: false,
  });
  // BAR-230: Additional recipients
  const [recipients, setRecipients] = useState<PmbRecipientData[]>([]);

  /* ── Step 4: Payment state ── */
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [paymentSkipped, setPaymentSkipped] = useState(false);

  /* ── Step 5: Agreement + dual signature ── */
  const [agreementSigned, setAgreementSigned] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  // BAR-230: CMRA owner/employee countersignature
  const [cmraSignatureUrl, setCmraSignatureUrl] = useState<string | null>(null);
  const [cmraSigned, setCmraSigned] = useState(false);
  const [cmraSignedBy, setCmraSignedBy] = useState('');

  /* ── Step 6: Submit ── */
  const [created, setCreated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* ── Derived ── */
  const isBusinessPmb = customerForm.businessName.trim().length > 0;
  const selectedPlan = useMemo(() => planTiers.find((t) => t.id === selectedPlanId), [planTiers, selectedPlanId]);
  const planPrice = useMemo(() => {
    if (!selectedPlan) return 0;
    return billingCycle === 'annual' ? selectedPlan.priceAnnual : selectedPlan.priceMonthly;
  }, [selectedPlan, billingCycle]);

  const WIZARD_STEPS: Step[] = useMemo(() => [
    { id: 'info', label: 'Customer Info', description: 'Name, contact & address' },
    { id: 'plan', label: 'Mailbox & Plan', description: 'PMB & rate plan selection' },
    { id: 'ids', label: 'Identification', description: isBusinessPmb ? 'Three forms of ID' : 'Two forms of ID' },
    { id: 'form1583', label: 'PS Form 1583', description: 'USPS CMRA form' },
    { id: 'payment', label: 'Payment', description: 'Collect payment' },
    { id: 'agreement', label: 'Agreement', description: 'Sign & countersign' },
    { id: 'review', label: 'Review & Create', description: 'Confirm details' },
  ], [isBusinessPmb]);

  /* ── Assigned PMBs from real DB (replaces mock data) ── */
  const [assignedCustomers, setAssignedCustomers] = useState<Customer[]>([]);

  const rangeStats = useMemo(() => getRangeStats(DEFAULT_MAILBOX_RANGES, assignedCustomers), [assignedCustomers]);
  const availableBoxes = useMemo(() => {
    const platform = customerForm.platform as MailboxPlatform | '';
    return getAvailableBoxNumbers(DEFAULT_MAILBOX_RANGES, assignedCustomers, platform || undefined);
  }, [customerForm.platform, assignedCustomers]);
  const filteredBoxes = useMemo(() => {
    if (!pmbSearch) return availableBoxes.slice(0, 50);
    const q = pmbSearch.toLowerCase();
    return availableBoxes.filter((b) => b.label.toLowerCase().includes(q) || String(b.number).includes(q)).slice(0, 50);
  }, [availableBoxes, pmbSearch]);

  /* ── Load plan tiers + assigned PMBs on mount ── */
  useEffect(() => {
    const loadTiers = async () => {
      setPlanTiersLoading(true);
      try {
        const res = await fetch('/api/pmb/plan-tiers');
        if (res.ok) {
          const data = await res.json();
          setPlanTiers(data.tiers ?? []);
        }
      } catch (err) {
        console.error('Failed to load plan tiers:', err);
      }
      setPlanTiersLoading(false);
    };
    const loadAssignedPmbs = async () => {
      try {
        const res = await fetch('/api/pmb/assigned');
        if (res.ok) {
          const data = await res.json();
          setAssignedCustomers(data.customers ?? []);
        }
      } catch (err) {
        console.error('Failed to load assigned PMBs:', err);
      }
    };
    loadTiers();
    loadAssignedPmbs();
  }, []);

  /* ── Existing customer check ── */
  const checkExistingCustomer = useCallback(async () => {
    const { firstName, lastName, email, phone } = customerForm;
    if (!firstName.trim() || !lastName.trim()) return;
    setExistingCheckLoading(true);
    try {
      // Search by name first
      const q = `${firstName} ${lastName}`.trim();
      const res = await fetch(`/api/customers/search?q=${encodeURIComponent(q)}&mode=name&limit=3`);
      if (res.ok) {
        const data = await res.json();
        const matches = data.customers || [];
        // Also search by email if provided
        if (email.trim() && matches.length === 0) {
          const res2 = await fetch(`/api/customers/search?q=${encodeURIComponent(email)}&limit=3`);
          if (res2.ok) {
            const d2 = await res2.json();
            matches.push(...(d2.customers || []));
          }
        }
        // Also search by phone if provided
        if (phone.trim() && matches.length === 0) {
          const res3 = await fetch(`/api/customers/search?q=${encodeURIComponent(phone)}&mode=phone&limit=3`);
          if (res3.ok) {
            const d3 = await res3.json();
            matches.push(...(d3.customers || []));
          }
        }
        if (matches.length > 0) {
          setExistingMatch(matches[0]);
        } else {
          setExistingMatch(null);
        }
      }
    } catch (err) {
      console.error('Existing customer check failed:', err);
    }
    setExistingCheckDone(true);
    setExistingCheckLoading(false);
  }, [customerForm]);

  /* ── Handlers ── */
  const updateField = useCallback((field: string, value: string | boolean) => {
    setCustomerForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }, []);

  const handleAddressSelect = useCallback((parsed: ParsedAddress) => {
    setCustomerForm((prev) => ({
      ...prev, homeAddress: parsed.street, homeCity: parsed.city,
      homeState: parsed.state, homeZip: parsed.zip,
    }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next['homeAddress']; delete next['homeCity']; delete next['homeState']; delete next['homeZip'];
      return next;
    });
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

  /* ── BAR-230: Non-compliant ID check ── */
  const checkNonCompliantId = useCallback((idType: string, expirationDate: string) => {
    // Check if it's a known non-compliant ID
    const ncMatch = NON_COMPLIANT_IDS.find((nc) => nc.id === idType);
    if (ncMatch) {
      setNonCompliantWarning(`⚠️ ${ncMatch.name}: ${ncMatch.reason}\n\n${ncMatch.suggestion}`);
      return;
    }
    setNonCompliantWarning(null);
    // Check expiration
    if (expirationDate) {
      const result = checkIdExpiration(expirationDate);
      if (result.isExpired) {
        setExpirationWarning(result.message || 'This ID has expired.');
      } else if (result.isExpiringSoon) {
        setExpirationWarning(result.message || 'This ID is expiring soon.');
      } else {
        setExpirationWarning(null);
      }
    } else {
      setExpirationWarning(null);
    }
  }, []);

  // Run non-compliant check when primary ID type or expiration changes
  useEffect(() => {
    checkNonCompliantId(primaryIdType, primaryIdExpiration);
  }, [primaryIdType, primaryIdExpiration, checkNonCompliantId]);

  /* ── Recipients handlers ── */
  const addRecipient = useCallback(() => {
    setRecipients((prev) => [...prev, {
      type: 'additional_recipient', firstName: '', lastName: '',
    }]);
  }, []);

  const updateRecipient = useCallback((idx: number, field: string, value: string) => {
    setRecipients((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }, []);

  const removeRecipient = useCallback((idx: number) => {
    setRecipients((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  /* ── Payment handler ── */
  const processPayment = useCallback(async () => {
    if (!paymentMethod || !paymentAmount) return;
    setPaymentStatus('processing');
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // In production, this would call an actual payment API
    setPaymentRef(`TXN-${Date.now().toString(36).toUpperCase()}`);
    setPaymentStatus('completed');
  }, [paymentMethod, paymentAmount]);

  /* ── Auto-calculate payment amount from plan ── */
  useEffect(() => {
    if (selectedPlan && !paymentAmount) {
      const price = billingCycle === 'annual' ? selectedPlan.priceAnnual : selectedPlan.priceMonthly;
      setPaymentAmount(price.toFixed(2));
    }
  }, [selectedPlan, billingCycle]);

  /* ── Validation ── */
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
    }
    if (stepNum === 1) {
      if (!customerForm.pmbNumber) errors.pmbNumber = 'Select a PMB number';
    }
    if (stepNum === 2) {
      const idValid = validateIdPair(primaryIdType, secondaryIdType);
      if (!idValid.valid) errors.ids = idValid.error || 'Invalid ID selection';
      if (!primaryIdFile) errors.primaryFile = 'Upload primary ID';
      if (!secondaryIdFile) errors.secondaryFile = 'Upload secondary ID';
      if (nonCompliantWarning) errors.nonCompliant = 'Non-compliant ID detected — please use an accepted ID';
      if (expirationWarning && expirationWarning.includes('expired')) errors.expired = 'Expired ID cannot be used';
      if (isBusinessPmb) {
        if (!businessDocType) errors.businessDocType = 'Business document type required';
        if (!businessDocFile) errors.businessDocFile = 'Upload business documentation';
      }
    }
    // Steps 3-5 are softer — allow progression with warnings
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [customerForm, primaryIdType, secondaryIdType, primaryIdFile, secondaryIdFile, isBusinessPmb, businessDocType, businessDocFile, nonCompliantWarning, expirationWarning]);

  const handleNext = useCallback(() => {
    if (validateStep(step)) {
      // Trigger existing customer check when leaving step 0
      if (step === 0 && !existingCheckDone) {
        checkExistingCustomer();
      }
      setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
    }
  }, [step, validateStep, existingCheckDone, checkExistingCustomer, WIZARD_STEPS.length]);
  const handleBack = useCallback(() => { setStep((s) => Math.max(s - 1, 0)); }, []);

  const handleCreate = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/mailboxes/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: customerForm.firstName,
          lastName: customerForm.lastName,
          email: customerForm.email,
          phone: customerForm.phone,
          businessName: customerForm.businessName,
          pmbNumber: customerForm.pmbNumber ? `PMB ${customerForm.pmbNumber}` : undefined,
          platform: customerForm.platform || 'physical',
          billingTerms: customerForm.billingTerms,
          renewalTermMonths: billingCycle === 'annual' ? 12 : (customerForm.billingTerms === 'Monthly' ? 1 : customerForm.billingTerms === 'Quarterly' ? 3 : customerForm.billingTerms === 'Semi-Annual' ? 6 : 12),
          autoRenew: false,
          homeAddress: customerForm.homeAddress,
          homeCity: customerForm.homeCity,
          homeState: customerForm.homeState,
          homeZip: customerForm.homeZip,
          form1583SignatureUrl: signatureDataUrl,
          agreementSignatureUrl: agreementSigned ? signatureDataUrl : undefined,
          notes: customerForm.notes,
          // BAR-230: New fields
          planTierId: selectedPlanId || undefined,
          billingCycle,
          businessType: customerForm.businessType || undefined,
          businessRegPlace: customerForm.businessRegPlace || undefined,
          businessAddress: customerForm.businessAddress || undefined,
          businessCity: customerForm.businessCity || undefined,
          businessState: customerForm.businessState || undefined,
          businessZip: customerForm.businessZip || undefined,
          businessPhone: customerForm.businessPhone || undefined,
          businessEmail: customerForm.businessEmail || undefined,
          businessWebsite: customerForm.businessWebsite || undefined,
          hasForwardingAddress: form1583.hasForwardingAddress || false,
          forwardingAddress: form1583.forwardingAddress || undefined,
          forwardingCity: form1583.forwardingCity || undefined,
          forwardingState: form1583.forwardingState || undefined,
          forwardingZip: form1583.forwardingZip || undefined,
          isCourtProtected: form1583.courtOrderedProtected || false,
          cmraSignatureUrl: cmraSignatureUrl || undefined,
          cmraSignedBy: cmraSignedBy || undefined,
          onboardingPaymentStatus: paymentStatus === 'completed' ? 'completed' : paymentSkipped ? 'pending' : 'pending',
          onboardingPaymentMethod: paymentMethod || undefined,
          onboardingPaymentAmount: paymentAmount ? parseFloat(paymentAmount) : undefined,
          onboardingPaymentRef: paymentRef || undefined,
          recipients: recipients.filter((r) => r.firstName && r.lastName),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCreated(true);
      } else {
        setSubmitError(data.error || 'Failed to register mailbox');
      }
    } catch (e) {
      setSubmitError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }, [customerForm, signatureDataUrl, agreementSigned, selectedPlanId, billingCycle, form1583, cmraSignatureUrl, cmraSignedBy, paymentStatus, paymentSkipped, paymentMethod, paymentAmount, paymentRef, recipients]);

  /* ── Success screen ── */
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
              <div className="text-xs text-surface-500">Plan</div>
              <div className="text-sm font-semibold text-primary-400">{selectedPlan?.name || 'None'}</div>
            </div>
            <div className="glass-card p-3 text-center">
              <div className="text-xs text-surface-500">Payment</div>
              <div className="text-sm font-semibold text-emerald-400">{paymentStatus === 'completed' ? `$${paymentAmount}` : 'Pending'}</div>
            </div>
            <div className="glass-card p-3 text-center">
              <div className="text-xs text-surface-500">Agreement</div>
              <div className="text-sm font-semibold text-emerald-400">{agreementSigned && cmraSigned ? 'Dual Signed' : agreementSigned ? 'Customer Signed' : 'Pending'}</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button variant="ghost" onClick={() => router.push('/dashboard/customers')}>View All Customers</Button>
            <Button onClick={() => window.location.reload()}>Add Another Customer</Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Render ── */
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/customers')} leftIcon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
            <h1 className="text-xl font-bold text-surface-100">New PMB Customer</h1>
          </div>
          <p className="text-sm text-surface-400 mt-1 ml-[72px]">Complete all steps to register a new mailbox account</p>
        </div>
      </div>

      {/* Stepper */}
      <Card padding="sm">
        <Stepper steps={WIZARD_STEPS} currentStep={step} />
      </Card>

      {/* Step content */}
      <div className="min-h-[400px]">

        {/* ================================================================ */}
        {/* Step 0: Customer Info + Existing Customer Check                   */}
        {/* ================================================================ */}
        {step === 0 && (
          <div className="space-y-6">
            {/* Existing customer match warning */}
            {existingMatch && !existingCheckDismissed && (
              <ExistingCustomerCard match={existingMatch} onDismiss={() => setExistingCheckDismissed(true)} />
            )}

            <Card padding="md">
              <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4 text-primary-500" />Customer Information</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="First Name *" value={customerForm.firstName} onChange={(e) => updateField('firstName', e.target.value)} error={formErrors.firstName} placeholder="John" leftIcon={<User className="h-4 w-4" />} />
                  <Input label="Last Name *" value={customerForm.lastName} onChange={(e) => updateField('lastName', e.target.value)} error={formErrors.lastName} placeholder="Doe" leftIcon={<User className="h-4 w-4" />} />
                  <Input label="Email *" type="email" value={customerForm.email} onChange={(e) => updateField('email', e.target.value)} error={formErrors.email} placeholder="john@example.com" leftIcon={<Mail className="h-4 w-4" />} />
                  <Input label="Phone *" type="tel" value={customerForm.phone} onChange={(e) => updateField('phone', e.target.value)} error={formErrors.phone} placeholder="(555) 555-5555" leftIcon={<Phone className="h-4 w-4" />} />
                  <div className="sm:col-span-2">
                    <Input label="Business Name" value={customerForm.businessName} onChange={(e) => updateField('businessName', e.target.value)} placeholder="Leave blank for personal accounts" leftIcon={<Building2 className="h-4 w-4" />} helperText={isBusinessPmb ? '✓ Business PMB — additional documentation required' : 'Optional — enter to create a business PMB'} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business entity fields — only show if business name is entered */}
            {isBusinessPmb && (
              <Card padding="md">
                <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4 text-amber-500" />Business Entity Details (PS1583 §7)</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select label="Business Type (§7b)" options={BUSINESS_ENTITY_TYPES} value={customerForm.businessType} onChange={(e) => updateField('businessType', e.target.value)} placeholder="Select entity type..." />
                    <Input label="Place of Registration (§7i)" value={customerForm.businessRegPlace} onChange={(e) => updateField('businessRegPlace', e.target.value)} placeholder="State/county or country" helperText="Where the business is registered" />
                    <div className="sm:col-span-2"><Input label="Business Address (§7c)" value={customerForm.businessAddress} onChange={(e) => updateField('businessAddress', e.target.value)} placeholder="Business street address" leftIcon={<MapPin className="h-4 w-4" />} /></div>
                    <Input label="City (§7d)" value={customerForm.businessCity} onChange={(e) => updateField('businessCity', e.target.value)} placeholder="City" />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="State (§7e)" value={customerForm.businessState} onChange={(e) => updateField('businessState', e.target.value)} placeholder="ST" />
                      <Input label="ZIP (§7f)" value={customerForm.businessZip} onChange={(e) => updateField('businessZip', e.target.value)} placeholder="ZIP" />
                    </div>
                    <Input label="Business Phone (§7h)" value={customerForm.businessPhone} onChange={(e) => updateField('businessPhone', e.target.value)} placeholder="(555) 555-5555" leftIcon={<Phone className="h-4 w-4" />} />
                    <Input label="Business Email" value={customerForm.businessEmail} onChange={(e) => updateField('businessEmail', e.target.value)} placeholder="business@example.com" leftIcon={<Mail className="h-4 w-4" />} />
                    <Input label="Website" value={customerForm.businessWebsite} onChange={(e) => updateField('businessWebsite', e.target.value)} placeholder="https://example.com" />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card padding="md">
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary-500" />Home Address</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <AddressAutocomplete value={customerForm.homeAddress} onChange={(v) => updateField('homeAddress', v)} onSelect={handleAddressSelect} />
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2"><Input label="Street Address *" value={customerForm.homeAddress} onChange={(e) => updateField('homeAddress', e.target.value)} error={formErrors.homeAddress} leftIcon={<MapPin className="h-4 w-4" />} /></div>
                    <Input label="City *" value={customerForm.homeCity} onChange={(e) => updateField('homeCity', e.target.value)} error={formErrors.homeCity} />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="State *" value={customerForm.homeState} onChange={(e) => updateField('homeState', e.target.value)} error={formErrors.homeState} />
                      <Input label="ZIP *" value={customerForm.homeZip} onChange={(e) => updateField('homeZip', e.target.value)} error={formErrors.homeZip} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card padding="md">
              <CardHeader><CardTitle className="flex items-center gap-2"><Info className="h-4 w-4 text-primary-500" />Preferences</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select label="Billing Terms" options={[{ value: 'Monthly', label: 'Monthly' }, { value: 'Quarterly', label: 'Quarterly' }, { value: 'Semi-Annual', label: 'Semi-Annual' }, { value: 'Annual', label: 'Annual' }]} value={customerForm.billingTerms} onChange={(e) => updateField('billingTerms', e.target.value)} />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-surface-300">Notifications</p>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm text-surface-400 cursor-pointer"><input type="checkbox" checked={customerForm.notifyEmail} onChange={(e) => updateField('notifyEmail', e.target.checked)} className="rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500/30" />Email</label>
                      <label className="flex items-center gap-2 text-sm text-surface-400 cursor-pointer"><input type="checkbox" checked={customerForm.notifySms} onChange={(e) => updateField('notifySms', e.target.checked)} className="rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500/30" />SMS</label>
                    </div>
                  </div>
                  <div className="sm:col-span-2"><Textarea label="Notes" value={customerForm.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="Internal notes about this customer..." rows={2} /></div>
                </div>
              </CardContent>
            </Card>

            {/* Quick duplicate check button */}
            {!existingCheckDone && customerForm.firstName && customerForm.lastName && (
              <div className="flex justify-center">
                <Button variant="ghost" size="sm" onClick={checkExistingCustomer} leftIcon={existingCheckLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} disabled={existingCheckLoading}>
                  {existingCheckLoading ? 'Checking...' : 'Check for Existing Customer'}
                </Button>
              </div>
            )}
            {existingCheckDone && !existingMatch && (
              <div className="flex items-center justify-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> No existing customer found — safe to proceed
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* Step 1: Mailbox & Rate Plan Selection                             */}
        {/* ================================================================ */}
        {step === 1 && (
          <div className="space-y-6">
            {/* PMB Number Selection */}
            <Card padding="md">
              <CardHeader><CardTitle className="flex items-center gap-2"><Mailbox className="h-4 w-4 text-primary-500" />PMB Number Selection</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {rangeStats.map((r) => {
                      const occupancy = r.total > 0 ? Math.round((r.rented / r.total) * 100) : 0;
                      return (
                        <button key={r.id} onClick={() => { updateField('platform', r.platform); setPmbDropdownOpen(true); }} className={cn('p-3 rounded-lg border text-left transition-all', customerForm.platform === r.platform ? 'border-primary-500 bg-primary-500/10' : 'border-surface-700 hover:border-surface-600 bg-surface-900/50')}>
                          <div className="flex items-center gap-2">
                            <Badge dot={false} className={cn('text-[10px] border', platformLabels[r.platform]?.color)}>{platformLabels[r.platform]?.label}</Badge>
                          </div>
                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-lg font-bold text-surface-100">{r.available}</span>
                            <span className="text-xs text-surface-500">available</span>
                          </div>
                          <div className="w-full bg-surface-800 rounded-full h-1.5 mt-1.5">
                            <div className="bg-primary-500/60 h-1.5 rounded-full" style={{ width: `${occupancy}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* PMB picker */}
                  <div className="relative">
                    <div onClick={() => setPmbDropdownOpen(!pmbDropdownOpen)} className={cn('flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors', customerForm.pmbNumber ? 'border-primary-500/50 bg-primary-500/5' : 'border-surface-700 bg-surface-900/50 hover:border-surface-600', formErrors.pmbNumber && 'border-red-500/50')}>
                      <Mailbox className="h-4 w-4 text-surface-400" />
                      <span className={cn('flex-1 text-sm', customerForm.pmbNumber ? 'text-surface-100 font-mono font-medium' : 'text-surface-500')}>
                        {customerForm.pmbNumber ? formatPmbNumber(parseInt(customerForm.pmbNumber)) : 'Select PMB number...'}
                      </span>
                      <ChevronDown className={cn('h-4 w-4 text-surface-400 transition-transform', pmbDropdownOpen && 'rotate-180')} />
                    </div>
                    {formErrors.pmbNumber && <p className="text-xs text-red-400 mt-1">{formErrors.pmbNumber}</p>}
                    {pmbDropdownOpen && (
                      <div className="absolute z-20 top-full mt-1 left-0 right-0 rounded-lg border border-surface-700 bg-surface-900 shadow-xl max-h-64 overflow-hidden">
                        <div className="p-2 border-b border-surface-700">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-500" />
                            <input type="text" placeholder="Search PMB..." value={pmbSearch} onChange={(e) => setPmbSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-surface-800 border border-surface-700 text-surface-200 focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/50 outline-none" autoFocus />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto p-1">
                          {filteredBoxes.map((box) => (
                            <button key={box.number} onClick={() => selectPmb(box.number, box.platform)} className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-surface-800 transition-colors">
                              <span className="font-mono text-surface-200">{box.label}</span>
                              <Badge dot={false} className={cn('text-[10px] border', platformLabels[box.platform]?.color)}>{platformLabels[box.platform]?.label}</Badge>
                            </button>
                          ))}
                          {filteredBoxes.length === 0 && <p className="text-center text-xs text-surface-500 py-4">No matching PMB numbers</p>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rate Plan Selection */}
            <Card padding="md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Crown className="h-4 w-4 text-amber-500" />Rate Plan</CardTitle>
                {/* Billing cycle toggle */}
                <div className="flex items-center gap-1 bg-surface-800 rounded-lg p-0.5">
                  <button className={cn('px-3 py-1 rounded-md text-xs font-medium transition-colors', billingCycle === 'monthly' ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-surface-200')} onClick={() => setBillingCycle('monthly')}>Monthly</button>
                  <button className={cn('px-3 py-1 rounded-md text-xs font-medium transition-colors', billingCycle === 'annual' ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-surface-200')} onClick={() => setBillingCycle('annual')}>Annual</button>
                </div>
              </CardHeader>
              <CardContent>
                {planTiersLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-surface-400" /></div>
                ) : planTiers.length === 0 ? (
                  <div className="text-center py-8 text-surface-500 text-sm">No plan tiers configured. You can continue without a plan.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {planTiers.map((tier) => {
                      const price = billingCycle === 'annual' ? tier.priceAnnual : tier.priceMonthly;
                      const isSelected = selectedPlanId === tier.id;
                      const monthlyEquiv = billingCycle === 'annual' ? (tier.priceAnnual / 12) : tier.priceMonthly;
                      const savings = billingCycle === 'annual' ? ((tier.priceMonthly * 12) - tier.priceAnnual) : 0;
                      return (
                        <button key={tier.id} onClick={() => setSelectedPlanId(tier.id)} className={cn('relative p-4 rounded-lg border text-left transition-all', isSelected ? 'border-primary-500 bg-primary-500/10 ring-2 ring-primary-500/20' : 'border-surface-700 hover:border-surface-600 bg-surface-900/50')}>
                          {isSelected && <div className="absolute -top-2 -right-2"><CheckCircle2 className="h-5 w-5 text-primary-500 bg-surface-950 rounded-full" /></div>}
                          <div className="space-y-3">
                            <div>
                              <h4 className="text-sm font-semibold text-surface-100">{tier.name}</h4>
                              {tier.description && <p className="text-[11px] text-surface-500 mt-0.5">{tier.description}</p>}
                            </div>
                            <div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-surface-100">${price.toFixed(0)}</span>
                                <span className="text-xs text-surface-500">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
                              </div>
                              {billingCycle === 'annual' && (
                                <p className="text-[11px] text-emerald-400 mt-0.5">${monthlyEquiv.toFixed(2)}/mo · Save ${savings.toFixed(0)}/yr</p>
                              )}
                            </div>
                            <div className="space-y-1.5 text-[11px] text-surface-400">
                              <div className="flex justify-between"><span>Mail items/mo</span><span className="text-surface-200 font-medium">{tier.includedMailItems}</span></div>
                              <div className="flex justify-between"><span>Scans/mo</span><span className="text-surface-200 font-medium">{tier.includedScans}</span></div>
                              <div className="flex justify-between"><span>Storage</span><span className="text-surface-200 font-medium">{tier.freeStorageDays} days</span></div>
                              <div className="flex justify-between"><span>Max recipients</span><span className="text-surface-200 font-medium">{tier.maxRecipients}</span></div>
                              {tier.includedForwarding > 0 && <div className="flex justify-between"><span>Forwarding/mo</span><span className="text-surface-200 font-medium">{tier.includedForwarding}</span></div>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {!selectedPlanId && planTiers.length > 0 && (
                  <p className="text-[11px] text-surface-500 mt-3 text-center">Select a plan or continue without one to set pricing later</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ================================================================ */}
        {/* Step 2: Identification + Non-Compliant ID Detection               */}
        {/* ================================================================ */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Non-compliant ID warning */}
            {nonCompliantWarning && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-400">Non-Compliant ID Detected</p>
                  <p className="text-xs text-surface-400 mt-1 whitespace-pre-wrap">{nonCompliantWarning}</p>
                </div>
              </div>
            )}
            {expirationWarning && !nonCompliantWarning && (
              <div className={cn('rounded-lg border p-4 flex items-start gap-3', expirationWarning.includes('expired') ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5')}>
                <AlertCircle className={cn('h-5 w-5 mt-0.5 flex-shrink-0', expirationWarning.includes('expired') ? 'text-red-400' : 'text-amber-400')} />
                <div>
                  <p className={cn('text-sm font-medium', expirationWarning.includes('expired') ? 'text-red-400' : 'text-amber-400')}>
                    {expirationWarning.includes('expired') ? 'Expired ID' : 'ID Expiring Soon'}
                  </p>
                  <p className="text-xs text-surface-400 mt-1">{expirationWarning}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Primary ID */}
              <Card padding="md">
                <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary-500" />Primary ID (Photo Required)</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Select label="ID Type *" placeholder="Select primary ID..." options={[
                      ...USPS_PRIMARY_IDS.map((id) => ({ value: id.id, label: id.name })),
                      { value: '_divider', label: '── Non-Compliant (will be flagged) ──', disabled: true },
                      ...NON_COMPLIANT_IDS.map((nc) => ({ value: nc.id, label: `⚠️ ${nc.name}` })),
                    ]} value={primaryIdType} onChange={(e) => setPrimaryIdType(e.target.value)} error={formErrors.ids} />
                    <Input label="Expiration Date" type="date" value={primaryIdExpiration} onChange={(e) => setPrimaryIdExpiration(e.target.value)} leftIcon={<Calendar className="h-4 w-4" />} helperText="Leave blank if ID does not expire" />
                    <div>
                      <label className="text-sm font-medium text-surface-300 mb-1.5 block">Upload ID Scan/Photo *</label>
                      <input ref={fileInputRef1} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'primary'); }} />
                      {primaryIdPreview ? (
                        <div className="relative rounded-lg border border-surface-700 overflow-hidden">
                          <img src={primaryIdPreview} alt="Primary ID" className="w-full h-40 object-cover" />
                          <div className="absolute top-2 right-2"><button onClick={() => { setPrimaryIdFile(null); setPrimaryIdPreview(null); setExtractedData(null); }} className="p-1.5 rounded-md bg-surface-900/80 text-surface-400 hover:text-red-400 backdrop-blur-sm"><X className="h-3.5 w-3.5" /></button></div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface-900/90 to-transparent p-2"><p className="text-xs text-surface-300 truncate">{primaryIdFile?.name}</p></div>
                        </div>
                      ) : (
                        <div onClick={() => fileInputRef1.current?.click()} className="rounded-lg border-2 border-dashed border-surface-700 hover:border-primary-500/50 hover:bg-primary-500/5 p-6 text-center cursor-pointer transition-colors">
                          <Upload className="h-8 w-8 text-surface-500 mx-auto mb-2" /><p className="text-sm text-surface-400">Click to upload or drag & drop</p><p className="text-xs text-surface-600 mt-1">JPG, PNG, PDF up to 10MB</p>
                        </div>
                      )}
                      {formErrors.primaryFile && <p className="text-xs text-red-400 mt-1">{formErrors.primaryFile}</p>}
                    </div>
                    {primaryIdFile && !extractedData && (
                      <Button variant="default" size="sm" onClick={simulateOCR} disabled={extracting} leftIcon={extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}>
                        {extracting ? 'Extracting...' : 'Extract ID Data (OCR)'}
                      </Button>
                    )}
                    {extractedData && (
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
                        <p className="text-xs font-medium text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Data Extracted</p>
                        <div className="grid grid-cols-2 gap-1 text-[11px]">
                          {extractedData.fullName && <><span className="text-surface-500">Name</span><span className="text-surface-300">{extractedData.fullName}</span></>}
                          {extractedData.dateOfBirth && <><span className="text-surface-500">DOB</span><span className="text-surface-300">{extractedData.dateOfBirth}</span></>}
                          {extractedData.idNumber && <><span className="text-surface-500">ID#</span><span className="text-surface-300 font-mono">{extractedData.idNumber}</span></>}
                          {extractedData.expirationDate && <><span className="text-surface-500">Expires</span><span className="text-surface-300">{extractedData.expirationDate}</span></>}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Secondary ID */}
              <Card padding="md">
                <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary-500" />Secondary ID (Proof of Address)</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Select label="Document Type *" placeholder="Select proof of address..." options={PROOF_OF_ADDRESS_TYPES} value={secondaryIdType} onChange={(e) => setSecondaryIdType(e.target.value)} />
                    <Input label="Date of Issue" type="date" value={secondaryIdExpiration} onChange={(e) => setSecondaryIdExpiration(e.target.value)} leftIcon={<Calendar className="h-4 w-4" />} helperText="Date the document was issued" />
                    <div>
                      <label className="text-sm font-medium text-surface-300 mb-1.5 block">Upload ID Scan/Photo *</label>
                      <input ref={fileInputRef2} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'secondary'); }} />
                      {secondaryIdPreview ? (
                        <div className="relative rounded-lg border border-surface-700 overflow-hidden">
                          <img src={secondaryIdPreview} alt="Secondary ID" className="w-full h-40 object-cover" />
                          <div className="absolute top-2 right-2"><button onClick={() => { setSecondaryIdFile(null); setSecondaryIdPreview(null); }} className="p-1.5 rounded-md bg-surface-900/80 text-surface-400 hover:text-red-400 backdrop-blur-sm"><X className="h-3.5 w-3.5" /></button></div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface-900/90 to-transparent p-2"><p className="text-xs text-surface-300 truncate">{secondaryIdFile?.name}</p></div>
                        </div>
                      ) : (
                        <div onClick={() => fileInputRef2.current?.click()} className="rounded-lg border-2 border-dashed border-surface-700 hover:border-primary-500/50 hover:bg-primary-500/5 p-6 text-center cursor-pointer transition-colors">
                          <Upload className="h-8 w-8 text-surface-500 mx-auto mb-2" /><p className="text-sm text-surface-400">Click to upload or drag & drop</p><p className="text-xs text-surface-600 mt-1">JPG, PNG, PDF up to 10MB</p>
                        </div>
                      )}
                      {formErrors.secondaryFile && <p className="text-xs text-red-400 mt-1">{formErrors.secondaryFile}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Business Document (if business PMB) */}
            {isBusinessPmb && (
              <Card padding="md">
                <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4 text-amber-500" />Business Documentation</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Select label="Document Type *" placeholder="Select business document..." options={BUSINESS_DOC_TYPES} value={businessDocType} onChange={(e) => setBusinessDocType(e.target.value)} error={formErrors.businessDocType} />
                    <div>
                      <label className="text-sm font-medium text-surface-300 mb-1.5 block">Upload Document *</label>
                      <input ref={fileInputRef3} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { const file = e.target.files[0]; const reader = new FileReader(); reader.onload = (ev) => { setBusinessDocPreview(ev.target?.result as string); setBusinessDocFile(file); }; reader.readAsDataURL(file); } }} />
                      {businessDocPreview ? (
                        <div className="relative rounded-lg border border-surface-700 overflow-hidden">
                          <img src={businessDocPreview} alt="Business Doc" className="w-full h-40 object-cover" />
                          <div className="absolute top-2 right-2"><button onClick={() => { setBusinessDocFile(null); setBusinessDocPreview(null); }} className="p-1.5 rounded-md bg-surface-900/80 text-surface-400 hover:text-red-400 backdrop-blur-sm"><X className="h-3.5 w-3.5" /></button></div>
                        </div>
                      ) : (
                        <div onClick={() => fileInputRef3.current?.click()} className="rounded-lg border-2 border-dashed border-surface-700 hover:border-primary-500/50 hover:bg-primary-500/5 p-6 text-center cursor-pointer transition-colors">
                          <Upload className="h-8 w-8 text-surface-500 mx-auto mb-2" /><p className="text-sm text-surface-400">Click to upload</p>
                        </div>
                      )}
                      {formErrors.businessDocFile && <p className="text-xs text-red-400 mt-1">{formErrors.businessDocFile}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Proof of Address section removed — secondary ID IS the proof of address */}
          </div>
        )}

        {/* ================================================================ */}
        {/* Step 3: PS Form 1583 + Recipients + Forwarding                    */}
        {/* ================================================================ */}
        {step === 3 && (
          <div className="space-y-6">
            <Card padding="md">
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary-500" />PS Form 1583 — Application for Delivery of Mail Through Agent</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-xs text-surface-400 flex items-center gap-2"><Info className="h-3.5 w-3.5" /> Auto-populated from ID extraction and customer info. Review and complete any missing fields.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Applicant Name (§1)" value={form1583.applicantName || ''} onChange={(e) => setForm1583((p) => ({ ...p, applicantName: e.target.value }))} placeholder="Full legal name" />
                    <Input label="Date of Birth (§2)" type="date" value={form1583.dateOfBirth || ''} onChange={(e) => setForm1583((p) => ({ ...p, dateOfBirth: e.target.value }))} leftIcon={<Calendar className="h-4 w-4" />} />
                    <Input label="Home Address (§3a)" value={form1583.homeAddress || ''} onChange={(e) => setForm1583((p) => ({ ...p, homeAddress: e.target.value }))} leftIcon={<MapPin className="h-4 w-4" />} />
                    <div className="grid grid-cols-3 gap-3">
                      <Input label="City (§3b)" value={form1583.homeCity || ''} onChange={(e) => setForm1583((p) => ({ ...p, homeCity: e.target.value }))} />
                      <Input label="State (§3c)" value={form1583.homeState || ''} onChange={(e) => setForm1583((p) => ({ ...p, homeState: e.target.value }))} />
                      <Input label="ZIP (§3d)" value={form1583.homeZip || ''} onChange={(e) => setForm1583((p) => ({ ...p, homeZip: e.target.value }))} />
                    </div>
                    <Input label="PMB Number (§4)" value={form1583.pmbNumber || customerForm.pmbNumber} readOnly className="font-mono" leftIcon={<Lock className="h-4 w-4" />} />
                    <Input label="CMRA Name (§4a)" value={form1583.cmraName || ''} readOnly leftIcon={<Lock className="h-4 w-4" />} />
                  </div>

                  {/* Court-protected individual (§4k) */}
                  <div className="rounded-lg border border-surface-700 bg-surface-900/50 p-4">
                    <label className="flex items-center gap-2 text-sm text-surface-300 cursor-pointer">
                      <input type="checkbox" checked={form1583.courtOrderedProtected || false} onChange={(e) => setForm1583((p) => ({ ...p, courtOrderedProtected: e.target.checked }))} className="rounded border-surface-600 bg-surface-800 text-primary-500" />
                      Court-Protected Individual (§4k)
                    </label>
                    <p className="text-[11px] text-surface-500 mt-1 ml-6">Check if applicant has a court order restricting disclosure of their address</p>
                    {form1583.courtOrderedProtected && (
                      <p className="text-xs text-amber-400 mt-2 ml-6 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Court order documentation must be uploaded and kept on file</p>
                    )}
                  </div>

                  {/* ID info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Primary ID Type (§10a)" value={USPS_PRIMARY_IDS.find((id) => id.id === primaryIdType)?.name || primaryIdType} readOnly />
                    <Input label="Primary ID # (§10d)" value={form1583.primaryIdNumber || ''} onChange={(e) => setForm1583((p) => ({ ...p, primaryIdNumber: e.target.value }))} placeholder="ID number" />
                    <Input label="Primary ID Issuer (§10e)" value={form1583.primaryIdIssuer || ''} onChange={(e) => setForm1583((p) => ({ ...p, primaryIdIssuer: e.target.value }))} placeholder="Issuing authority" />
                    <Input label="Secondary ID Type (§11a)" value={PROOF_OF_ADDRESS_TYPES.find((t) => t.value === secondaryIdType)?.label || secondaryIdType} readOnly />
                    <Input label="Secondary ID # (§11d)" value={form1583.secondaryIdNumber || ''} onChange={(e) => setForm1583((p) => ({ ...p, secondaryIdNumber: e.target.value }))} />
                    <Input label="Secondary ID Issuer (§11e)" value={form1583.secondaryIdIssuer || ''} onChange={(e) => setForm1583((p) => ({ ...p, secondaryIdIssuer: e.target.value }))} />
                  </div>

                  {/* Compliance checkboxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-sm text-surface-300 cursor-pointer p-3 rounded-lg border border-surface-700 bg-surface-900/50 hover:bg-surface-800/50 transition-colors">
                      <input type="checkbox" checked={form1583.notarized || false} onChange={(e) => setForm1583((p) => ({ ...p, notarized: e.target.checked }))} className="rounded border-surface-600 bg-surface-800 text-primary-500" />
                      Form Notarized
                    </label>
                    <label className="flex items-center gap-2 text-sm text-surface-300 cursor-pointer p-3 rounded-lg border border-surface-700 bg-surface-900/50 hover:bg-surface-800/50 transition-colors">
                      <input type="checkbox" checked={form1583.crdUploaded || false} onChange={(e) => setForm1583((p) => ({ ...p, crdUploaded: e.target.checked }))} className="rounded border-surface-600 bg-surface-800 text-primary-500" />
                      IDs Uploaded to USPS CRD
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BAR-230: Forwarding Address (Section 6) */}
            <Card padding="md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary-500" />Forwarding Address (§6)</CardTitle>
                <label className="flex items-center gap-2 text-sm text-surface-400 cursor-pointer">
                  <input type="checkbox" checked={form1583.hasForwardingAddress || false} onChange={(e) => setForm1583((p) => ({ ...p, hasForwardingAddress: e.target.checked }))} className="rounded border-surface-600 bg-surface-800 text-primary-500" />
                  Has forwarding address
                </label>
              </CardHeader>
              {form1583.hasForwardingAddress && (
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2"><Input label="Forwarding Street Address (§6a)" value={form1583.forwardingAddress || ''} onChange={(e) => setForm1583((p) => ({ ...p, forwardingAddress: e.target.value }))} placeholder="Street address for mail forwarding" leftIcon={<MapPin className="h-4 w-4" />} /></div>
                    <Input label="City (§6b)" value={form1583.forwardingCity || ''} onChange={(e) => setForm1583((p) => ({ ...p, forwardingCity: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="State (§6c)" value={form1583.forwardingState || ''} onChange={(e) => setForm1583((p) => ({ ...p, forwardingState: e.target.value }))} />
                      <Input label="ZIP (§6d)" value={form1583.forwardingZip || ''} onChange={(e) => setForm1583((p) => ({ ...p, forwardingZip: e.target.value }))} />
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-400 mt-3 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Per USPS: A new PS1583 is required each time the forwarding address changes.</p>
                </CardContent>
              )}
            </Card>

            {/* BAR-230: Additional Recipients / Authorized Individuals */}
            <Card padding="md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary-500" />Additional Recipients & Authorized Individuals (§5)</CardTitle>
                <Button variant="ghost" size="sm" onClick={addRecipient} leftIcon={<UserPlus className="h-3.5 w-3.5" />}>Add</Button>
              </CardHeader>
              <CardContent>
                {recipients.length === 0 ? (
                  <div className="text-center py-6 text-surface-500 text-sm">
                    <p>No additional recipients. Click "Add" to register additional people authorized to receive mail at this PMB.</p>
                    <p className="text-[11px] mt-1">Each additional recipient (non-minor, non-employee) needs their own PS1583.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recipients.map((r, idx) => (
                      <RecipientRow key={idx} recipient={r} index={idx} onChange={updateRecipient} onRemove={removeRecipient} />
                    ))}
                    {selectedPlan && recipients.length >= selectedPlan.maxRecipients && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                        <p className="text-xs text-amber-400">This plan allows {selectedPlan.maxRecipients} recipient(s). Additional recipients may incur overage fees.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ================================================================ */}
        {/* Step 4: Payment Processing                                        */}
        {/* ================================================================ */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Payment summary */}
            <Card padding="md">
              <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-500" />Payment Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedPlan ? (
                    <div className="rounded-lg border border-surface-700 bg-surface-900/50 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-surface-200">{selectedPlan.name}</p>
                          <p className="text-[11px] text-surface-500">{billingCycle === 'annual' ? 'Annual' : 'Monthly'} billing</p>
                        </div>
                        <p className="text-lg font-bold text-surface-100">${planPrice.toFixed(2)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-surface-500 text-sm">No plan selected — enter custom amount</div>
                  )}
                  <Input label="Amount to Collect *" type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} leftIcon={<DollarSign className="h-4 w-4" />} placeholder="0.00" />
                </div>
              </CardContent>
            </Card>

            {/* Payment method */}
            <Card padding="md">
              <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary-500" />Payment Method</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PAYMENT_METHODS.map((pm) => (
                    <button key={pm.value} onClick={() => setPaymentMethod(pm.value)} className={cn('p-4 rounded-lg border text-left transition-all', paymentMethod === pm.value ? 'border-primary-500 bg-primary-500/10 ring-2 ring-primary-500/20' : 'border-surface-700 hover:border-surface-600 bg-surface-900/50')}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{pm.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-surface-200">{pm.label}</p>
                          <p className="text-[11px] text-surface-500">{pm.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment action */}
            {paymentMethod && paymentAmount && (
              <Card padding="md">
                <CardContent>
                  {paymentStatus === 'idle' && (
                    <div className="space-y-4">
                      {paymentMethod === 'cash' && (
                        <Input label="Cash Reference / Drawer #" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="e.g. Drawer A, Receipt #123" />
                      )}
                      {paymentMethod === 'text2pay' && (
                        <div className="rounded-lg border border-surface-700 bg-surface-900/50 p-4">
                          <p className="text-sm text-surface-300">A payment link will be sent to <span className="text-primary-400">{customerForm.phone || 'customer phone'}</span></p>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Button variant="default" onClick={processPayment} leftIcon={<DollarSign className="h-4 w-4" />}>
                          {paymentMethod === 'cash' ? 'Record Cash Payment' : `Process $${parseFloat(paymentAmount).toFixed(2)}`}
                        </Button>
                        <Button variant="ghost" onClick={() => { setPaymentSkipped(true); }}>Skip Payment (collect later)</Button>
                      </div>
                    </div>
                  )}
                  {paymentStatus === 'processing' && (
                    <div className="flex items-center justify-center gap-3 py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                      <p className="text-sm text-surface-300">Processing payment...</p>
                    </div>
                  )}
                  {paymentStatus === 'completed' && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-emerald-400">Payment Successful</p>
                        <p className="text-xs text-surface-400">${parseFloat(paymentAmount).toFixed(2)} via {PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label} · Ref: {paymentRef}</p>
                      </div>
                    </div>
                  )}
                  {paymentStatus === 'failed' && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <X className="h-5 w-5 text-red-400" />
                        <p className="text-sm font-medium text-red-400">Payment Failed</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setPaymentStatus('idle')}>Try Again</Button>
                    </div>
                  )}
                  {paymentSkipped && paymentStatus === 'idle' && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                      <p className="text-xs text-amber-400">Payment skipped — customer will need to pay before account activation.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* Step 5: Service Agreement + Dual Signatures                       */}
        {/* ================================================================ */}
        {step === 5 && (
          <div className="space-y-6">
            <Card padding="md">
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary-500" />Mailbox Service Agreement</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-surface-400 mb-4">Review the agreement below. This is auto-populated with customer and store details. Stores can customize this template in Settings → Mailbox Configuration.</p>
                <div className="rounded-lg border border-surface-700 bg-surface-950 p-6 max-h-[400px] overflow-y-auto font-mono text-xs text-surface-300 leading-relaxed whitespace-pre-wrap">
                  {getAgreementText({ customerName: `${customerForm.firstName} ${customerForm.lastName}`, pmbNumber: customerForm.pmbNumber, storeName: STORE_INFO.name, storeAddress: STORE_INFO.address, storeCity: STORE_INFO.city, storeState: STORE_INFO.state, storeZip: STORE_INFO.zip, openDate: new Date().toLocaleDateString(), billingCycle: billingCycle === 'annual' ? 'Annual' : 'Monthly' }, isBusinessPmb, selectedPlan?.name)}
                </div>
              </CardContent>
            </Card>

            {/* Customer Signature (§13a) */}
            <Card padding="md">
              <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary-500" />Customer Signature (§13a)</CardTitle></CardHeader>
              <CardContent>
                {signatureDataUrl ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <div><p className="text-sm font-medium text-emerald-400">Agreement Signed</p><p className="text-xs text-surface-400">Signed on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p></div>
                      <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setSignatureDataUrl(null); setAgreementSigned(false); }}>Re-sign</Button>
                    </div>
                    <div className="rounded-lg border border-surface-700 p-3 bg-white"><img src={signatureDataUrl} alt="Customer Signature" className="max-h-24 mx-auto" /></div>
                  </div>
                ) : (
                  <SignaturePad onSign={(dataUrl) => { setSignatureDataUrl(dataUrl); setAgreementSigned(true); }} onClear={() => setAgreementSigned(false)} />
                )}
              </CardContent>
            </Card>

            {/* BAR-230: CMRA Owner/Employee Countersignature (§14a) */}
            <Card padding="md">
              <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4 text-amber-500" />CMRA Owner / Employee Countersignature (§14a)</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-surface-400 mb-4">
                  Per USPS regulations, the CMRA owner or a designee must countersign the PS Form 1583 acknowledging that the applicant has been verified.
                </p>
                <Input label="Employee / CMRA Owner Name *" value={cmraSignedBy} onChange={(e) => setCmraSignedBy(e.target.value)} placeholder="Name of person countersigning" leftIcon={<User className="h-4 w-4" />} className="mb-4" />
                {cmraSignatureUrl ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <div><p className="text-sm font-medium text-emerald-400">Countersigned by {cmraSignedBy || 'CMRA Employee'}</p><p className="text-xs text-surface-400">{new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p></div>
                      <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setCmraSignatureUrl(null); setCmraSigned(false); }}>Re-sign</Button>
                    </div>
                    <div className="rounded-lg border border-surface-700 p-3 bg-white"><img src={cmraSignatureUrl} alt="CMRA Signature" className="max-h-24 mx-auto" /></div>
                  </div>
                ) : (
                  <SignaturePad label="CMRA employee sign here" onSign={(dataUrl) => { setCmraSignatureUrl(dataUrl); setCmraSigned(true); }} onClear={() => setCmraSigned(false)} />
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ================================================================ */}
        {/* Step 6: Review & Create                                           */}
        {/* ================================================================ */}
        {step === 6 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Details */}
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
                      <p className="text-surface-500">Plan</p><p className="text-surface-200">{selectedPlan?.name || 'None'}{selectedPlan ? ` · $${planPrice.toFixed(2)}/${billingCycle === 'annual' ? 'yr' : 'mo'}` : ''}</p>
                      <p className="text-surface-500">Billing</p><p className="text-surface-200">{customerForm.billingTerms}</p>
                      <p className="text-surface-500">Notifications</p><p className="text-surface-200">{[customerForm.notifyEmail && 'Email', customerForm.notifySms && 'SMS'].filter(Boolean).join(', ') || 'None'}</p>
                      {recipients.length > 0 && (<><p className="text-surface-500">Recipients</p><p className="text-surface-200">{recipients.length} additional</p></>)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Status */}
              <Card padding="md">
                <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary-500" />Compliance Status</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: 'Primary ID', value: USPS_PRIMARY_IDS.find((id) => id.id === primaryIdType)?.name || 'Not selected', ok: !!primaryIdFile && !!primaryIdType && !nonCompliantWarning, step: 2 },
                      { label: 'Secondary ID (Proof of Address)', value: PROOF_OF_ADDRESS_TYPES.find((t) => t.value === secondaryIdType)?.label || 'Not selected', ok: !!secondaryIdFile && !!secondaryIdType, step: 2 },
                      ...(isBusinessPmb ? [{ label: 'Business Document', value: BUSINESS_DOC_TYPES.find((d) => d.value === businessDocType)?.label || 'Not selected', ok: !!businessDocFile && !!businessDocType, step: 2 }] : []),
                      { label: 'PS Form 1583', value: form1583.applicantName ? 'Completed' : 'Incomplete', ok: !!form1583.applicantName, step: 3 },
                      { label: 'USPS CRD Upload', value: form1583.crdUploaded ? 'Uploaded' : 'Pending', ok: form1583.crdUploaded, warn: !form1583.crdUploaded, step: 3 },
                      { label: 'Form 1583 Notarized', value: form1583.notarized ? 'Yes' : 'Pending', ok: form1583.notarized, warn: !form1583.notarized, step: 3 },
                      { label: 'Customer Signature', value: agreementSigned ? 'Signed' : 'Not signed', ok: agreementSigned, step: 5 },
                      { label: 'CMRA Countersignature', value: cmraSigned ? `Signed by ${cmraSignedBy}` : 'Not signed', ok: cmraSigned, warn: !cmraSigned, step: 5 },
                      { label: 'Payment', value: paymentStatus === 'completed' ? `$${parseFloat(paymentAmount).toFixed(2)} collected` : paymentSkipped ? 'Skipped' : 'Pending', ok: paymentStatus === 'completed', warn: paymentSkipped || paymentStatus === 'idle', step: 4 },
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

            {/* Warnings */}
            {!form1583.crdUploaded && (
              <div className="glass-card p-4 flex items-start gap-3 border-l-4 border-yellow-500">
                <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div><p className="text-sm font-medium text-yellow-400">CRD Upload Reminder</p><p className="text-xs text-surface-400 mt-1">Both ID documents must be uploaded to the USPS Customer Registration Database within a few days to a week. You can create the customer now and update the CRD status later.</p></div>
              </div>
            )}
            {!cmraSigned && (
              <div className="glass-card p-4 flex items-start gap-3 border-l-4 border-amber-500">
                <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div><p className="text-sm font-medium text-amber-400">CMRA Countersignature Missing</p><p className="text-xs text-surface-400 mt-1">The CMRA owner/employee countersignature (PS1583 §14a) is required for full compliance. You can proceed now and collect it later.</p></div>
              </div>
            )}
            {submitError && (
              <div className="glass-card p-4 flex items-start gap-3 border-l-4 border-red-500">
                <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div><p className="text-sm font-medium text-red-400">Error</p><p className="text-xs text-surface-400 mt-1">{submitError}</p></div>
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
            <Button variant="default" onClick={handleCreate} disabled={submitting} leftIcon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}>
              {submitting ? 'Creating...' : 'Create Customer'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
