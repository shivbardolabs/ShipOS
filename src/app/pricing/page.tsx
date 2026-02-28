"use client";

import { useState } from "react";
import {
  Package,
  ArrowRight,
  LogIn,
  Check,
  Star,
  Building2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* Auth0 routes require full-page redirects — <a> is intentional */
/* eslint-disable @next/next/no-html-link-for-pages */

/* ── Tier data ───────────────────────────────────────── */
const tiers = [
  {
    name: "Starter",
    monthly: 99,
    annual: 79,
    description:
      "Everything you need to manage packages and mailboxes in one place.",
    cta: "Get Started for Free",
    ctaHref: "/api/auth/signup",
    featured: false,
    icon: Package,
    features: [
      "Package receiving & tracking",
      "4×6 label printing",
      "Auto carrier detection",
      "Customer notifications (email)",
      "Mailbox management",
      "Basic reporting & analytics",
      "Up to 500 packages/month",
    ],
  },
  {
    name: "Pro",
    monthly: 179,
    annual: 143,
    description:
      "Advanced tools to optimize your store and maximize revenue.",
    cta: "Get Started for Free",
    ctaHref: "/api/auth/signup",
    featured: true,
    badge: "Most Popular",
    icon: Star,
    features: [
      "Everything in Starter, plus:",
      "Carrier bill reconciliation",
      "Loyalty rewards program",
      "Add-on rate management",
      "SMS & email notifications",
      "Advanced analytics dashboard",
      "Priority email & chat support",
      "Unlimited packages",
    ],
  },
  {
    name: "Enterprise",
    monthly: 299,
    annual: 239,
    description:
      "Full power for multi-location operators and growing businesses.",
    cta: "Contact Sales",
    ctaHref: "mailto:hello@bardolabs.ai?subject=ShipOS Enterprise",
    featured: false,
    icon: Building2,
    features: [
      "Everything in Pro, plus:",
      "Multi-location dashboard",
      "API access & webhooks",
      "Custom integrations",
      "White-label options",
      "Dedicated account manager",
      "Custom onboarding & training",
      "Unlimited everything",
    ],
  },
];

/* ── Comparison table data ───────────────────────────── */
const compareCategories = [
  {
    name: "Core Platform",
    rows: [
      { feature: "Package receiving & check-in", starter: true, pro: true, enterprise: true },
      { feature: "4×6 label printing", starter: true, pro: true, enterprise: true },
      { feature: "Auto carrier detection", starter: true, pro: true, enterprise: true },
      { feature: "Mailbox management", starter: true, pro: true, enterprise: true },
      { feature: "Customer database", starter: true, pro: true, enterprise: true },
      { feature: "Monthly packages", starter: "500", pro: "Unlimited", enterprise: "Unlimited" },
    ],
  },
  {
    name: "Notifications",
    rows: [
      { feature: "Email notifications", starter: true, pro: true, enterprise: true },
      { feature: "SMS notifications", starter: false, pro: true, enterprise: true },
      { feature: "Custom notification templates", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    name: "Revenue Tools",
    rows: [
      { feature: "Carrier bill reconciliation", starter: false, pro: true, enterprise: true },
      { feature: "Loyalty rewards program", starter: false, pro: true, enterprise: true },
      { feature: "Add-on rate management", starter: false, pro: true, enterprise: true },
      { feature: "Wholesale/retail pricing", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    name: "Analytics & Reporting",
    rows: [
      { feature: "Basic reports", starter: true, pro: true, enterprise: true },
      { feature: "Advanced analytics dashboard", starter: false, pro: true, enterprise: true },
      { feature: "Revenue forecasting", starter: false, pro: false, enterprise: true },
      { feature: "Custom report builder", starter: false, pro: false, enterprise: true },
    ],
  },
  {
    name: "Scale & Integrations",
    rows: [
      { feature: "Multi-location support", starter: false, pro: false, enterprise: true },
      { feature: "API access & webhooks", starter: false, pro: false, enterprise: true },
      { feature: "White-label branding", starter: false, pro: false, enterprise: true },
    ],
  },
  {
    name: "Support",
    rows: [
      { feature: "Email support", starter: true, pro: true, enterprise: true },
      { feature: "Priority support", starter: false, pro: true, enterprise: true },
      { feature: "Dedicated account manager", starter: false, pro: false, enterprise: true },
      { feature: "Custom onboarding", starter: false, pro: false, enterprise: true },
    ],
  },
];

/* ── FAQ data ────────────────────────────────────────── */
const faqs = [
  {
    q: "Is there a free trial?",
    a: "Yes! Every plan includes a 30-day free trial with full access. No credit card required to start.",
  },
  {
    q: "Can I switch plans anytime?",
    a: "Absolutely. Upgrade or downgrade at any time. Changes take effect on your next billing cycle, and we'll prorate accordingly.",
  },
  {
    q: "What happens if I exceed 500 packages?",
    a: "On the Starter plan, you can still process packages beyond 500 — we'll just nudge you to upgrade to Pro for the best experience.",
  },
  {
    q: "Do you offer migration from PostalMate?",
    a: "Yes. We built a dedicated migration tool that imports your PostalMate data automatically. Our team will assist with the transition at no extra cost.",
  },
  {
    q: "Is my data secure?",
    a: "ShipOS uses enterprise-grade Auth0 authentication, encrypted data storage, and SOC 2–aligned practices. Your data is safe with us.",
  },
  {
    q: "Do you offer discounts for multiple locations?",
    a: "Yes — the Enterprise plan supports multi-location management. Contact our sales team for custom volume pricing.",
  },
];


/* ── Cell renderer ───────────────────────────────────── */
function CellValue({ value }: { value: boolean | string }) {
  if (value === true)
    return <Check className="w-4 h-4 text-accent-emerald mx-auto" />;
  if (value === false)
    return <span className="text-surface-600">—</span>;
  return <span className="text-surface-400 text-sm">{value}</span>;
}


/* ════════════════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════════════════ */
export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col relative overflow-hidden">
      {/* Ambient orbs */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-30 pointer-events-none"
        style={{ background: "rgba(99,102,241,0.05)", filter: "blur(100px)" }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-20 pointer-events-none"
        style={{ background: "rgba(99,102,241,0.05)", filter: "blur(80px)" }}
      />

      {/* ── Header ── */}
      <header
        className="relative z-10 px-6 py-4"
        style={{ borderBottom: "1px solid var(--color-surface-700)" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/shipos-logo-mark.svg"
              alt="ShipOS"
              width={40}
              height={40}
            />
            <div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl font-bold text-surface-100">Ship</span>
                <span className="text-xl font-bold text-primary-500">OS</span>
              </div>
              <p className="text-xs text-surface-500">by Bardo Labs</p>
            </div>
          </a>
          <div className="flex items-center gap-3">
            <a
              href="/pricing"
              className="px-4 py-2 text-surface-100 rounded-lg text-sm font-medium transition-colors"
            >
              Pricing
            </a>
            <a
              href="/support"
              className="px-4 py-2 text-surface-300 hover:text-surface-100 rounded-lg text-sm font-medium transition-colors"
            >
              Support
            </a>
            <a
              href="/api/auth/login"
              className="px-4 py-2 text-surface-300 hover:text-surface-100 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Log In
            </a>
            <a
              href="/api/auth/signup"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-primary-900/20"
            >
              Sign Up Free
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="relative z-10 flex-1 px-6 py-16">
        <div className="max-w-6xl mx-auto">

          {/* Hero */}
          <div className="text-center mb-12">
            <p className="text-xs font-mono font-semibold tracking-widest uppercase text-primary-500 mb-4">
              Pricing
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-surface-100 mb-4">
              Simple pricing,{" "}
              <em
                className="not-italic"
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontStyle: "italic",
                  color: "var(--color-primary-600)",
                }}
              >
                powerful tools
              </em>
            </h1>
            <p className="text-lg text-surface-400 max-w-xl mx-auto">
              Start shipping smarter today. No contracts, no hidden fees.
              Cancel anytime.
            </p>

            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <span
                className={`text-sm font-medium transition-colors ${
                  !annual ? "text-surface-100" : "text-surface-500"
                }`}
              >
                Monthly
              </span>
              <button
                role="switch"
                aria-checked={annual}
                onClick={() => setAnnual(!annual)}
                className={`relative w-12 h-[26px] rounded-full transition-colors ${
                  annual
                    ? "bg-primary-600"
                    : "bg-surface-800 border border-surface-700"
                }`}
              >
                <span
                  className={`absolute top-[3px] w-5 h-5 rounded-full transition-all ${
                    annual
                      ? "left-[26px] bg-white"
                      : "left-[3px] bg-surface-400"
                  }`}
                />
              </button>
              <span
                className={`text-sm font-medium transition-colors ${
                  annual ? "text-surface-100" : "text-surface-500"
                }`}
              >
                Annual
              </span>
              <span className="text-xs font-mono font-semibold tracking-wide text-accent-emerald bg-accent-emerald/10 px-2.5 py-1 rounded-full">
                Save 20%
              </span>
            </div>
          </div>

          {/* ── Pricing Cards ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-24">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-xl p-8 transition-all ${
                  tier.featured
                    ? "bg-primary-600/[0.03] border-2 border-primary-500/40 shadow-lg shadow-primary-900/10 lg:scale-[1.03] z-10 dark:bg-primary-600/[0.06]"
                    : "glass-card"
                }`}
              >
                {/* Badge */}
                {tier.badge && (
                  <span className="inline-block text-[10px] font-mono font-bold tracking-wider uppercase bg-gradient-to-r from-primary-600 to-primary-400 text-white px-3 py-1 rounded-full mb-5">
                    {tier.badge}
                  </span>
                )}

                {/* Top glow line on featured */}
                {tier.featured && (
                  <div className="absolute top-0 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-transparent via-primary-500 to-transparent" />
                )}

                <h3 className="text-xl font-bold text-surface-100 mb-1">
                  {tier.name}
                </h3>
                <p className="text-sm text-surface-500 mb-6 min-h-[40px]">
                  {tier.description}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-lg font-bold text-surface-300">$</span>
                  <span className="text-5xl font-extrabold text-surface-100 tracking-tight">
                    {annual ? tier.annual : tier.monthly}
                  </span>
                  <span className="text-base text-surface-500 ml-0.5">/mo</span>
                </div>
                <p className="text-xs text-surface-600 mb-6 min-h-[18px]">
                  {annual ? (
                    <>
                      ${tier.annual * 12}/year —{" "}
                      <span className="line-through">${tier.monthly * 12}</span>
                    </>
                  ) : (
                    "\u00A0"
                  )}
                </p>

                {/* CTA */}
                <a
                  href={tier.ctaHref}
                  className={`block text-center py-3 px-6 rounded-lg text-sm font-semibold transition-all mb-8 ${
                    tier.featured
                      ? "bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-900/20 hover:-translate-y-0.5"
                      : "border border-surface-700 text-surface-300 hover:text-surface-100 hover:border-surface-600"
                  }`}
                >
                  {tier.cta}
                </a>

                {/* Divider */}
                <div className="h-px bg-surface-700 mb-6" />

                {/* Feature list header */}
                <p
                  className={`text-[10px] font-mono font-semibold tracking-wider uppercase mb-4 ${
                    tier.featured ? "text-primary-500" : "text-surface-600"
                  }`}
                >
                  {tier.name === "Starter" ? "What's included" : `Everything in ${tiers[tiers.indexOf(tier) - 1]?.name}, plus`}
                </p>

                <ul className="space-y-3">
                  {tier.features
                    .filter((f) => !f.startsWith("Everything in"))
                    .map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-sm text-surface-400"
                      >
                        <span className="flex-shrink-0 w-[18px] h-[18px] mt-0.5 rounded-full bg-accent-emerald/10 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-accent-emerald" />
                        </span>
                        {feature}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>

          {/* ── Feature Comparison ── */}
          <div className="mb-24">
            <h2 className="text-3xl md:text-4xl font-bold text-surface-100 text-center mb-2">
              Compare{" "}
              <em
                className="not-italic"
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontStyle: "italic",
                  color: "var(--color-primary-600)",
                }}
              >
                every
              </em>{" "}
              feature
            </h2>
            <p className="text-center text-surface-500 mb-10">
              All plans include a 30-day free trial. No credit card required.
            </p>

            <div className="glass-card overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-surface-700)" }}>
                    <th className="text-left text-sm font-medium text-surface-500 px-6 py-4 w-[40%]" />
                    <th className="text-center text-sm font-bold text-surface-300 px-4 py-4">
                      Starter
                    </th>
                    <th className="text-center text-sm font-bold text-primary-500 px-4 py-4 bg-primary-600/[0.03] dark:bg-primary-600/[0.06]">
                      Pro
                    </th>
                    <th className="text-center text-sm font-bold text-surface-300 px-4 py-4">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {compareCategories.map((cat) => (
                    <>
                      <tr key={`cat-${cat.name}`}>
                        <td
                          colSpan={4}
                          className="text-[11px] font-mono font-semibold tracking-wider uppercase text-primary-500 px-6 pt-6 pb-2"
                          style={{
                            borderBottom:
                              "1px solid rgba(99,102,241,0.12)",
                          }}
                        >
                          {cat.name}
                        </td>
                      </tr>
                      {cat.rows.map((row) => (
                        <tr
                          key={row.feature}
                          className="table-row-hover"
                          style={{
                            borderBottom:
                              "1px solid var(--color-surface-700)",
                          }}
                        >
                          <td className="text-sm font-medium text-surface-300 px-6 py-3">
                            {row.feature}
                          </td>
                          <td className="text-center px-4 py-3">
                            <CellValue value={row.starter} />
                          </td>
                          <td className="text-center px-4 py-3 bg-primary-600/[0.02] dark:bg-primary-600/[0.04]">
                            <CellValue value={row.pro} />
                          </td>
                          <td className="text-center px-4 py-3">
                            <CellValue value={row.enterprise} />
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── FAQ ── */}
          <div className="mb-24 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-surface-100 text-center mb-10">
              Frequently asked questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="glass-card overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left"
                  >
                    <span className="text-sm font-semibold text-surface-200">
                      {faq.q}
                    </span>
                    {openFaq === i ? (
                      <ChevronUp className="w-4 h-4 text-surface-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-surface-500 flex-shrink-0" />
                    )}
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5">
                      <p className="text-sm text-surface-400 leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Bottom CTA ── */}
          <div className="text-center pb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-surface-100 mb-4">
              Ready to modernize{" "}
              <em
                className="not-italic"
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontStyle: "italic",
                  color: "var(--color-primary-600)",
                }}
              >
                your
              </em>{" "}
              store?
            </h2>
            <p className="text-lg text-surface-400 mb-8 max-w-lg mx-auto">
              Join hundreds of shipping stores already running on ShipOS.
            </p>
            <div className="flex items-center justify-center gap-4 flex-col sm:flex-row">
              <a
                href="/api/auth/signup"
                className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-base font-semibold transition-all flex items-center gap-2 shadow-lg shadow-primary-900/20 hover:-translate-y-0.5"
              >
                Get Started for Free
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="mailto:hello@bardolabs.ai"
                className="px-6 py-3 text-surface-300 hover:text-surface-100 rounded-lg text-base font-medium transition-colors flex items-center gap-2 border border-surface-700"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        className="relative z-10 px-6 py-4"
        style={{ borderTop: "1px solid var(--color-surface-700)" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-surface-600">
          <span>ShipOS v0.1.0</span>
          <span>
            Built by{" "}
            <span className="text-surface-400">Bardo Labs</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
