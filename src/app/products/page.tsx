'use client';

import Link from 'next/link';
import { MarketingLayout } from '@/components/marketing/marketing-layout';
import { Package, ArrowRight, Layers } from 'lucide-react';

export default function ProductsPage() {
  return (
    <MarketingLayout>
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/20">
              <Layers className="h-6 w-6 text-primary-500" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-surface-100 mb-4">Our Products</h1>
          <p className="text-lg text-surface-400 max-w-xl mx-auto">
            Software built specifically for the postal retail industry.
          </p>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <Link href="/products/shipos" className="glass-card p-8 card-hover group block">
            <div className="flex items-start gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-500/10 shrink-0">
                <Package className="h-7 w-7 text-primary-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-surface-100 mb-1 group-hover:text-primary-500 transition-colors">
                  Ship<span className="text-primary-500">OS</span>
                </h2>
                <p className="text-sm text-surface-400 mb-4 leading-relaxed">
                  The all-in-one management platform for postal stores. Package tracking, customer & PMB
                  management, multi-carrier shipping, mail handling, kiosk mode, compliance, and analytics.
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-500 group-hover:text-primary-400 transition-colors">
                  Learn more <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>

          {/* Placeholder for future products */}
          <div className="mt-8 text-center">
            <p className="text-xs text-surface-600">More products coming soon.</p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
