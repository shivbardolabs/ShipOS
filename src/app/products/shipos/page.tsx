'use client';

import Link from 'next/link';
import { MarketingLayout } from '@/components/marketing/marketing-layout';
import {
  Package,
  Users,
  Truck,
  Mail,
  BarChart3,
  Shield,
  Bell,
  ScanLine,
  ArrowRight,
  CheckCircle2,
  Monitor,
} from 'lucide-react';

const features = [
  {
    icon: Package,
    title: 'Package Check-in & Check-out',
    desc: 'Scan, log, and release packages with full audit trail. Barcode scanning, photo capture, and automated customer notifications.',
  },
  {
    icon: Users,
    title: 'Customer & PMB Management',
    desc: 'Complete mailbox rental management with Form 1583, ID tracking, expiration alerts, and multi-platform support (iPostal, Anytime, PostScan).',
  },
  {
    icon: Truck,
    title: 'Shipping Center',
    desc: 'Multi-carrier rate shopping across UPS, FedEx, USPS, DHL, and more. Wholesale pricing, label generation, and tracking.',
  },
  {
    icon: Mail,
    title: 'Mail Handling',
    desc: 'Scan, sort, and forward mail. Automated notifications when mail arrives. Batch processing for high-volume stores.',
  },
  {
    icon: ScanLine,
    title: 'Self-Service Kiosk',
    desc: 'Customer-facing kiosk mode for package pickup. Customers enter their PMB, verify identity, and collect packages.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reporting',
    desc: 'Real-time dashboards with package volume trends, revenue tracking, carrier performance, and customer analytics.',
  },
  {
    icon: Bell,
    title: 'Automated Notifications',
    desc: 'Email and SMS alerts for package arrivals, mail notifications, ID expirations, and billing reminders.',
  },
  {
    icon: Shield,
    title: 'CMRA Compliance',
    desc: 'Built-in compliance tools for Commercial Mail Receiving Agency regulations. Form 1583 management, ID verification, and audit logs.',
  },
];

const highlights = [
  'Real-time package tracking with carrier logos',
  'Customer photo ID for quick identification',
  'Drag & drop bulk customer import (CSV)',
  'Multi-carrier shipping label generation',
  'End-of-day reconciliation reports',
  'Dark mode & responsive mobile design',
];

export default function ShipOSProductPage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/20">
              <Package className="h-6 w-6 text-primary-500" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-surface-100 mb-4">
            Ship<span className="text-primary-500">OS</span>
          </h1>
          <p className="text-xl text-surface-400 max-w-2xl mx-auto mb-8">
            The all-in-one management platform for postal stores, mailbox rental businesses, and
            shipping centers.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="/api/auth/signup"
              className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-base font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-primary-900/20"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </a>
            <Link
              href="/dashboard"
              className="px-6 py-3 text-surface-300 hover:text-surface-100 rounded-lg text-base font-medium transition-colors flex items-center gap-2 border border-surface-700 hover:border-surface-600"
            >
              <Monitor className="w-5 h-5" />
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-surface-100 mb-2">Everything Your Store Needs</h2>
            <p className="text-sm text-surface-400">All the tools to run a modern postal retail operation</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => (
              <div key={f.title} className="glass-card p-6 card-hover">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10 mb-4">
                  <f.icon className="h-5 w-5 text-primary-500" />
                </div>
                <h3 className="text-sm font-semibold text-surface-100 mb-2">{f.title}</h3>
                <p className="text-xs text-surface-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto glass-card p-8 md:p-12">
          <h2 className="text-xl font-bold text-surface-100 mb-6">What Sets ShipOS Apart</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {highlights.map((h) => (
              <div key={h} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-accent-emerald shrink-0" />
                <span className="text-sm text-surface-300">{h}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-surface-100 mb-3">Ready to Modernize Your Store?</h2>
          <p className="text-sm text-surface-400 mb-6">Get started in minutes. No credit card required.</p>
          <a
            href="/api/auth/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-base font-semibold transition-colors shadow-lg shadow-primary-900/20"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>
    </MarketingLayout>
  );
}
