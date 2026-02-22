'use client';

import { MarketingLayout } from '@/components/marketing/marketing-layout';
import {
  Headphones,
  Mail,
  MessageSquare,
  BookOpen,
  FileText,
  Clock,
  ArrowRight,
  HelpCircle,
  Video,
  Zap,
} from 'lucide-react';

const supportChannels = [
  {
    icon: MessageSquare,
    title: 'Live Chat',
    desc: 'Chat with our support team in real time. Available Monday–Friday, 9am–6pm ET.',
    action: 'Start Chat',
    href: '#',
  },
  {
    icon: Mail,
    title: 'Email Support',
    desc: 'Send us a detailed message and we\'ll respond within 24 hours.',
    action: 'Email Us',
    href: 'mailto:support@bardolabs.ai',
  },
  {
    icon: Headphones,
    title: 'Phone Support',
    desc: 'Talk to a human. Available for Pro and Enterprise plans.',
    action: 'Call Now',
    href: 'tel:+18005550100',
  },
];

const resources = [
  {
    icon: BookOpen,
    title: 'Documentation',
    desc: 'Comprehensive guides for every ShipOS feature',
    href: '#',
  },
  {
    icon: Video,
    title: 'Video Tutorials',
    desc: 'Step-by-step walkthroughs for common workflows',
    href: '#',
  },
  {
    icon: HelpCircle,
    title: 'FAQ',
    desc: 'Quick answers to the most common questions',
    href: '#',
  },
  {
    icon: FileText,
    title: 'Release Notes',
    desc: 'See what\'s new in every ShipOS update',
    href: '#',
  },
];

const faqs = [
  {
    q: 'How do I import my existing customers?',
    a: 'Go to Customers → Add Customer → Bulk Import (CSV). Upload a CSV file and we\'ll auto-map your columns.',
  },
  {
    q: 'Which carriers does ShipOS support?',
    a: 'UPS, FedEx, USPS, DHL, Amazon, LaserShip, OnTrac, and more. We\'re always adding new carriers.',
  },
  {
    q: 'Can I use ShipOS on a tablet?',
    a: 'Yes! ShipOS is fully responsive and works great on tablets and mobile devices. The Kiosk mode is specifically designed for touchscreens.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes — every new account gets a 14-day free trial with full access to all features. No credit card required.',
  },
];

export default function SupportPage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/20">
              <Headphones className="h-6 w-6 text-primary-500" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-surface-100 mb-4">Support</h1>
          <p className="text-lg text-surface-400 max-w-xl mx-auto">
            We&apos;re here to help. Reach out through any channel, or browse our resources below.
          </p>
        </div>
      </section>

      {/* Support channels */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {supportChannels.map((ch) => (
            <a key={ch.title} href={ch.href} className="glass-card p-6 card-hover group block">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-500/10 mb-4">
                <ch.icon className="h-5 w-5 text-primary-500" />
              </div>
              <h3 className="text-base font-semibold text-surface-100 mb-2">{ch.title}</h3>
              <p className="text-xs text-surface-500 mb-4 leading-relaxed">{ch.desc}</p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-500 group-hover:text-primary-400 transition-colors">
                {ch.action} <ArrowRight className="h-4 w-4" />
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Response time badge */}
      <section className="px-6 pb-16">
        <div className="max-w-3xl mx-auto glass-card p-6 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-emerald/10 shrink-0">
            <Clock className="h-5 w-5 text-accent-emerald" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-surface-100">Fast Response Times</h3>
            <p className="text-xs text-surface-500">
              Live chat: under 5 min · Email: within 24 hours · Critical issues: 1 hour SLA for Enterprise
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10 shrink-0 ml-auto">
            <Zap className="h-5 w-5 text-primary-500" />
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-surface-100 mb-6 text-center">Self-Service Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {resources.map((r) => (
              <a key={r.title} href={r.href} className="glass-card p-5 card-hover group block">
                <r.icon className="h-5 w-5 text-primary-500 mb-3" />
                <h3 className="text-sm font-semibold text-surface-100 mb-1">{r.title}</h3>
                <p className="text-xs text-surface-500">{r.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-surface-100 mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div key={faq.q} className="glass-card p-5">
                <h3 className="text-sm font-semibold text-surface-100 mb-2">{faq.q}</h3>
                <p className="text-xs text-surface-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
