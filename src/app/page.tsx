import {
  Package,
  Users,
  Truck,
  Mail,
  ArrowRight,
  LogIn,
  ShieldCheck,
  BarChart3,
  Bell,
  Heart,
  Search,
  Tablet,
  Scan,
  Zap,
  RefreshCw,
  CheckCircle,
  Cloud,
  Monitor,
  X,
  Check,
  Activity,
  UserCog,
  Receipt,
  Smartphone,
  Palette,
  Clock,
  Star,
  ChevronRight,
  Globe,
  Lock,
  Sparkles,
  Camera,
  Sun,
  DollarSign,
  Mic,
  ScanLine,
  Brain,
  Volume2,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

/* Auth0 routes (/api/auth/*) require full-page redirects — <a> is intentional */
/* eslint-disable @next/next/no-html-link-for-pages */

/* ── Stats bar data ──────────────────────────────────── */
const stats = [
  { value: "6", label: "AI Features" },
  { value: "18+", label: "Dashboard Pages" },
  { value: "10+", label: "Carriers Supported" },
  { value: "99.9%", label: "Uptime SLA" },
];

/* ── Pain points ─────────────────────────────────────── */
const painPoints = [
  "Clunky desktop-only software that crashes",
  "No real-time visibility across locations",
  "Manual carrier reconciliation eating your margins",
  "Compliance paperwork scattered everywhere",
  "Customers calling to ask 'where's my package?'",
  "Zero loyalty tools to keep customers coming back",
];

/* ── Core capability sections ────────────────────────── */
const capabilities = [
  {
    tag: "AI Intelligence",
    title: "AI that sees, hears, and thinks",
    description:
      "Six built-in AI features powered by GPT-4o Vision — from photographing packages to voice commands to catching carrier overcharges. No other postal software even comes close.",
    features: [
      { icon: Camera, name: "AI Smart Intake", desc: "Photo a package, AI checks it in" },
      { icon: ScanLine, name: "AI ID Scan", desc: "Snap a license, onboard in 30 sec" },
      { icon: Sun, name: "Morning Briefing", desc: "AI-generated daily store digest" },
      { icon: DollarSign, name: "Bill Auditor", desc: "AI finds carrier overcharges" },
      { icon: Mail, name: "AI Mail Sort", desc: "Photo mail → auto-route to PMBs" },
      { icon: Mic, name: "Voice AI", desc: "Hands-free commands on every page" },
    ],
    gradient: "from-violet-500/10 to-purple-500/10",
  },
  {
    tag: "Package Operations",
    title: "Check in to check out — in seconds",
    description:
      "Scan a barcode, auto-detect the carrier, match to the customer, print a label, and fire off a notification — all in one fluid motion. When they pick up, capture a signature and close the loop with a full audit trail.",
    features: [
      { icon: Scan, name: "Smart Scan", desc: "Auto carrier detection from any barcode" },
      { icon: Package, name: "4×6 Labels", desc: "Instant thermal label printing" },
      { icon: CheckCircle, name: "Signature Capture", desc: "ID verify + sign on pickup" },
      { icon: Activity, name: "Audit Trail", desc: "Every action logged with user attribution" },
    ],
    gradient: "from-blue-500/10 to-indigo-500/10",
  },
  {
    tag: "Customer Intelligence",
    title: "Know every customer by name",
    description:
      "Rich profiles with photo avatars, PMB assignments, billing terms, notification preferences, and full transaction history. Bulk-import your existing database in minutes with our smart CSV wizard.",
    features: [
      { icon: Users, name: "Rich Profiles", desc: "Photos, PMB, billing & preferences" },
      { icon: Heart, name: "Loyalty Program", desc: "4-tier rewards: Bronze → Platinum" },
      { icon: Bell, name: "SMS & Email", desc: "98% open rate via Twilio + Resend" },
      { icon: RefreshCw, name: "Bulk Import", desc: "Smart CSV wizard with column mapping" },
    ],
    gradient: "from-emerald-500/10 to-teal-500/10",
  },
  {
    tag: "Shipping & Revenue",
    title: "Ship smarter, earn more",
    description:
      "Rate-shop across 10+ carriers, manage wholesale and retail pricing with custom margins, reconcile invoices against shipments, and catch overcharges before they eat your profit.",
    features: [
      { icon: Truck, name: "Rate Shopping", desc: "Compare 10+ carriers in real time" },
      { icon: Zap, name: "Add-on Pricing", desc: "Wholesale/retail with custom markup" },
      { icon: Receipt, name: "Reconciliation", desc: "Catch overcharges automatically" },
      { icon: BarChart3, name: "Revenue Analytics", desc: "Trends, forecasts & growth dashboards" },
    ],
    gradient: "from-amber-500/10 to-orange-500/10",
  },
  {
    tag: "Compliance & Mail",
    title: "Audit-ready, always",
    description:
      "PS Form 1583 tracking, ID expiry alerts, and a guided PMB setup wizard that ensures USPS CMRA compliance from day one. Plus full mail handling with scan-to-notify workflows.",
    features: [
      { icon: ShieldCheck, name: "CMRA Compliance", desc: "1583 forms, ID expiry alerts" },
      { icon: Mail, name: "Mail Handling", desc: "Scan, sort & notify automatically" },
      { icon: Clock, name: "End-of-Day", desc: "Carrier counts & discrepancy flags" },
      { icon: Receipt, name: "Invoicing", desc: "Automated billing & service charges" },
    ],
    gradient: "from-violet-500/10 to-purple-500/10",
  },
];

/* ── Platform features ───────────────────────────────── */
const platformFeatures = [
  { icon: Brain, name: "Built-in AI (GPT-4o)", desc: "Vision AI across 6 features" },
  { icon: Volume2, name: "Voice Assistant", desc: "Hands-free on every page" },
  { icon: Lock, name: "Auth0 SSO", desc: "Enterprise-grade authentication" },
  { icon: UserCog, name: "Roles & Permissions", desc: "Admin, Manager & Staff access" },
  { icon: Tablet, name: "Kiosk Mode", desc: "Self-service customer pickup" },
  { icon: Search, name: "Command Palette", desc: "⌘K to find anything instantly" },
  { icon: Palette, name: "Light & Dark Mode", desc: "One-click theme switching" },
  { icon: Globe, name: "Multi-Tenant", desc: "Isolated stores with custom branding" },
  { icon: Smartphone, name: "Mobile & PWA", desc: "Install on any device" },
  { icon: RefreshCw, name: "PostalMate Migration", desc: "Import data with rollback support" },
  { icon: Star, name: "Loyalty Engine", desc: "Points, rewards & referral program" },
  { icon: Sparkles, name: "Auto-Updates", desc: "New features every week, zero downtime" },
];

/* ── Competitor comparison ───────────────────────────── */
const comparisonRows = [
  { feature: "Built-in AI (GPT-4o Vision)", shipOS: true, legacy: false },
  { feature: "AI package intake (photo → check-in)", shipOS: true, legacy: false },
  { feature: "AI carrier bill auditing", shipOS: true, legacy: false },
  { feature: "Voice AI assistant", shipOS: true, legacy: false },
  { feature: "Cloud-based (access anywhere)", shipOS: true, legacy: false },
  { feature: "Modern web & mobile interface", shipOS: true, legacy: false },
  { feature: "Auto carrier detection", shipOS: true, legacy: false },
  { feature: "SMS notifications", shipOS: true, legacy: false },
  { feature: "Loyalty rewards program", shipOS: true, legacy: false },
  { feature: "Built-in migration tools", shipOS: true, legacy: false },
  { feature: "Multi-location support", shipOS: true, legacy: false },
  { feature: "Automatic SaaS updates", shipOS: true, legacy: false },
];

/* ── How-it-works steps ──────────────────────────────── */
const steps = [
  {
    number: "01",
    title: "Sign up in 60 seconds",
    description: "No credit card, no sales call. Create your account, configure your store, and you're live.",
  },
  {
    number: "02",
    title: "Import or start fresh",
    description: "Use our PostalMate migration tool to bring your data over — or start with a clean slate and our setup wizard.",
  },
  {
    number: "03",
    title: "Run your store, smarter",
    description: "Check in packages, manage customers, ship across carriers, and grow revenue — all from one modern dashboard.",
  },
];

function ComparisonCell({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent-emerald/15">
      <Check className="w-3.5 h-3.5 text-accent-emerald" />
    </span>
  ) : (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/10">
      <X className="w-3.5 h-3.5 text-red-400/80" />
    </span>
  );
}

/* ═════════════════════════════════════════════════════════
   PAGE
   ═════════════════════════════════════════════════════════ */
export default function Home() {
  return (
    <div className="min-h-screen bg-surface-950 flex flex-col relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full opacity-30 pointer-events-none" style={{ background: "rgba(99, 102, 241, 0.06)", filter: "blur(120px)" }} />
      <div className="absolute top-[40%] right-[-15%] w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none" style={{ background: "rgba(99, 102, 241, 0.05)", filter: "blur(100px)" }} />
      <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] rounded-full opacity-15 pointer-events-none" style={{ background: "rgba(5, 150, 105, 0.05)", filter: "blur(80px)" }} />

      <PublicHeader />

      <main className="relative z-10 flex-1">

        {/* ═══════════════════════════════════════════════
            HERO
            ═══════════════════════════════════════════════ */}
        <section className="px-6 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-500/20 bg-primary-600/5 mb-8">
              <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
              <span className="text-xs font-mono font-semibold tracking-wide text-primary-500">
                NOW IN OPEN BETA — FREE FOR 30 DAYS
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold text-surface-100 mb-6 leading-[1.08] tracking-tight">
              The AI-powered OS for{" "}
              <em
                className="not-italic block md:inline"
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontStyle: "italic",
                  color: "#4F46E5",
                }}
              >
                modern postal retail
              </em>
            </h1>

            <p className="text-xl md:text-2xl text-surface-400 mb-10 max-w-3xl mx-auto leading-relaxed">
              AI-powered package intake, voice commands, carrier bill auditing, and more —{" "}
              <span className="text-surface-200 font-semibold">
                plus everything you need in one cloud platform
              </span>{" "}
              to replace legacy desktop software.
            </p>

            {/* CTA buttons */}
            <div className="flex items-center justify-center gap-4 flex-col sm:flex-row mb-6">
              <a
                href="/api/auth/signup"
                className="px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-lg font-bold transition-all flex items-center gap-2 shadow-xl shadow-primary-900/20 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary-900/30"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="/features"
                className="px-8 py-4 text-surface-300 hover:text-surface-100 rounded-xl text-lg font-medium transition-colors flex items-center gap-2 border border-surface-700 hover:border-surface-600"
              >
                Explore Features
                <ChevronRight className="w-5 h-5" />
              </a>
            </div>
            <p className="text-sm text-surface-500">
              No credit card required · Free for 30 days · Cancel anytime
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            STATS BAR
            ═══════════════════════════════════════════════ */}
        <section className="px-6 pb-20">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="glass-card py-6 px-5 text-center">
                  <p className="text-3xl font-extrabold text-surface-100 mb-1">
                    {s.value}
                  </p>
                  <p className="text-sm text-surface-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            PROBLEM → SOLUTION
            ═══════════════════════════════════════════════ */}
        <section className="px-6 py-20" style={{ borderTop: "1px solid var(--color-surface-700)" }}>
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Pain points */}
              <div>
                <span className="inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-accent-rose bg-red-500/10 rounded-full px-3 py-1 mb-4">
                  The problem
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-surface-100 mb-6">
                  Legacy software is{" "}
                  <em
                    className="not-italic"
                    style={{
                      fontFamily: "'Instrument Serif', Georgia, serif",
                      fontStyle: "italic",
                      color: "var(--color-accent-rose)",
                    }}
                  >
                    holding you back
                  </em>
                </h2>
                <ul className="space-y-3">
                  {painPoints.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-red-500/10 flex items-center justify-center">
                        <X className="w-3 h-3 text-red-400" />
                      </span>
                      <span className="text-base text-surface-400">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Solution */}
              <div>
                <span className="inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-accent-emerald bg-accent-emerald/10 rounded-full px-3 py-1 mb-4">
                  The solution
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-surface-100 mb-6">
                  ShipOS does it{" "}
                  <em
                    className="not-italic"
                    style={{
                      fontFamily: "'Instrument Serif', Georgia, serif",
                      fontStyle: "italic",
                      color: "var(--color-accent-emerald)",
                    }}
                  >
                    all
                  </em>
                </h2>
                <p className="text-base text-surface-400 leading-relaxed mb-6">
                  One AI-powered, cloud-native platform that handles your entire postal retail operation — from the moment a package arrives to the moment it leaves, and everything in between.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    "6 built-in AI features",
                    "Voice commands, hands-free",
                    "AI carrier bill auditing",
                    "CMRA compliance built in",
                    "Instant SMS notifications",
                    "Cloud-based, any device",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent-emerald/10 flex items-center justify-center">
                        <Check className="w-3 h-3 text-accent-emerald" />
                      </span>
                      <span className="text-sm text-surface-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            CAPABILITY SECTIONS
            ═══════════════════════════════════════════════ */}
        {capabilities.map((cap, idx) => (
          <section
            key={cap.tag}
            className="px-6 py-20"
            style={idx === 0 ? { borderTop: "1px solid var(--color-surface-700)" } : undefined}
          >
            <div className="max-w-5xl mx-auto">
              {/* Section header */}
              <div className={`mb-10 ${idx % 2 === 0 ? "text-left" : "text-right"}`}>
                <span className="inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-primary-500 bg-primary-600/10 rounded-full px-3 py-1 mb-4">
                  {cap.tag}
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-surface-100 mb-3">
                  {cap.title}
                </h2>
                <p className={`text-lg text-surface-400 max-w-2xl leading-relaxed ${idx % 2 === 0 ? "" : "ml-auto"}`}>
                  {cap.description}
                </p>
              </div>

              {/* Feature cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cap.features.map((f) => (
                  <div key={f.name} className="glass-card p-6 card-hover group text-left">
                    <div className="w-12 h-12 rounded-xl bg-primary-600/10 flex items-center justify-center mb-4 group-hover:bg-primary-600/15 transition-colors">
                      <f.icon className="w-6 h-6 text-primary-500" />
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
            </div>
          </section>
        ))}

        {/* ═══════════════════════════════════════════════
            PLATFORM FEATURES GRID
            ═══════════════════════════════════════════════ */}
        <section className="px-6 py-20" style={{ borderTop: "1px solid var(--color-surface-700)" }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-primary-500 bg-primary-600/10 rounded-full px-3 py-1 mb-4">
                Platform & Experience
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-surface-100 mb-3">
                Built for speed, designed for{" "}
                <em
                  className="not-italic"
                  style={{
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontStyle: "italic",
                    color: "var(--color-primary-600)",
                  }}
                >
                  delight
                </em>
              </h2>
              <p className="text-lg text-surface-400 max-w-2xl mx-auto">
                Enterprise-grade infrastructure with a consumer-grade experience.
                Every detail considered.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {platformFeatures.map((f) => (
                <div key={f.name} className="glass-card p-5 text-center group card-hover">
                  <div className="w-10 h-10 rounded-lg bg-primary-600/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-600/15 transition-colors">
                    <f.icon className="w-5 h-5 text-primary-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-surface-100 mb-1">
                    {f.name}
                  </h3>
                  <p className="text-xs text-surface-500">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            HOW IT WORKS
            ═══════════════════════════════════════════════ */}
        <section className="px-6 py-20" style={{ borderTop: "1px solid var(--color-surface-700)" }}>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <span className="inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-primary-500 bg-primary-600/10 rounded-full px-3 py-1 mb-4">
                Get Started
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-surface-100 mb-3">
                Up and running in{" "}
                <em
                  className="not-italic"
                  style={{
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontStyle: "italic",
                    color: "var(--color-primary-600)",
                  }}
                >
                  minutes
                </em>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((step, i) => (
                <div key={step.number} className="relative text-center">
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div
                      className="hidden md:block absolute top-8 left-[calc(50%+32px)] right-[calc(-50%+32px)] h-px"
                      style={{ borderTop: "2px dashed var(--color-surface-700)" }}
                    />
                  )}
                  <div className="relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-primary-600/10 flex items-center justify-center mx-auto mb-5">
                      <span className="text-2xl font-extrabold text-primary-500 font-mono">
                        {step.number}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-surface-100 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-surface-500 leading-relaxed max-w-xs mx-auto">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            COMPETITOR COMPARISON
            ═══════════════════════════════════════════════ */}
        <section className="px-6 py-20" style={{ borderTop: "1px solid var(--color-surface-700)" }}>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-primary-500 bg-primary-600/10 rounded-full px-3 py-1 mb-4">
                Why Switch
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-surface-100 mb-3">
                ShipOS vs. legacy{" "}
                <em
                  className="not-italic"
                  style={{
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontStyle: "italic",
                    color: "var(--color-primary-600)",
                  }}
                >
                  desktop software
                </em>
              </h2>
              <p className="text-lg text-surface-400 max-w-xl mx-auto">
                See why modern postal stores are making the switch.
              </p>
            </div>

            <div className="glass-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-surface-700)" }}>
                    <th className="text-left text-sm font-medium text-surface-500 px-6 py-4 w-[50%]" />
                    <th className="text-center px-6 py-4 bg-primary-600/[0.03]">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary-600/10">
                          <Cloud className="w-4.5 h-4.5 text-primary-500" />
                        </span>
                        <span className="text-sm font-bold text-primary-500">ShipOS</span>
                      </div>
                    </th>
                    <th className="text-center px-6 py-4">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-surface-800">
                          <Monitor className="w-4.5 h-4.5 text-surface-500" />
                        </span>
                        <span className="text-sm font-bold text-surface-400">Legacy Tools</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr
                      key={row.feature}
                      className="table-row-hover"
                      style={{ borderBottom: "1px solid var(--color-surface-700)" }}
                    >
                      <td className="text-sm font-medium text-surface-300 px-6 py-3.5">
                        {row.feature}
                      </td>
                      <td className="text-center px-6 py-3.5 bg-primary-600/[0.02]">
                        <ComparisonCell value={row.shipOS} />
                      </td>
                      <td className="text-center px-6 py-3.5">
                        <ComparisonCell value={row.legacy} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* CTA inside table */}
              <div
                className="px-6 py-5 flex flex-col sm:flex-row items-center justify-center gap-4"
                style={{ borderTop: "1px solid var(--color-surface-700)" }}
              >
                <a
                  href="/api/auth/signup"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-primary-900/20 hover:-translate-y-0.5"
                >
                  Switch to ShipOS
                  <ArrowRight className="w-4 h-4" />
                </a>
                <p className="text-xs text-surface-500">
                  Free migration tool for PostalMate users · 30-day trial
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            SOCIAL PROOF
            ═══════════════════════════════════════════════ */}
        <section className="px-6 py-20" style={{ borderTop: "1px solid var(--color-surface-700)" }}>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-surface-100 mb-12">
              Built by people who{" "}
              <em
                className="not-italic"
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontStyle: "italic",
                  color: "var(--color-primary-600)",
                }}
              >
                know the industry
              </em>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card p-6">
                <div className="w-12 h-12 rounded-xl bg-primary-600/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-primary-500" />
                </div>
                <p className="text-2xl font-extrabold text-surface-100 mb-1">10+ Years</p>
                <p className="text-sm text-surface-500">
                  of postal retail industry experience behind every feature
                </p>
              </div>
              <div className="glass-card p-6">
                <div className="w-12 h-12 rounded-xl bg-accent-emerald/10 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-accent-emerald" />
                </div>
                <p className="text-2xl font-extrabold text-surface-100 mb-1">12 Releases</p>
                <p className="text-sm text-surface-500">
                  shipped this month alone — we move fast and ship weekly
                </p>
              </div>
              <div className="glass-card p-6">
                <div className="w-12 h-12 rounded-xl bg-accent-amber/10 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-6 h-6 text-accent-amber" />
                </div>
                <p className="text-2xl font-extrabold text-surface-100 mb-1">CMRA-First</p>
                <p className="text-sm text-surface-500">
                  compliance built in from day one — not bolted on as an afterthought
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            PRICING TEASER
            ═══════════════════════════════════════════════ */}
        <section className="px-6 py-20" style={{ borderTop: "1px solid var(--color-surface-700)" }}>
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-primary-500 bg-primary-600/10 rounded-full px-3 py-1 mb-4">
              Simple Pricing
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-surface-100 mb-3">
              Starts at{" "}
              <em
                className="not-italic"
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontStyle: "italic",
                  color: "var(--color-primary-600)",
                }}
              >
                $99/month
              </em>
            </h2>
            <p className="text-lg text-surface-400 max-w-xl mx-auto mb-8">
              Three plans built for every stage — from solo operators to multi-location enterprises. No contracts, no hidden fees.
            </p>
            <div className="flex items-center justify-center gap-6 flex-col sm:flex-row">
              <div className="glass-card px-8 py-5 text-center">
                <p className="text-sm font-semibold text-surface-300 mb-1">Starter</p>
                <p className="text-3xl font-extrabold text-surface-100">$99<span className="text-base font-normal text-surface-500">/mo</span></p>
              </div>
              <div className="glass-card px-8 py-5 text-center border-primary-500/30" style={{ borderColor: "rgba(79,70,229,0.3)" }}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-primary-500">Pro</p>
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase bg-primary-600 text-white px-2 py-0.5 rounded-full">Popular</span>
                </div>
                <p className="text-3xl font-extrabold text-surface-100">$179<span className="text-base font-normal text-surface-500">/mo</span></p>
              </div>
              <div className="glass-card px-8 py-5 text-center">
                <p className="text-sm font-semibold text-surface-300 mb-1">Enterprise</p>
                <p className="text-3xl font-extrabold text-surface-100">$299<span className="text-base font-normal text-surface-500">/mo</span></p>
              </div>
            </div>
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-400 font-semibold text-sm mt-6 transition-colors"
            >
              Compare all plans
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            FINAL CTA
            ═══════════════════════════════════════════════ */}
        <section className="px-6 py-24" style={{ borderTop: "1px solid var(--color-surface-700)" }}>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold text-surface-100 mb-5 leading-tight">
              Ready to run your store{" "}
              <em
                className="not-italic"
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontStyle: "italic",
                  color: "#4F46E5",
                }}
              >
                smarter
              </em>
              ?
            </h2>
            <p className="text-xl text-surface-400 mb-10 max-w-lg mx-auto">
              Join the next generation of postal retail. Start your free trial today — no credit card required.
            </p>
            <div className="flex items-center justify-center gap-4 flex-col sm:flex-row">
              <a
                href="/api/auth/signup"
                className="px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-lg font-bold transition-all flex items-center gap-2 shadow-xl shadow-primary-900/20 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary-900/30"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="/api/auth/login"
                className="px-8 py-4 text-surface-300 hover:text-surface-100 rounded-xl text-lg font-medium transition-colors flex items-center gap-2 border border-surface-700 hover:border-surface-600"
              >
                <LogIn className="w-5 h-5" />
                Log In
              </a>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
