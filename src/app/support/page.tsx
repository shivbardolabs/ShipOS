import {
  Mail,
  ArrowRight,
  MessageSquare,
  Phone,
  HelpCircle,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

export default function SupportPage() {
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
        <div className="max-w-4xl mx-auto">

          {/* Hero */}
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold tracking-widest uppercase text-primary-500 mb-4">
              <HelpCircle className="w-4 h-4" />
              Support
            </span>
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
            <p className="text-lg text-surface-400 max-w-lg mx-auto">
              Reach out through any channel, or browse our self-service
              resources below.
            </p>
          </div>

          {/* ── Support Channels ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-20">
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
                Send us a detailed message and we&rsquo;ll respond within
                24&nbsp;hours.
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
                Chat with our support team in real time. Mon–Fri,
                9&nbsp;am–6&nbsp;pm&nbsp;ET.
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

          {/* ── FAQ ── */}
          <div className="max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-surface-100 text-center mb-10">
              Frequently Asked Questions
            </h2>
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
                <div key={item.q} className="glass-card p-5">
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

          {/* ── Bottom CTA ── */}
          <div
            className="text-center py-12"
            style={{ borderTop: "1px solid var(--color-surface-700)" }}
          >
            <h2 className="text-2xl font-bold text-surface-100 mb-2">
              Still have questions?
            </h2>
            <p className="text-base text-surface-400 mb-8">
              Our team is happy to help with anything.
            </p>
            <a
              href="mailto:hello@bardolabs.ai"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-primary-900/20 hover:-translate-y-0.5"
            >
              Get in Touch
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
