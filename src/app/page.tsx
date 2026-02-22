import {
  Package,
  Users,
  Truck,
  Mail,
  TrendingUp,
  ArrowRight,
  LogIn,
  MessageSquare,
  Phone,
  HelpCircle,
} from "lucide-react";

/* Auth0 routes (/api/auth/*) require full-page redirects — <a> is intentional */
/* eslint-disable @next/next/no-html-link-for-pages */

export default function Home() {
  return (
    <div className="min-h-screen bg-surface-950 flex flex-col relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-30" style={{ background: 'rgba(99, 102, 241, 0.05)', filter: 'blur(100px)' }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-20" style={{ background: 'rgba(99, 102, 241, 0.05)', filter: 'blur(80px)' }} />

      {/* Header */}
      <header className="relative z-10 px-6 py-4" style={{ borderBottom: '1px solid var(--color-surface-700)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shipos-logo-mark.svg" alt="ShipOS" width={40} height={40} />
            <div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl font-bold text-surface-100">Ship</span>
                <span className="text-xl font-bold text-primary-500">OS</span>
              </div>
              <p className="text-xs text-surface-500">
                by Bardo Labs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/pricing"
              className="px-4 py-2 text-surface-300 hover:text-surface-100 rounded-lg text-sm font-medium transition-colors"
            >
              Pricing
            </a>
            <a
              href="#support"
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

      {/* Hero */}
      <main className="relative z-10 flex-1 px-6">
        <div className="max-w-4xl mx-auto text-center py-24">
          <h2 className="text-5xl font-extrabold text-surface-100 mb-4">
            Your postal store,{" "}
            <em className="brand-italic text-5xl not-italic" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "#4F46E5" }}>
              fully managed
            </em>
          </h2>
          <p className="text-lg text-surface-400 mb-8 max-w-2xl mx-auto">
            Package tracking, customer management, shipping, and compliance —
            all in one modern platform designed for postal retail.
          </p>

          {/* CTA buttons */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <a
              href="/api/auth/signup"
              className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-base font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-primary-900/20"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="/api/auth/login"
              className="px-6 py-3 text-surface-300 hover:text-surface-100 rounded-lg text-base font-medium transition-colors flex items-center gap-2 border border-surface-700"
            >
              <LogIn className="w-5 h-5" />
              Log In
            </a>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Package,
                title: "Package Tracking",
                desc: "Check in, notify, and release packages with full audit trails",
              },
              {
                icon: Users,
                title: "Customer & PMB",
                desc: "Manage mailbox rentals, CMRA compliance, and 1583 forms",
              },
              {
                icon: Truck,
                title: "Shipping Center",
                desc: "Multi-carrier rate shopping with wholesale pricing",
              },
              {
                icon: Mail,
                title: "Mail Handling",
                desc: "Scan, sort, and manage mail with automated notifications",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="glass-card p-6 text-left card-hover"
              >
                <feature.icon className="w-8 h-8 text-primary-600 mb-3" />
                <h3 className="text-sm font-semibold text-surface-100 mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs text-surface-500">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Quick stats preview */}
          <div className="mt-12 glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-accent-emerald" />
              <span className="text-sm font-medium text-surface-300">
                Platform Ready
              </span>
            </div>
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: "Package Check-in", value: "✓" },
                { label: "Customer Mgmt", value: "✓" },
                { label: "Shipping Center", value: "✓" },
                { label: "Analytics", value: "✓" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold text-accent-emerald">
                    {stat.value}
                  </p>
                  <p className="text-xs text-surface-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Support Section ── */}
        <section id="support" className="relative z-10 max-w-4xl mx-auto pb-20 scroll-mt-24">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 text-xs font-mono font-medium tracking-widest uppercase text-primary-500 mb-4">
              <HelpCircle className="w-4 h-4" />
              Support
            </span>
            <h2 className="text-3xl font-bold text-surface-100 mb-3">
              We&rsquo;re here to help
            </h2>
            <p className="text-base text-surface-400 max-w-lg mx-auto">
              Reach out through any channel, or browse our self-service resources below.
            </p>
          </div>

          {/* Support channels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
            <a
              href="mailto:support@bardolabs.ai"
              className="glass-card p-6 card-hover block text-left group"
            >
              <div className="w-11 h-11 rounded-xl bg-primary-600/10 flex items-center justify-center mb-4">
                <Mail className="w-5 h-5 text-primary-500" />
              </div>
              <h3 className="text-base font-semibold text-surface-100 mb-1">
                Email Support
              </h3>
              <p className="text-sm text-surface-500 mb-4 leading-relaxed">
                Send us a detailed message and we&rsquo;ll respond within 24 hours.
              </p>
              <span className="text-sm font-semibold text-primary-500 inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                Email us
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </a>

            <a
              href="#"
              className="glass-card p-6 card-hover block text-left group"
            >
              <div className="w-11 h-11 rounded-xl bg-primary-600/10 flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5 text-primary-500" />
              </div>
              <h3 className="text-base font-semibold text-surface-100 mb-1">
                Live Chat
              </h3>
              <p className="text-sm text-surface-500 mb-4 leading-relaxed">
                Chat with our support team in real time. Mon–Fri, 9am–6pm ET.
              </p>
              <span className="text-sm font-semibold text-primary-500 inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                Start chat
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </a>

            <a
              href="tel:+18005550100"
              className="glass-card p-6 card-hover block text-left group"
            >
              <div className="w-11 h-11 rounded-xl bg-primary-600/10 flex items-center justify-center mb-4">
                <Phone className="w-5 h-5 text-primary-500" />
              </div>
              <h3 className="text-base font-semibold text-surface-100 mb-1">
                Phone Support
              </h3>
              <p className="text-sm text-surface-500 mb-4 leading-relaxed">
                Talk to a human. Available for Pro and Enterprise plans.
              </p>
              <span className="text-sm font-semibold text-primary-500 inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                Call now
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </a>
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto mb-16">
            <h3 className="text-2xl font-bold text-surface-100 text-center mb-8">
              Frequently Asked Questions
            </h3>
            <div className="space-y-3">
              {[
                {
                  q: "How do I import my existing customers?",
                  a: "Go to Customers → Add Customer → Bulk Import (CSV). Upload a CSV file and we'll auto-map your columns.",
                },
                {
                  q: "Which carriers does ShipOS support?",
                  a: "UPS, FedEx, USPS, DHL, Amazon, LaserShip, OnTrac, and more. We're always adding new carriers.",
                },
                {
                  q: "Can I use ShipOS on a tablet?",
                  a: "Yes! ShipOS is fully responsive and works great on tablets and mobile devices. The Kiosk mode is specifically designed for touchscreens.",
                },
                {
                  q: "Is there a free trial?",
                  a: "Yes — every new account gets a 30-day free trial with full access to all features. No credit card required.",
                },
              ].map((item) => (
                <div
                  key={item.q}
                  className="glass-card p-5"
                >
                  <h4 className="text-sm font-semibold text-surface-100 mb-1.5">
                    {item.q}
                  </h4>
                  <p className="text-sm text-surface-500 leading-relaxed">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Still-have-questions CTA */}
          <div className="text-center py-10" style={{ borderTop: '1px solid var(--color-surface-700)' }}>
            <h3 className="text-xl font-bold text-surface-100 mb-2">
              Still have questions?
            </h3>
            <p className="text-sm text-surface-400 mb-6">
              Our team is happy to help with anything.
            </p>
            <a
              href="mailto:hello@bardolabs.ai"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-primary-900/20"
            >
              Get in Touch
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4" style={{ borderTop: '1px solid var(--color-surface-700)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-surface-600">
          <span>ShipOS v0.1.0</span>
          <span>Built by <span className="text-surface-400">Bardo Labs</span></span>
        </div>
      </footer>
    </div>
  );
}
