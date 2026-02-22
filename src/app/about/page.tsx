'use client';

import Link from 'next/link';
import { MarketingLayout } from '@/components/marketing/marketing-layout';
import {
  Info,
  ArrowRight,
  Target,
  Heart,
  Zap,
  Eye,
  Code2,
  Rocket,
  Globe,
} from 'lucide-react';

const values = [
  {
    icon: Zap,
    title: 'Speed Matters',
    desc: 'Every click, every scan, every interaction should be fast. We obsess over performance because your staff handles hundreds of packages a day.',
  },
  {
    icon: Heart,
    title: 'Built for Real Stores',
    desc: 'We spend time in actual postal stores, watching real workflows. ShipOS is shaped by operators, not just engineers.',
  },
  {
    icon: Eye,
    title: 'Transparency',
    desc: 'Clear pricing, honest communication, and no hidden gotchas. We want to earn your trust through action.',
  },
  {
    icon: Code2,
    title: 'Modern Stack',
    desc: 'Built with best-in-class technology for reliability, security, and a great user experience on any device.',
  },
];

const timeline = [
  { year: '2024', title: 'The Problem', desc: 'Saw that most postal stores still run on paper logs, outdated software, and manual processes.' },
  { year: '2024', title: 'Bardo Labs Founded', desc: 'Started building with a focus on the postal retail vertical — a market underserved by modern software.' },
  { year: '2025', title: 'ShipOS Beta', desc: 'Launched ShipOS with package management, customer tools, and multi-carrier shipping.' },
  { year: '2025', title: 'Growing Fast', desc: 'Onboarding stores across the U.S. Adding new features every week based on operator feedback.' },
];

export default function AboutPage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/20">
              <Info className="h-6 w-6 text-primary-500" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-surface-100 mb-4">About Bardo Labs</h1>
          <p className="text-lg text-surface-400 max-w-xl mx-auto">
            We&apos;re building the operating system for postal retail — modern, fast, and designed by people
            who understand the business.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto glass-card p-8 md:p-12">
          <div className="flex items-start gap-4 md:gap-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/10 shrink-0">
              <Target className="h-6 w-6 text-primary-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-surface-100 mb-3">Our Mission</h2>
              <p className="text-sm text-surface-300 leading-relaxed">
                Postal stores are the backbone of local communities — handling packages, providing mailbox services,
                and helping small businesses ship products worldwide. Yet most still rely on outdated tools
                that slow them down.
              </p>
              <p className="text-sm text-surface-400 leading-relaxed mt-3">
                We&apos;re on a mission to give every postal store the same caliber of software that the largest
                logistics companies use — except simpler, faster, and designed specifically for their workflows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-surface-100 mb-8 text-center">What We Believe</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {values.map((v) => (
              <div key={v.title} className="glass-card p-6 card-hover">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10 mb-4">
                  <v.icon className="h-5 w-5 text-primary-500" />
                </div>
                <h3 className="text-sm font-semibold text-surface-100 mb-2">{v.title}</h3>
                <p className="text-xs text-surface-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-surface-100 mb-8 text-center">Our Journey</h2>
          <div className="relative space-y-6 pl-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-surface-700">
            {timeline.map((item, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-8 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface-800 border border-surface-700">
                  <Rocket className="h-3 w-3 text-primary-500" />
                </div>
                <span className="text-xs text-primary-500 font-medium">{item.year}</span>
                <h3 className="text-sm font-semibold text-surface-100 mt-0.5">{item.title}</h3>
                <p className="text-xs text-surface-500 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team note */}
      <section className="px-6 pb-16">
        <div className="max-w-3xl mx-auto glass-card p-8 text-center">
          <Globe className="h-6 w-6 text-primary-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-surface-100 mb-2">Small Team, Big Ambition</h2>
          <p className="text-sm text-surface-400 max-w-md mx-auto">
            We&apos;re a small, focused team based in the U.S. building software we&apos;re proud of.
            Every feature starts with a real problem from a real store.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-surface-100 mb-3">Want to Learn More?</h2>
          <p className="text-sm text-surface-400 mb-6">Check out ShipOS or reach out to our team.</p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/products/shipos"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-base font-semibold transition-colors shadow-lg shadow-primary-900/20"
            >
              See ShipOS <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/support"
              className="px-6 py-3 text-surface-300 hover:text-surface-100 rounded-lg text-base font-medium transition-colors border border-surface-700"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
