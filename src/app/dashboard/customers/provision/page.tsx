'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SignaturePad } from '@/components/ui/signature-pad';
import {
  UserPlus,
  ArrowLeft,
  ArrowRight,
  CreditCard,
  User,
  ShieldCheck,
  FileText,
  PenTool,
  Mailbox,
  CheckCircle2,
  Upload,
  AlertCircle,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface Plan {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  features: string[];
}

interface FormData {
  planId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  homeAddress: string;
  homeCity: string;
  homeState: string;
  homeZip: string;
  idType: string;
  idExpiration: string;
  form1583Acknowledged: boolean;
  signatureDataUrl: string;
  pmbNumber: string;
  platform: string;
}

const STEPS = [
  { label: 'Plan', icon: CreditCard },
  { label: 'Info', icon: User },
  { label: 'ID', icon: ShieldCheck },
  { label: 'Form 1583', icon: FileText },
  { label: 'Agreement', icon: PenTool },
  { label: 'PMB', icon: Mailbox },
  { label: 'Confirm', icon: CheckCircle2 },
];

const INITIAL_FORM: FormData = {
  planId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  homeAddress: '',
  homeCity: '',
  homeState: '',
  homeZip: '',
  idType: '',
  idExpiration: '',
  form1583Acknowledged: false,
  signatureDataUrl: '',
  pmbNumber: '',
  platform: 'physical',
};

/* ── Main Component ─────────────────────────────────────────────────────── */

export default function ProvisionPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ customerId: string; pmbNumber: string; invoiceId: string } | null>(null);

  useEffect(() => {
    fetch('/api/billing/plans')
      .then((r) => r.json())
      .then((d) => setPlans(d.plans || []))
      .catch(() => {});
  }, []);

  const updateForm = (updates: Partial<FormData>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    setError(null);
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return true; // Plan is optional
      case 1: return !!form.firstName && !!form.lastName;
      case 2: return true; // ID is optional for wizard
      case 3: return true; // Form 1583 is optional
      case 4: return true; // Signature optional
      case 5: return !!form.pmbNumber;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/customers/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Provisioning failed');
        return;
      }

      setResult(data);
      setStep(6); // Confirmation step
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 5) {
      handleSubmit();
    } else if (step < 6) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provision New Account"
        description="Onboard a new customer."
        icon={<UserPlus className="h-6 w-6" />}
      />

      {/* Step Indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} className="flex items-center gap-1">
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : isDone
                    ? 'bg-surface-700 text-primary-400 cursor-pointer hover:bg-surface-600'
                    : 'bg-surface-800 text-surface-500 cursor-not-allowed'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-4 h-px ${isDone ? 'bg-primary-500' : 'bg-surface-700'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent>
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-surface-100">Select a Plan</h3>
              <p className="text-sm text-surface-400">Choose a billing plan for this customer (optional).</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => updateForm({ planId: plan.id })}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      form.planId === plan.id
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-surface-700 hover:border-surface-600'
                    }`}
                  >
                    <div className="font-medium text-surface-200">{plan.name}</div>
                    <div className="text-xl font-bold text-primary-400 mt-1">
                      ${plan.priceMonthly}/mo
                    </div>
                    {plan.features && (
                      <ul className="mt-2 space-y-1">
                        {(typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features)
                          .slice(0, 3)
                          .map((f: string, i: number) => (
                            <li key={i} className="text-xs text-surface-400">• {f}</li>
                          ))}
                      </ul>
                    )}
                  </button>
                ))}
                {plans.length === 0 && (
                  <div className="col-span-3 text-center py-8 text-surface-500">
                    No billing plans configured. You can skip this step.
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-surface-100">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="First Name *" value={form.firstName} onChange={(e) => updateForm({ firstName: e.target.value })} />
                <Input label="Last Name *" value={form.lastName} onChange={(e) => updateForm({ lastName: e.target.value })} />
                <Input label="Email" type="email" value={form.email} onChange={(e) => updateForm({ email: e.target.value })} />
                <Input label="Phone" type="tel" value={form.phone} onChange={(e) => updateForm({ phone: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <Input label="Home Address" value={form.homeAddress} onChange={(e) => updateForm({ homeAddress: e.target.value })} />
                <Input label="City" value={form.homeCity} onChange={(e) => updateForm({ homeCity: e.target.value })} />
                <Input label="State" value={form.homeState} onChange={(e) => updateForm({ homeState: e.target.value })} />
                <Input label="ZIP Code" value={form.homeZip} onChange={(e) => updateForm({ homeZip: e.target.value })} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-surface-100">ID Verification</h3>
              <p className="text-sm text-surface-400">Upload and verify customer identification.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="ID Type"
                  value={form.idType}
                  onChange={(e) => updateForm({ idType: e.target.value })}
                  placeholder="Select ID type"
                  options={[
                    { value: 'drivers_license', label: "Driver's License" },
                    { value: 'passport', label: 'Passport' },
                    { value: 'state_id', label: 'State ID' },
                    { value: 'military_id', label: 'Military ID' },
                  ]}
                />
                <Input
                  label="ID Expiration Date"
                  type="date"
                  value={form.idExpiration}
                  onChange={(e) => updateForm({ idExpiration: e.target.value })}
                />
              </div>
              <div className="mt-4 p-6 border border-dashed border-surface-600 rounded-lg text-center">
                <Upload className="h-8 w-8 text-surface-500 mx-auto mb-2" />
                <p className="text-sm text-surface-400">
                  Drag & drop ID scan or click to upload
                </p>
                <p className="text-xs text-surface-500 mt-1">
                  Supported formats: JPG, PNG, PDF (max 10MB)
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-surface-100">USPS Form 1583</h3>
              <p className="text-sm text-surface-400">
                Form 1583 authorizes a CMRA to receive mail on behalf of the customer.
              </p>
              <div className="bg-surface-800 rounded-lg p-4 text-sm text-surface-300 space-y-2">
                <p>By acknowledging below, the customer confirms:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>They authorize this location to receive mail on their behalf</li>
                  <li>The information provided is true and accurate</li>
                  <li>They understand Form 1583 must be notarized</li>
                  <li>They will provide two forms of acceptable identification</li>
                </ul>
              </div>
              <label className="flex items-center gap-3 cursor-pointer mt-4">
                <input
                  type="checkbox"
                  checked={form.form1583Acknowledged}
                  onChange={(e) => updateForm({ form1583Acknowledged: e.target.checked })}
                  className="h-5 w-5 rounded border-surface-600 bg-surface-900 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-surface-200">
                  Customer acknowledges Form 1583 requirements
                </span>
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-surface-100">Service Agreement</h3>
              <p className="text-sm text-surface-400">
                Customer signature for the mailbox service agreement.
              </p>
              <div className="bg-surface-800 rounded-lg p-4 text-sm text-surface-300 max-h-48 overflow-y-auto">
                <p className="font-medium mb-2">CONTRACT FOR MAILBOX SERVICE</p>
                <p>
                  This Agreement is made between the Customer and the Mail Service Provider.
                  By signing below, the Customer agrees to the terms and conditions of mailbox
                  rental service, including applicable fees, storage policies, and USPS CMRA
                  compliance requirements.
                </p>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-surface-300 mb-2">Signature</p>
                <SignaturePad
                  onSign={(dataUrl: string) => updateForm({ signatureDataUrl: dataUrl })}
                  width={500}
                  height={150}
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-surface-100">PMB Assignment</h3>
              <p className="text-sm text-surface-400">
                Assign a Private Mailbox number to this customer.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="PMB Number *"
                  value={form.pmbNumber}
                  onChange={(e) => updateForm({ pmbNumber: e.target.value })}
                  placeholder="e.g. PMB-0101"
                />
                <Select
                  label="Platform"
                  value={form.platform}
                  onChange={(e) => updateForm({ platform: e.target.value })}
                  options={[
                    { value: 'physical', label: 'Physical (Walk-in)' },
                    { value: 'iPostal', label: 'iPostal1' },
                    { value: 'anytime', label: 'Anytime Mailbox' },
                    { value: 'postscan', label: 'PostScan Mail' },
                  ]}
                />
              </div>
            </div>
          )}

          {step === 6 && result && (
            <div className="text-center space-y-4 py-8">
              <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto" />
              <h3 className="text-xl font-semibold text-surface-100">
                Account Provisioned Successfully!
              </h3>
              <div className="space-y-2 text-sm text-surface-400">
                <p>Customer: <span className="text-surface-200 font-medium">{form.firstName} {form.lastName}</span></p>
                <p>PMB: <span className="text-surface-200 font-mono">{result.pmbNumber}</span></p>
                <p>Invoice: <span className="text-surface-200 font-mono">{result.invoiceId.slice(0, 8)}…</span></p>
              </div>
              <div className="flex justify-center gap-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/dashboard/customers/${result.customerId}`)}
                >
                  View Customer
                </Button>
                <Button onClick={() => { setForm(INITIAL_FORM); setStep(0); setResult(null); }}>
                  Provision Another
                </Button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      {step < 6 && (
        <div className="flex justify-between">
          <Button variant="ghost" onClick={prevStep} disabled={step === 0} leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
          <Button
            onClick={nextStep}
            disabled={!canAdvance() || submitting}
            loading={submitting}
            rightIcon={step === 5 ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          >
            {step === 5 ? 'Provision Account' : 'Next'}
          </Button>
        </div>
      )}
    </div>
  );
}
