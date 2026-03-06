"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  User,
  Briefcase,
  CreditCard,
  Check,
  Eye,
  EyeOff,
  Package,
  Star,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

/* ── Plan data ─────────────────────────────────────────── */

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 99,
    trial: 7,
    tier: "Lite",
    icon: Package,
    popular: false,
    features: [
      "Package receiving & tracking",
      "4×6 label printing",
      "Auto carrier detection",
      "Customer notifications (email)",
      "Mailbox management",
      "Basic reporting",
      "Up to 500 packages/month",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 199,
    trial: 30,
    tier: "Pro",
    icon: Star,
    popular: true,
    features: [
      "Everything in Starter, plus:",
      "Carrier bill reconciliation",
      "Loyalty rewards program",
      "SMS & email notifications",
      "Advanced analytics dashboard",
      "Priority support",
      "Unlimited packages",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    trial: 30,
    tier: "Pro + Premium",
    icon: Building2,
    popular: false,
    features: [
      "Everything in Pro, plus:",
      "Multi-location dashboard",
      "API access & webhooks",
      "White-label options",
      "Dedicated account manager",
      "Custom onboarding",
      "Unlimited everything",
    ],
  },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const TITLE_OPTIONS = ["Owner", "Partner", "Manager", "Other"];
const AFFILIATION_OPTIONS = [
  { value: "independent", label: "Independent" },
  { value: "franchise", label: "Franchise" },
  { value: "association", label: "Association" },
  { value: "other", label: "Other" },
];
const FRANCHISE_OPTIONS = ["RSA", "PBC", "Annex", "UPS Store", "Other"];

/* ── Types ─────────────────────────────────────────────── */

interface FormData {
  businessName: string;
  dba: string;
  address: string;
  suite: string;
  city: string;
  state: string;
  zip: string;
  storePhone: string;
  storeEmail: string;
  website: string;
  firstName: string;
  lastName: string;
  ownerEmail: string;
  ownerPhone: string;
  title: string;
  password: string;
  confirmPassword: string;
  affiliationType: string;
  franchiseType: string;
  storeCount: number;
  planId: string;
  promoCode: string;
}

type Errors = Partial<Record<keyof FormData | "_form", string>>;

/* ── Validation helpers ────────────────────────────────── */

function validateField(name: keyof FormData, value: string | number, form: FormData): string | null {
  const s = String(value).trim();
  switch (name) {
    case "businessName": return !s ? "Business name is required" : null;
    case "address": return !s ? "Street address is required" : null;
    case "city": return !s ? "City is required" : null;
    case "state": return !s ? "State is required" : null;
    case "zip":
      if (!s) return "ZIP code is required";
      return /^\d{5}(-\d{4})?$/.test(s) ? null : "Invalid ZIP code";
    case "storePhone": return !s ? "Store phone is required" : null;
    case "storeEmail":
      if (!s) return "Store email is required";
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? null : "Invalid email";
    case "firstName": return !s ? "First name is required" : null;
    case "lastName": return !s ? "Last name is required" : null;
    case "ownerEmail":
      if (!s) return "Email is required";
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? null : "Invalid email";
    case "ownerPhone": return !s ? "Mobile phone is required" : null;
    case "title": return !s ? "Title is required" : null;
    case "password":
      if (!s) return "Password is required";
      if (s.length < 8) return "At least 8 characters";
      if (!/[A-Z]/.test(s)) return "Include an uppercase letter";
      if (!/\d/.test(s)) return "Include a number";
      return null;
    case "confirmPassword":
      if (!s) return "Please confirm your password";
      return s !== form.password ? "Passwords do not match" : null;
    case "affiliationType": return !s ? "Business type is required" : null;
    case "franchiseType":
      return form.affiliationType === "franchise" && !s ? "Franchise type is required" : null;
    case "planId": return !s ? "Please select a plan" : null;
    default: return null;
  }
}

/* ── Component ─────────────────────────────────────────── */

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    businessName: "",
    dba: "",
    address: "",
    suite: "",
    city: "",
    state: "",
    zip: "",
    storePhone: "",
    storeEmail: "",
    website: "",
    firstName: "",
    lastName: "",
    ownerEmail: "",
    ownerPhone: "",
    title: "",
    password: "",
    confirmPassword: "",
    affiliationType: "independent",
    franchiseType: "",
    storeCount: 1,
    planId: "pro",
    promoCode: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /* ── handlers ───────────────────────────────── */

  const set = useCallback(
    (name: keyof FormData, value: string | number) => {
      setForm((prev) => ({ ...prev, [name]: value }));
      // Clear error on change if field was touched
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        delete next._form;
        return next;
      });
    },
    [],
  );

  const blur = useCallback(
    (name: keyof FormData) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      const err = validateField(name, form[name], form);
      setErrors((prev) => {
        const next = { ...prev };
        if (err) next[name] = err;
        else delete next[name];
        return next;
      });
    },
    [form],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate all
    const allErrors: Errors = {};
    const requiredFields: (keyof FormData)[] = [
      "businessName","address","city","state","zip","storePhone","storeEmail",
      "firstName","lastName","ownerEmail","ownerPhone","title","password","confirmPassword",
      "affiliationType","planId",
    ];
    if (form.affiliationType === "franchise") requiredFields.push("franchiseType");

    for (const field of requiredFields) {
      const err = validateField(field, form[field], form);
      if (err) allErrors[field] = err;
    }

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      // Mark all as touched
      const allTouched: Partial<Record<keyof FormData, boolean>> = {};
      requiredFields.forEach((f) => (allTouched[f] = true));
      setTouched(allTouched);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          dba: form.dba.trim() || undefined,
          address: form.address.trim(),
          suite: form.suite.trim() || undefined,
          city: form.city.trim(),
          state: form.state,
          zip: form.zip.trim(),
          storePhone: form.storePhone.trim(),
          storeEmail: form.storeEmail.trim(),
          website: form.website.trim() || undefined,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          ownerEmail: form.ownerEmail.trim(),
          ownerPhone: form.ownerPhone.trim(),
          title: form.title,
          password: form.password,
          affiliationType: form.affiliationType,
          franchiseType: form.franchiseType || undefined,
          storeCount: form.storeCount,
          planId: form.planId,
          promoCode: form.promoCode.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setErrors({ _form: "Something went wrong. Please try again." });
        return;
      }

      router.push("/signup/success");
    } catch {
      setErrors({ _form: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── input helper ────────────────────────────── */

  const fieldProps = (name: keyof FormData) => ({
    value: form[name] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      set(name, e.target.value),
    onBlur: () => blur(name),
  });

  const fieldError = (name: keyof FormData) =>
    touched[name] || errors[name] ? errors[name] : undefined;

  return (
    <div className="min-h-screen bg-surface-950 relative overflow-hidden">
      {/* Ambient background orbs */}
      <div
        className="absolute top-20 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "color-mix(in srgb, var(--color-primary-500) 4%, transparent)", filter: "blur(100px)" }}
      />
      <div
        className="absolute bottom-40 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "color-mix(in srgb, var(--color-primary-500) 3%, transparent)", filter: "blur(80px)" }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/shipos-logo-mark.svg"
              alt="ShipOS"
              width={48}
              height={48}
              className="rounded-xl"
            />
          </div>
          <div className="flex items-baseline justify-center gap-1 mb-2">
            <span className="text-2xl font-bold text-surface-100">Ship</span>
            <span className="text-2xl font-bold text-primary-500">OS</span>
          </div>
          <p className="text-surface-500 text-sm">
            Create your account and start your free trial
          </p>
        </div>

        {/* Global error */}
        {errors._form && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-status-error-500/30 bg-status-error-500/10 px-4 py-3 text-sm text-status-error-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errors._form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ── Section 1: Plan Selection ─────────────── */}
          <section>
            <SectionHeader icon={CreditCard} title="Choose Your Plan" step={1} />
            <div className="grid gap-4 sm:grid-cols-3 mt-4">
              {plans.map((plan) => {
                const selected = form.planId === plan.id;
                const Icon = plan.icon;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => set("planId", plan.id)}
                    className={`relative rounded-xl border-2 p-5 text-left transition-all duration-200
                      ${selected
                        ? "border-primary-500 bg-primary-500/5 shadow-lg shadow-primary-500/10"
                        : "border-surface-700 hover:border-surface-600 bg-surface-950"
                      }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                        Most Popular
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`rounded-lg p-1.5 ${selected ? "bg-primary-500/10 text-primary-500" : "bg-surface-800 text-surface-400"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="font-semibold text-surface-100">{plan.name}</h3>
                    </div>
                    <div className="mb-3">
                      {plan.price !== null ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-surface-100">
                            ${plan.price}
                          </span>
                          <span className="text-sm text-surface-500">/mo</span>
                        </div>
                      ) : (
                        <span className="text-lg font-semibold text-surface-100">Custom Pricing</span>
                      )}
                      <p className="text-xs text-surface-500 mt-1">
                        {plan.trial}-day free trial
                      </p>
                    </div>
                    <ul className="space-y-1.5">
                      {plan.features.slice(0, 4).map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-surface-400">
                          <Check className="h-3 w-3 mt-0.5 shrink-0 text-status-success-500" />
                          {f}
                        </li>
                      ))}
                      {plan.features.length > 4 && (
                        <li className="text-xs text-surface-500">
                          +{plan.features.length - 4} more features
                        </li>
                      )}
                    </ul>
                    {selected && (
                      <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {fieldError("planId") && (
              <p className="mt-2 text-xs text-status-error-500">{fieldError("planId")}</p>
            )}
            {/* Promo code */}
            <div className="mt-4 max-w-xs">
              <FormInput
                label="Promo Code (optional)"
                placeholder="SAVE20"
                {...fieldProps("promoCode")}
              />
            </div>
          </section>

          {/* ── Section 2: Business Info ──────────────── */}
          <section>
            <SectionHeader icon={Building2} title="Business Information" step={2} />
            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <FormInput
                label="Business Name *"
                placeholder="My Postal Store"
                error={fieldError("businessName")}
                {...fieldProps("businessName")}
              />
              <FormInput
                label="DBA (optional)"
                placeholder="Doing business as…"
                {...fieldProps("dba")}
              />
              <FormInput
                label="Street Address *"
                placeholder="123 Main St"
                error={fieldError("address")}
                {...fieldProps("address")}
              />
              <FormInput
                label="Suite / Unit (optional)"
                placeholder="Suite 200"
                {...fieldProps("suite")}
              />
              <FormInput
                label="City *"
                placeholder="Springfield"
                error={fieldError("city")}
                {...fieldProps("city")}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormSelect
                  label="State *"
                  placeholder="Select"
                  options={US_STATES.map((s) => ({ value: s, label: s }))}
                  error={fieldError("state")}
                  {...fieldProps("state")}
                />
                <FormInput
                  label="ZIP Code *"
                  placeholder="01234"
                  error={fieldError("zip")}
                  {...fieldProps("zip")}
                />
              </div>
              <FormInput
                label="Store Phone *"
                type="tel"
                placeholder="(555) 123-4567"
                error={fieldError("storePhone")}
                {...fieldProps("storePhone")}
              />
              <FormInput
                label="Store Email *"
                type="email"
                placeholder="store@example.com"
                error={fieldError("storeEmail")}
                {...fieldProps("storeEmail")}
              />
              <FormInput
                label="Store Website (optional)"
                placeholder="https://mypostalstore.com"
                {...fieldProps("website")}
              />
            </div>
          </section>

          {/* ── Section 3: Owner Info ─────────────────── */}
          <section>
            <SectionHeader icon={User} title="Owner Information" step={3} />
            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <FormInput
                label="First Name *"
                placeholder="Jane"
                error={fieldError("firstName")}
                {...fieldProps("firstName")}
              />
              <FormInput
                label="Last Name *"
                placeholder="Doe"
                error={fieldError("lastName")}
                {...fieldProps("lastName")}
              />
              <FormInput
                label="Email *"
                type="email"
                placeholder="jane@example.com"
                error={fieldError("ownerEmail")}
                {...fieldProps("ownerEmail")}
              />
              <FormInput
                label="Mobile Phone *"
                type="tel"
                placeholder="(555) 987-6543"
                error={fieldError("ownerPhone")}
                {...fieldProps("ownerPhone")}
              />
              <FormSelect
                label="Title *"
                placeholder="Select your role"
                options={TITLE_OPTIONS.map((t) => ({ value: t, label: t }))}
                error={fieldError("title")}
                {...fieldProps("title")}
              />
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    className={`w-full rounded-lg border bg-surface-900 px-3.5 py-2.5 text-sm text-surface-100 placeholder:text-surface-500 min-h-[44px]
                      ${fieldError("password") ? "border-status-error-500 focus:border-status-error-500 focus:ring-status-error-500/30" : "border-surface-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"}
                      transition-colors duration-100 outline-none pr-10`}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    onBlur={() => blur("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-surface-500 hover:text-surface-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldError("password") && (
                  <p className="mt-1.5 text-xs text-status-error-500">{fieldError("password")}</p>
                )}
              </div>
              <FormInput
                label="Confirm Password *"
                type="password"
                placeholder="Re-enter your password"
                error={fieldError("confirmPassword")}
                value={form.confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  set("confirmPassword", e.target.value)
                }
                onBlur={() => blur("confirmPassword")}
              />
            </div>
          </section>

          {/* ── Section 4: Business Classification ────── */}
          <section>
            <SectionHeader icon={Briefcase} title="Business Classification" step={4} />
            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <FormSelect
                label="Business Type *"
                options={AFFILIATION_OPTIONS}
                error={fieldError("affiliationType")}
                value={form.affiliationType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  set("affiliationType", e.target.value);
                  if (e.target.value !== "franchise") set("franchiseType", "");
                }}
                onBlur={() => blur("affiliationType")}
              />
              {form.affiliationType === "franchise" && (
                <FormSelect
                  label="Franchise Type *"
                  placeholder="Select franchise"
                  options={FRANCHISE_OPTIONS.map((f) => ({ value: f, label: f }))}
                  error={fieldError("franchiseType")}
                  {...fieldProps("franchiseType")}
                />
              )}
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                  Number of Stores
                </label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3.5 py-2.5 text-sm text-surface-100 min-h-[44px]
                    focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-colors duration-100 outline-none"
                  value={form.storeCount}
                  onChange={(e) => set("storeCount", parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
          </section>

          {/* ── Submit ────────────────────────────────── */}
          <div className="flex flex-col items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-8 py-3 text-sm font-semibold text-white
                hover:bg-primary-500 active:bg-primary-700 transition-all duration-150
                disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] w-full sm:w-auto shadow-sm shadow-primary-900/30"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <p className="text-xs text-surface-500 text-center max-w-md">
              By creating an account you agree to our{" "}
              <a href="/terms" className="text-primary-500 hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-primary-500 hover:underline">
                Privacy Policy
              </a>
              . No credit card required during trial.
            </p>
            <p className="text-xs text-surface-500">
              Already have an account?{" "}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/login" className="text-primary-500 hover:underline font-medium">
                Sign in
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────── */

function SectionHeader({
  icon: Icon,
  title,
  step,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  step: number;
}) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">
          Step {step}
        </span>
        <h2 className="text-base font-semibold text-surface-100">{title}</h2>
      </div>
    </div>
  );
}

function FormInput({
  label,
  error,
  ...props
}: {
  label: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-surface-300 mb-1.5">{label}</label>
      <input
        className={`w-full rounded-lg border bg-surface-900 px-3.5 py-2.5 text-sm text-surface-100 placeholder:text-surface-500 min-h-[44px]
          ${error ? "border-status-error-500 focus:border-status-error-500 focus:ring-status-error-500/30" : "border-surface-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"}
          transition-colors duration-100 outline-none`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-status-error-500">{error}</p>}
    </div>
  );
}

function FormSelect({
  label,
  error,
  options,
  placeholder,
  ...props
}: {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-surface-300 mb-1.5">{label}</label>
      <div className="relative">
        <select
          className={`w-full appearance-none rounded-lg border bg-surface-900 px-3.5 py-2.5 pr-10 text-sm text-surface-100 min-h-[44px]
            ${error ? "border-status-error-500 focus:border-status-error-500 focus:ring-status-error-500/30" : "border-surface-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"}
            transition-colors duration-100 outline-none cursor-pointer`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-surface-500">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      {error && <p className="mt-1.5 text-xs text-status-error-500">{error}</p>}
    </div>
  );
}
