/**
 * Privacy Policy — Public page
 *
 * Placeholder Privacy Policy content. Accessible without authentication.
 * Linked from the public footer and agreement gate.
 */

import Link from 'next/link';
import { PublicFooter } from '@/components/layout/public-footer';

export const metadata = {
  title: 'Privacy Policy — ShipOS',
  description: 'ShipOS Privacy Policy — how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
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
          <Link href="/terms" className="text-sm text-surface-400 hover:text-surface-200 transition-colors">
            ← Terms of Service
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto prose-invert">
          <h1 className="text-3xl font-bold text-surface-100 mb-2">Privacy Policy</h1>
          <p className="text-sm text-surface-500 mb-8">Last updated: February 2026</p>

          <div className="space-y-8 text-sm text-surface-300 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">1. Information We Collect</h2>
              <p>We collect the following types of information when you use ShipOS:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong className="text-surface-200">Account Information:</strong> Name, email address, and authentication credentials via Auth0</li>
                <li><strong className="text-surface-200">Business Data:</strong> Store details, customer records, package tracking information, and transaction data you enter</li>
                <li><strong className="text-surface-200">Usage Data:</strong> Login timestamps, feature usage patterns, and session information</li>
                <li><strong className="text-surface-200">Device Information:</strong> Browser type, IP address, and device identifiers for security purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">2. How We Use Your Information</h2>
              <p>We use collected information to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Provide, maintain, and improve the ShipOS platform</li>
                <li>Process and track packages, mail, and shipments</li>
                <li>Send notifications you have configured (email, SMS)</li>
                <li>Ensure USPS CMRA compliance for your operations</li>
                <li>Generate reports and analytics for your business</li>
                <li>Protect against fraud and unauthorized access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">3. Data Storage and Security</h2>
              <p>
                Your data is stored securely using industry-standard encryption. We use PostgreSQL databases
                hosted on Vercel&apos;s infrastructure with Neon. All data in transit is encrypted via TLS.
                Authentication is managed through Auth0 with enterprise-grade security controls.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">4. Data Sharing</h2>
              <p>
                We do not sell your personal data. We may share data with:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong className="text-surface-200">Service Providers:</strong> Auth0 (authentication), Vercel (hosting), and other infrastructure providers</li>
                <li><strong className="text-surface-200">Legal Requirements:</strong> When required by law, subpoena, or government request</li>
                <li><strong className="text-surface-200">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">5. Data Retention</h2>
              <p>
                We retain your data for as long as your account is active or as needed to provide the Service.
                Deleted accounts undergo a soft-delete period of 30 days, after which data may be permanently
                removed. Audit logs are retained for compliance purposes as required by USPS CMRA regulations.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Access your personal data stored in ShipOS</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data (subject to legal retention requirements)</li>
                <li>Export your data in a standard format</li>
                <li>Opt out of non-essential communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">7. Cookies and Analytics</h2>
              <p>
                We use PostHog for product analytics to improve the Service. We use essential cookies for
                authentication and session management. You can disable non-essential cookies through your
                browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">8. Children&apos;s Privacy</h2>
              <p>
                ShipOS is not directed at children under 13. We do not knowingly collect personal information
                from children. If we become aware of such collection, we will delete the information promptly.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy periodically. We will notify you of material changes via the
                Service or email. The &quot;Last updated&quot; date at the top indicates the most recent revision.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">10. Contact Us</h2>
              <p>
                For privacy-related questions or to exercise your rights, contact us at{' '}
                <a href="mailto:privacy@bardolabs.ai" className="text-primary-500 hover:text-primary-400 underline">
                  privacy@bardolabs.ai
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
