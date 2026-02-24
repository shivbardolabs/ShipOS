/**
 * Terms of Service — Public page
 *
 * Placeholder ToS content. Accessible without authentication.
 * Linked from the public footer and agreement gate.
 */

import Link from 'next/link';
import { PublicFooter } from '@/components/layout/public-footer';

export const metadata = {
  title: 'Terms of Service — ShipOS',
  description: 'ShipOS Terms of Service and acceptable use policy.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-950">
      {/* Header */}
      <header className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-surface-700)' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shipos-logo-mark.svg" alt="ShipOS" width={28} height={28} />
            <span className="text-base font-bold text-surface-100">Ship<span className="text-primary-500">OS</span></span>
          </Link>
          <Link href="/privacy" className="text-sm text-surface-400 hover:text-surface-200 transition-colors">
            Privacy Policy →
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto prose-invert">
          <h1 className="text-3xl font-bold text-surface-100 mb-2">Terms of Service</h1>
          <p className="text-sm text-surface-500 mb-8">Last updated: February 2026</p>

          <div className="space-y-8 text-sm text-surface-300 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using ShipOS (&quot;the Service&quot;), operated by Bardo Labs (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;),
                you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">2. Description of Service</h2>
              <p>
                ShipOS is a postal store management platform that provides package receiving and tracking,
                mail management, shipping services, customer management, and compliance tools for USPS CMRA
                (Commercial Mail Receiving Agency) operations.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">3. User Accounts</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for
                all activities that occur under your account. You must notify us immediately of any unauthorized
                use or security breach. Each user account is personal and non-transferable.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">4. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to any part of the Service</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Upload malicious code or content</li>
                <li>Use the Service to process or store information in violation of applicable privacy laws</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">5. Data and Privacy</h2>
              <p>
                Your use of the Service is also governed by our{' '}
                <Link href="/privacy" className="text-primary-500 hover:text-primary-400 underline">
                  Privacy Policy
                </Link>
                . You retain ownership of all data you input into the Service. We process your data solely
                to provide the Service and as described in our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">6. Service Availability</h2>
              <p>
                We strive to maintain high availability but do not guarantee uninterrupted access. We may
                perform scheduled maintenance with reasonable notice. We are not liable for any downtime or
                data loss resulting from circumstances beyond our reasonable control.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">7. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Bardo Labs shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages, or any loss of profits or revenues,
                whether incurred directly or indirectly.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">8. Termination</h2>
              <p>
                We may suspend or terminate your access to the Service at any time for violation of these
                Terms. Upon termination, your right to use the Service ceases immediately. You may export
                your data prior to termination upon request.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">9. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify you of material
                changes via the Service or email. Continued use after changes constitutes acceptance of
                the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">10. Contact</h2>
              <p>
                For questions about these Terms, contact us at{' '}
                <a href="mailto:legal@bardolabs.ai" className="text-primary-500 hover:text-primary-400 underline">
                  legal@bardolabs.ai
                </a>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
