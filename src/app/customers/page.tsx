'use client';

/* Auth0 routes (/api/auth/*) require full-page redirects — <a> is intentional */
/* eslint-disable @next/next/no-html-link-for-pages */

import Link from 'next/link';
import { MarketingLayout } from '@/components/marketing/marketing-layout';
import {
  Users,
  ArrowRight,
  Quote,
  MapPin,
  TrendingUp,
  Star,
  Package,
  Building2,
} from 'lucide-react';

const customerStories = [
  {
    name: 'PostalPro NYC',
    location: 'New York, NY',
    logo: '📦',
    quote:
      'ShipOS cut our package check-in time by 60%. The barcode scanning and automated notifications are game changers.',
    person: 'Michael R.',
    role: 'Owner',
    stats: { customers: '2,400+', packages: '500/day' },
  },
  {
    name: 'MailBox Express',
    location: 'Austin, TX',
    logo: '📬',
    quote:
      'We switched from spreadsheets to ShipOS and the difference is night and day. Customer management, compliance, shipping — everything in one place.',
    person: 'Sarah K.',
    role: 'Store Manager',
    stats: { customers: '800+', packages: '120/day' },
  },
  {
    name: 'Pacific Postal',
    location: 'San Diego, CA',
    logo: '🏪',
    quote:
      'The self-service kiosk mode alone has saved us 15+ hours per week. Customers love being able to pick up packages on their own.',
    person: 'David L.',
    role: 'Operations Director',
    stats: { customers: '1,200+', packages: '300/day' },
  },
  {
    name: 'Metro Mail Hub',
    location: 'Chicago, IL',
    logo: '🏢',
    quote:
      'CMRA compliance used to be a nightmare. ShipOS tracks Form 1583, ID expirations, and audit logs automatically.',
    person: 'Jennifer M.',
    role: 'Compliance Manager',
    stats: { customers: '3,000+', packages: '800/day' },
  },
];

const metrics = [
  { value: '500+', label: 'Stores on ShipOS', icon: Building2 },
  { value: '2M+', label: 'Packages Processed', icon: Package },
  { value: '99.9%', label: 'Uptime', icon: TrendingUp },
  { value: '4.9/5', label: 'Customer Rating', icon: Star },
];

export default function CustomersMarketingPage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/20">
              <Users className="h-6 w-6 text-primary-500" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-surface-100 mb-4">Trusted by Postal Stores Everywhere</h1>
          <p className="text-lg text-surface-400 max-w-xl mx-auto">
            See how stores like yours use ShipOS to save time, delight customers, and grow revenue.
          </p>
        </div>
      </section>

      {/* Metrics bar */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto glass-card p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {metrics.map((m) => (
              <div key={m.label} className="text-center">
                <m.icon className="h-5 w-5 text-primary-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-surface-100">{m.value}</p>
                <p className="text-xs text-surface-500 mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer stories */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-surface-100 mb-8 text-center">Customer Stories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {customerStories.map((story) => (
              <div key={story.name} className="glass-card p-6 card-hover">
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-800 text-xl">
                    {story.logo}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-surface-100">{story.name}</h3>
                    <p className="text-xs text-surface-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {story.location}
                    </p>
                  </div>
                </div>

                {/* Quote */}
                <div className="relative mb-4">
                  <Quote className="absolute -top-1 -left-1 h-5 w-5 text-primary-500/30" />
                  <p className="text-sm text-surface-300 leading-relaxed pl-5 italic">{story.quote}</p>
                </div>

                {/* Person */}
                <p className="text-xs text-surface-500 mb-4">
                  — <span className="text-surface-300 font-medium">{story.person}</span>, {story.role}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 pt-3 border-t border-surface-800">
                  <div>
                    <p className="text-sm font-bold text-surface-100">{story.stats.customers}</p>
                    <p className="text-[10px] text-surface-500">Customers</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-surface-100">{story.stats.packages}</p>
                    <p className="text-[10px] text-surface-500">Packages</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-surface-100 mb-3">Join Hundreds of Stores</h2>
          <p className="text-sm text-surface-400 mb-6">Start your free trial today and see the difference.</p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="/api/auth/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-base font-semibold transition-colors shadow-lg shadow-primary-900/20"
            >
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </a>
            <Link
              href="/products/shipos"
              className="px-6 py-3 text-surface-300 hover:text-surface-100 rounded-lg text-base font-medium transition-colors border border-surface-700"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
