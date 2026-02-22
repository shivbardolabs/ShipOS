'use client';

import {
  Package,
  Users,
  Truck,
  Mail,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { MarketingLayout } from '@/components/marketing/marketing-layout';

export default function Home() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="flex items-center justify-center px-6 py-24 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-extrabold text-surface-100 mb-4">
            Your postal store,{' '}
            <em
              className="brand-italic text-5xl not-italic"
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontStyle: 'italic',
                color: '#4F46E5',
              }}
            >
              fully managed
            </em>
          </h1>
          <p className="text-lg text-surface-400 mb-8 max-w-2xl mx-auto">
            Package tracking, customer management, shipping, and compliance — all in one modern
            platform designed for postal retail.
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
              href="/products/shipos"
              className="px-6 py-3 text-surface-300 hover:text-surface-100 rounded-lg text-base font-medium transition-colors flex items-center gap-2 border border-surface-700"
            >
              <Package className="w-5 h-5" />
              See ShipOS
            </a>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Package,
                title: 'Package Tracking',
                desc: 'Check in, notify, and release packages with full audit trails',
              },
              {
                icon: Users,
                title: 'Customer & PMB',
                desc: 'Manage mailbox rentals, CMRA compliance, and 1583 forms',
              },
              {
                icon: Truck,
                title: 'Shipping Center',
                desc: 'Multi-carrier rate shopping with wholesale pricing',
              },
              {
                icon: Mail,
                title: 'Mail Handling',
                desc: 'Scan, sort, and manage mail with automated notifications',
              },
            ].map((feature) => (
              <div key={feature.title} className="glass-card p-6 text-left card-hover">
                <feature.icon className="w-8 h-8 text-primary-600 mb-3" />
                <h3 className="text-sm font-semibold text-surface-100 mb-1">{feature.title}</h3>
                <p className="text-xs text-surface-500">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Quick stats preview */}
          <div className="mt-12 glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-accent-emerald" />
              <span className="text-sm font-medium text-surface-300">Platform Ready</span>
            </div>
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: 'Package Check-in', value: '✓' },
                { label: 'Customer Mgmt', value: '✓' },
                { label: 'Shipping Center', value: '✓' },
                { label: 'Analytics', value: '✓' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold text-accent-emerald">{stat.value}</p>
                  <p className="text-xs text-surface-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
