import {
  Package,
  Users,
  Truck,
  Mail,
  ShieldCheck,
  BarChart3,
  Receipt,
  Bell,
  Heart,
  Search,
  Tablet,
  ArrowRight,
  CheckCircle,
  Scan,
  FileText,
  RefreshCw,
  Building2,
  UserCog,
  Palette,
  Smartphone,
  Zap,
  Camera,
  Sun,
  DollarSign,
  Mic,
  ScanLine,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

/* Auth0 routes require full-page redirects */
/* eslint-disable @next/next/no-html-link-for-pages */

/* ── Hero features (top highlight row) ─────────────── */
const heroStats = [
  { label: "Dashboard Pages", value: "18+" },
  { label: "AI Features", value: "6" },
  { label: "Carriers Supported", value: "10+" },
  { label: "Uptime SLA", value: "99.9%" },
];

/* ── Feature categories ────────────────────────────── */
const categories = [
  {
    tag: "AI Intelligence",
    title: "AI that actually runs your store",
    description:
      "ShipOS is the first postal retail platform with built-in AI. Six intelligent features that see, hear, read, and think — so your team can focus on customers instead of busywork.",
    features: [
      {
        icon: Camera,
        name: "AI Smart Intake",
        desc: "Photograph a package and AI reads the carrier, tracking number, sender, and PMB — checks in, prints a label, and notifies the customer. Batch mode handles 5–10 packages at once.",
      },
      {
        icon: ScanLine,
        name: "AI ID Scan Onboarding",
        desc: "Snap a photo of a driver's license and AI extracts name, address, DOB, and ID number. New customer profiles created in 30 seconds flat.",
      },
      {
        icon: Sun,
        name: "AI Morning Briefing",
        desc: "Every morning, an AI-generated briefing card shows store status, action items, revenue snapshot, and predictions for the day ahead.",
      },
      {
        icon: DollarSign,
        name: "AI Carrier Bill Auditor",
        desc: "Upload a carrier invoice and AI scans every line for overcharges, duplicates, invalid surcharges, and service mismatches — with exact dollar amounts.",
      },
      {
        icon: Mail,
        name: "AI Mail Sorting",
        desc: "Photograph a spread of mail and AI reads addresses, identifies types, extracts PMB numbers, and auto-routes each piece to the right mailbox.",
      },
      {
        icon: Mic,
        name: "Voice AI Assistant",
        desc: "\"Check in a FedEx package for PMB 142\" — hands-free voice commands for all common operations. Available on every page via the floating mic button.",
      },
    ],
  },
  {
    tag: "Core Operations",
    title: "Package & mail management, reimagined",
    description:
      "Every step from intake to release — check-in, tracking, notifications, and end-of-day reconciliation — in a single, intuitive workflow.",
    features: [
      {
        icon: Package,
        name: "Package Check-In",
        desc: "Scan barcodes, detect carriers automatically, match to customers, and print 4×6 labels — all in seconds.",
      },
      {
        icon: Scan,
        name: "Package Check-Out",
        desc: "ID verification, signature capture, and release confirmation with a full audit trail for every pickup.",
      },
      {
        icon: Mail,
        name: "Mail Handling",
        desc: "Scan, sort, and manage incoming mail with automated customer notifications and delivery tracking.",
      },
      {
        icon: FileText,
        name: "End-of-Day",
        desc: "Carrier scan counts, discrepancy flags, and a one-click day-close report so nothing slips through.",
      },
    ],
  },
  {
    tag: "Customer Management",
    title: "Know your customers inside and out",
    description:
      "Rich profiles, mailbox management, bulk import, photo avatars, and a loyalty program that keeps people coming back.",
    features: [
      {
        icon: Users,
        name: "Customer Profiles & PMB",
        desc: "Full customer records with mailbox assignments, billing terms, ID tracking, and notification preferences.",
      },
      {
        icon: FileText,
        name: "Bulk CSV Import",
        desc: "4-step wizard: upload → column mapping → preview → confirmation. Smart delimiter detection included.",
      },
      {
        icon: Heart,
        name: "Loyalty Program",
        desc: "Four tiers (Bronze → Platinum), point accumulation on every transaction, redeemable rewards, and a referral engine.",
      },
      {
        icon: Bell,
        name: "Customer Notifications",
        desc: "SMS-first with 98% open rates. Email fallback. Automatic alerts for package arrivals, pickups, and compliance deadlines.",
      },
    ],
  },
  {
    tag: "Shipping & Carriers",
    title: "Multi-carrier power in one place",
    description:
      "Rate-shop across 10+ carriers, manage wholesale and retail pricing, reconcile invoices, and catch overcharges before they add up.",
    features: [
      {
        icon: Truck,
        name: "Shipping Center",
        desc: "Multi-carrier rate comparison with label generation. Supports UPS, FedEx, USPS, DHL, Amazon, LaserShip, OnTrac, and more.",
      },
      {
        icon: Receipt,
        name: "Carrier Reconciliation",
        desc: "Compare carrier invoices against shipment records, flag discrepancies, and manage disputes — all inside ShipOS.",
      },
      {
        icon: Zap,
        name: "Add-on Rate Management",
        desc: "Configure wholesale and retail pricing with non-standard margin/markup. Starter rates wizard gets new stores running fast.",
      },
      {
        icon: CheckCircle,
        name: "Auto Carrier Detection",
        desc: "Scan a barcode and ShipOS identifies the carrier instantly — no manual selection needed.",
      },
    ],
  },
  {
    tag: "Compliance & Reporting",
    title: "Stay audit-ready, always",
    description:
      "PS Form 1583 tracking, ID expiry alerts, and a compliance dashboard that keeps your CMRA status clean. Plus analytics to see how your business is performing.",
    features: [
      {
        icon: ShieldCheck,
        name: "CMRA Compliance",
        desc: "PS Form 1583 tracking, ID expiry alerts, and audit-readiness reports so you're never caught off guard.",
      },
      {
        icon: BarChart3,
        name: "Reports & Analytics",
        desc: "Revenue trends, package volume, customer metrics, and growth dashboards — all in real time.",
      },
      {
        icon: Receipt,
        name: "Invoicing",
        desc: "Mailbox rental billing, service charges, and automated invoice generation for recurring revenue.",
      },
      {
        icon: Building2,
        name: "Multi-Tenancy",
        desc: "Each store gets its own isolated tenant with custom branding, timezone, tax rates, and business hours.",
      },
    ],
  },
  {
    tag: "Platform & Experience",
    title: "Built for speed, designed for delight",
    description:
      "A modern tech stack with Auth0 SSO, light/dark theming, a self-service kiosk, command palette, role-based access, and a migration tool to get you off PostalMate in minutes.",
    features: [
      {
        icon: Tablet,
        name: "Kiosk Mode",
        desc: "Full-screen self-service interface for customer package pickup — optimized for touchscreens and counter displays.",
      },
      {
        icon: Search,
        name: "Command Palette (⌘K)",
        desc: "Fuzzy search across customers, packages, and actions. Find anything in milliseconds without leaving the keyboard.",
      },
      {
        icon: UserCog,
        name: "Users & Roles",
        desc: "Invite team members with Admin, Manager, or Staff roles. Permissions control what each person can see and do.",
      },
      {
        icon: Palette,
        name: "Light & Dark Mode",
        desc: "Full Indigo Premium design system with a one-click theme switcher. Your preference persists across sessions.",
      },
      {
        icon: RefreshCw,
        name: "PostalMate Migration",
        desc: "Analyze, map fields, and import your existing PostalMate data automatically — with rollback support if anything goes wrong.",
      },
      {
        icon: Smartphone,
        name: "Mobile & PWA",
        desc: "iOS companion app with barcode scanning. Install ShipOS as a standalone PWA on any device.",
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════ */
export default function FeaturesPage() {
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

      <PublicHeader />

      {/* ── Main ── */}
      <main className="relative z-10 flex-1 px-6 py-16">
        <div className="max-w-6xl mx-auto">

          {/* ── Hero ── */}
          <div className="text-center mb-16">
            <p className="text-xs font-mono font-semibold tracking-widest uppercase text-primary-500 mb-4">
              Features
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-surface-100 mb-4">
              AI-powered features that{" "}
              <em
                className="not-italic"
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontStyle: "italic",
                  color: "var(--color-primary-600)",
                }}
              >
                run your store
              </em>
            </h1>
            <p className="text-lg text-surface-400 max-w-2xl mx-auto mb-12">
              ShipOS is the first postal retail platform with built-in AI —
              six intelligent features plus everything you need to manage
              packages, customers, shipping, and compliance.
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {heroStats.map((s) => (
                <div key={s.label} className="glass-card py-5 px-4 text-center">
                  <p className="text-2xl font-extrabold text-surface-100">
                    {s.value}
                  </p>
                  <p className="text-xs text-surface-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Feature Sections ── */}
          {categories.map((cat, catIdx) => (
            <section key={cat.tag} className="mb-24">
              {/* Section header */}
              <div
                className={`mb-10 ${
                  catIdx % 2 === 0 ? "text-left" : "text-right"
                }`}
              >
                <span className="inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-primary-500 bg-primary-600/10 rounded-full px-3 py-1 mb-4">
                  {cat.tag}
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-surface-100 mb-3">
                  {cat.title}
                </h2>
                <p
                  className={`text-base text-surface-400 max-w-2xl leading-relaxed ${
                    catIdx % 2 === 0 ? "" : "ml-auto"
                  }`}
                >
                  {cat.description}
                </p>
              </div>

              {/* Feature cards */}
              <div
                className={`grid gap-4 ${
                  cat.features.length <= 4
                    ? "grid-cols-1 md:grid-cols-2"
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                }`}
              >
                {cat.features.map((f) => (
                  <div
                    key={f.name}
                    className="glass-card p-6 card-hover group text-left"
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary-600/10 flex items-center justify-center mb-4 group-hover:bg-primary-600/15 transition-colors">
                      <f.icon className="w-5 h-5 text-primary-500" />
                    </div>
                    <h3 className="text-base font-semibold text-surface-100 mb-1.5">
                      {f.name}
                    </h3>
                    <p className="text-sm text-surface-500 leading-relaxed">
                      {f.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* ── Bottom CTA ── */}
          <div className="text-center pb-8" style={{ borderTop: "1px solid var(--color-surface-700)", paddingTop: "48px" }}>
            <h2 className="text-3xl md:text-4xl font-bold text-surface-100 mb-4">
              Ready to see it in{" "}
              <em
                className="not-italic"
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontStyle: "italic",
                  color: "var(--color-primary-600)",
                }}
              >
                action
              </em>
              ?
            </h2>
            <p className="text-lg text-surface-400 mb-8 max-w-lg mx-auto">
              Start your free 30-day trial — no credit card required.
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
                href="/pricing"
                className="px-6 py-3 text-surface-300 hover:text-surface-100 rounded-lg text-base font-medium transition-colors flex items-center gap-2 border border-surface-700"
              >
                View Pricing
              </a>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
