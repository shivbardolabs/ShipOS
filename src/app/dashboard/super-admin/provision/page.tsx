'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  UserPlus,
  ArrowLeft,
  ArrowRight,
  CreditCard,
  User,
  FileText,
  CheckCircle2,
  Upload,
  AlertCircle,
  Check,
  X,
  File,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface Plan {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  features: string[];
}

interface UploadedFile {
  name: string;
  size: number;
  storeName: string;
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
}

const STEPS = [
  { label: 'Plan', icon: CreditCard },
  { label: 'Contact', icon: User },
  { label: 'Form 1583-A', icon: FileText },
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
};

/* ── Helpers ────────────────────────────────────────────────────────────── */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Main Component ─────────────────────────────────────────────────────── */

export default function ProvisionPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    customerId: string;
    invoiceId: string;
  } | null>(null);

  // Form 1583-A uploads (one per store)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [storeNameInput, setStoreNameInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      case 0:
        return !!form.planId; // Must select a plan
      case 1:
        return !!form.firstName && !!form.lastName && !!form.email;
      case 2:
        return true; // Form 1583-A uploads are optional
      default:
        return true;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = storeNameInput.trim() || `Store ${uploadedFiles.length + 1}`;
    setUploadedFiles((prev) => [
      ...prev,
      { name: file.name, size: file.size, storeName: name },
    ]);
    setStoreNameInput('');

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/customers/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          form1583Uploads: uploadedFiles.map((f) => ({
            fileName: f.name,
            storeName: f.storeName,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Provisioning failed');
        return;
      }

      setResult(data);
      setStep(3); // Confirmation step
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 2) {
      handleSubmit();
    } else if (step < 3) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const selectedPlan = plans.find((p) => p.id === form.planId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provision New Account"
        description="Onboard a new mailbox customer account."
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
                <div
                  className={`w-4 h-px ${isDone ? 'bg-primary-500' : 'bg-surface-700'}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent>
          {/* ─── Step 0: Plan Selection ─── */}
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-surface-100">
                Select a Plan
              </h3>
              <p className="text-sm text-surface-400">
                Choose a billing plan for this customer.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {plans.map((plan) => {
                  const isSelected = form.planId === plan.id;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => updateForm({ planId: plan.id })}
                      className={`relative p-4 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-500/10 ring-2 ring-primary-500/30'
                          : 'border-surface-700 hover:border-surface-500'
                      }`}
                    >
                      {/* Selection indicator */}
                      <div
                        className={`absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                          isSelected
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-surface-600 bg-transparent'
                        }`}
                      >
                        {isSelected && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="font-medium text-surface-200">
                        {plan.name}
                      </div>
                      <div className="text-xl font-bold text-primary-400 mt-1">
                        ${plan.priceMonthly}/mo
                      </div>
                      {plan.features && (
                        <ul className="mt-2 space-y-1">
                          {(typeof plan.features === 'string'
                            ? JSON.parse(plan.features)
                            : plan.features
                          )
                            .slice(0, 3)
                            .map((f: string, i: number) => (
                              <li
                                key={i}
                                className="text-xs text-surface-400"
                              >
                                • {f}
                              </li>
                            ))}
                        </ul>
                      )}
                    </button>
                  );
                })}
                {plans.length === 0 && (
                  <div className="col-span-3 text-center py-8 text-surface-500">
                    No billing plans configured yet. Please add plans in the
                    billing settings first.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Step 1: Client Contact Information ─── */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-surface-100">
                Client Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name *"
                  value={form.firstName}
                  onChange={(e) => updateForm({ firstName: e.target.value })}
                />
                <Input
                  label="Last Name *"
                  value={form.lastName}
                  onChange={(e) => updateForm({ lastName: e.target.value })}
                />
                <Input
                  label="Email *"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm({ email: e.target.value })}
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateForm({ phone: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <Input
                  label="Home Address"
                  value={form.homeAddress}
                  onChange={(e) => updateForm({ homeAddress: e.target.value })}
                />
                <Input
                  label="City"
                  value={form.homeCity}
                  onChange={(e) => updateForm({ homeCity: e.target.value })}
                />
                <Input
                  label="State"
                  value={form.homeState}
                  onChange={(e) => updateForm({ homeState: e.target.value })}
                />
                <Input
                  label="ZIP Code"
                  value={form.homeZip}
                  onChange={(e) => updateForm({ homeZip: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* ─── Step 2: Form 1583-A Upload ─── */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-surface-100">
                USPS Form 1583-A Upload
              </h3>
              <p className="text-sm text-surface-400">
                Upload a completed Form 1583-A for each store location to prove
                CMRA compliance. This form authorizes the CMRA to receive mail on
                behalf of customers at each location.
              </p>

              {/* Uploaded files list */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-lg bg-surface-800 px-4 py-3"
                    >
                      <File className="h-5 w-5 text-primary-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-200 truncate">
                          {file.storeName}
                        </p>
                        <p className="text-xs text-surface-500 truncate">
                          {file.name} · {formatFileSize(file.size)}
                        </p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <button
                        onClick={() => removeFile(index)}
                        className="text-surface-500 hover:text-red-400 transition-colors flex-shrink-0"
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload area */}
              <div className="rounded-lg border border-dashed border-surface-600 p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <Input
                    label="Store / Location Name"
                    value={storeNameInput}
                    onChange={(e) => setStoreNameInput(e.target.value)}
                    placeholder="e.g. Downtown Location"
                    helperText="Label this upload with the store name"
                  />
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="form1583Upload"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      leftIcon={<Upload className="h-4 w-4" />}
                      className="w-full"
                    >
                      Upload Form 1583-A
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-surface-500 text-center">
                  Supported: PDF, JPG, PNG · Max 10 MB per file
                </p>
              </div>

              <div className="bg-surface-800 rounded-lg p-4 text-sm text-surface-300 space-y-2">
                <p className="font-medium text-surface-200">
                  About Form 1583-A
                </p>
                <p>
                  USPS Form 1583-A is required for each CMRA location. It proves
                  that the store has been approved by the USPS to operate as a
                  Commercial Mail Receiving Agency at that address. Upload a
                  completed and approved copy for each store location.
                </p>
              </div>
            </div>
          )}

          {/* ─── Step 3: Confirmation ─── */}
          {step === 3 && result && (
            <div className="text-center space-y-4 py-8">
              <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto" />
              <h3 className="text-xl font-semibold text-surface-100">
                Account Provisioned Successfully!
              </h3>
              <div className="space-y-2 text-sm text-surface-400">
                <p>
                  Customer:{' '}
                  <span className="text-surface-200 font-medium">
                    {form.firstName} {form.lastName}
                  </span>
                </p>
                {selectedPlan && (
                  <p>
                    Plan:{' '}
                    <span className="text-surface-200 font-medium">
                      {selectedPlan.name} — ${selectedPlan.priceMonthly}/mo
                    </span>
                  </p>
                )}
                <p>
                  Invoice:{' '}
                  <span className="text-surface-200 font-mono">
                    {result.invoiceId.slice(0, 8)}…
                  </span>
                </p>
                {uploadedFiles.length > 0 && (
                  <p>
                    Form 1583-A:{' '}
                    <span className="text-surface-200 font-medium">
                      {uploadedFiles.length} file
                      {uploadedFiles.length !== 1 ? 's' : ''} uploaded
                    </span>
                  </p>
                )}
              </div>
              <div className="flex justify-center gap-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() =>
                    router.push(
                      `/dashboard/customers/${result.customerId}`
                    )
                  }
                >
                  View Customer
                </Button>
                <Button
                  onClick={() => {
                    setForm(INITIAL_FORM);
                    setStep(0);
                    setResult(null);
                    setUploadedFiles([]);
                    setStoreNameInput('');
                  }}
                >
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
      {step < 3 && (
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={step === 0}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <Button
            onClick={nextStep}
            disabled={!canAdvance() || submitting}
            loading={submitting}
            rightIcon={
              step === 2 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )
            }
          >
            {step === 2 ? 'Provision Account' : 'Next'}
          </Button>
        </div>
      )}
    </div>
  );
}
