"use client";

import { useState } from "react";
import {
  Mail,
  MessageSquare,
  Phone,
  ArrowRight,
  LogIn,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from "lucide-react";

/* Auth0 routes require full-page redirects — <a> is intentional */
/* eslint-disable @next/next/no-html-link-for-pages */

/* ── Support channels ────────────────────────────────── */
const channels = [
  {
    icon: Mail,
    title: "Email Support",
    description:
      "Send us a detailed message and we\u2019ll respond within 24 hours.",
    href: "mailto:support@bardolabs.ai",
    cta: "Email us",
  },
  {
    icon: MessageSquare,
    title: "Live Chat",
    description:
      "Chat with our support team in real time. Mon\u2013Fri, 9\u202Fam\u20136\u202Fpm\u00A0ET.",
    href: "#",
    cta: "Start chat",
  },
  {
    icon: Phone,
    title: "Phone Support",
    description:
      "Talk to a human. Available for Pro and Enterprise plans.",
    href: "tel:+18005550100",
    cta: "Call now",
  },
];

/* ── FAQ data ────────────────────────────────────────── */
const faqs = [
  {
    q: "How do I import my existing customers?",
    a: "Go to Customers \u2192 Add Customer \u2192 Bulk Import (CSV). Upload a CSV file and we\u2019ll auto-map your columns.",
  },
  {
    q: "Which carriers does ShipOS support?",
    a: "UPS, FedEx, USPS, DHL, Amazon, LaserShip, OnTrac, and more. We\u2019re always adding new carriers.",
  },
  {
    q: "Can I use ShipOS on a tablet?",
    a: "Yes! ShipOS is fully responsive and works great on tablets and mobile devices. The Kiosk mode is specifically designed for touchscreens.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes \u2014 every new account gets a 14-day free trial with full access to all features. No credit card required.",
  },
];

/* ════════════════════════════════════════════════════════
   SUPPORT PAGE
   ════════════════════════════════════════════════════════ */
export default function SupportPage() {
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
                <span className="text-xl font-bold text-surface-100">
                  Ship
                </span>
                <span className="text-xl font-bold text-primary-500">OS</span>
              </div>
              <p className="text-xs text-surface-500">by Bardo Labs</p>
            </div>
          </a>
          <div className="flex items-center gap-3">
            <a
              href="/pricing"
              className="px-4 py-2 text-surface-300 hover:text-surface-100 rounded-lg text-sm font-medium transition-colors"
            >
              Pricing
            </a>
            <a
              href="/support"
              className="px-4 py-2 text-surface-100 rounded-lg text-sm font-medium transition-colors"
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
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <p className="text-xs font-mono font-semibold tracking-widest uppercase text-primary-500 mb-4">
              Support
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-surface-100 mb-4">
              We&rsquo;re here to{" "}
              <em
                className="not-italic"
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontStyle: "italic",
                  color: "var(--color-primary-600)",
                }}
              >
                help
              </em>
            </h1>
            <p className="text-lg text-surface-400 max-w-xl mx-auto">
              Reach out through any channel, or browse our self-service
              resources below.
            </p>
          </div>

          {/* ── Support Channels ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-24">
            {channels.map((ch) => (
              <a
                key={ch.title}
                href={ch.href}
                className="glass-card p-8 text-left card-hover group block"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-600/10 flex items-center justify-center mb-5">
                  <ch.icon className="w-6 h-6 text-primary-500" />
                </div>
                <h3 className="text-lg font-bold text-surface-100 mb-2">
                  {ch.title}
                </h3>
                <p className="text-sm text-surface-500 mb-6 leading-relaxed">
                  {ch.description}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-500 group-hover:text-primary-400 transition-colors">
                  {ch.cta}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </a>
            ))}
          </div>

          {/* ── FAQ ── */}
          <div className="mb-24 max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <HelpCircle className="w-5 h-5 text-primary-500" />
              <p className="text-xs font-mono font-semibold tracking-widest uppercase text-primary-500">
                FAQ
              </p>
            </div>
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
              Still have{" "}
              <em
                className="not-italic"
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontStyle: "italic",
                  color: "var(--color-primary-600)",
                }}
              >
                questions?
              </em>
            </h2>
            <p className="text-lg text-surface-400 mb-8 max-w-lg mx-auto">
              Our team is happy to help with anything.
            </p>
            <a
              href="mailto:hello@bardolabs.ai"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-base font-semibold transition-all shadow-lg shadow-primary-900/20 hover:-translate-y-0.5"
            >
              Get in Touch
              <ArrowRight className="w-5 h-5" />
            </a>
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
