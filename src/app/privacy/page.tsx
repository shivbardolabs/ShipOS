/**
 * Privacy Policy — Public page
 *
 * Comprehensive Privacy Policy for ShipOS Pro (CMRA/mail management SaaS).
 * Tries loading dynamic content from the database first (LegalDocument),
 * falls back to the static content below if DB is unavailable.
 */

import Link from 'next/link';
import { PublicFooter } from '@/components/layout/public-footer';
import prisma from '@/lib/prisma';

export const metadata = {
  title: 'Privacy Policy — ShipOS',
  description: 'ShipOS Privacy Policy — how we collect, use, and protect your data.',
};

/* ── Try loading from DB ─────────────────────────────────────────────────── */
async function getPrivacyContent(): Promise<{ html: string | null; version: number | null; publishedAt: string | null }> {
  try {
    const doc = await prisma.legalDocument.findFirst({
      where: { type: 'privacy', isActive: true },
      orderBy: { version: 'desc' },
      select: { content: true, version: true, publishedAt: true },
    });
    if (doc) {
      return {
        html: doc.content,
        version: doc.version,
        publishedAt: doc.publishedAt.toISOString(),
      };
    }
  } catch {
    // DB unavailable — fall back to static content
  }
  return { html: null, version: null, publishedAt: null };
}

export default async function PrivacyPage() {
  const dbContent = await getPrivacyContent();

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
          <p className="text-sm text-surface-500 mb-8">
            Last updated: February 2026
            {dbContent.version && (
              <span className="ml-2 text-surface-600">· Version {dbContent.version}</span>
            )}
          </p>

          {/* Dynamic content from DB, or static fallback */}
          {dbContent.html ? (
            <div
              className="space-y-6 text-sm text-surface-300 leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-surface-200 [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mt-2 [&_ul]:space-y-1 [&_a]:text-primary-500 [&_a]:underline [&_strong]:text-surface-200"
              dangerouslySetInnerHTML={{ __html: dbContent.html }}
            />
          ) : (
            <StaticPrivacyContent />
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

/* ── Static fallback content ─────────────────────────────────────────────── */
function StaticPrivacyContent() {
  return (
    <div className="space-y-8 text-sm text-surface-300 leading-relaxed">
      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">1. Introduction</h2>
        <p>
          This Privacy Policy describes how Bardo Labs Inc. (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)
          collects, uses, stores, and protects your personal information when you use ShipOS Pro
          (&quot;the Service&quot;). By using the Service, you consent to the data practices described in this
          policy.
        </p>
        <p className="mt-2">
          We are committed to protecting the privacy and security of your data. This policy applies
          to all users of the Service, including CMRA operators (store owners), their employees,
          and their end customers whose data is processed through the platform.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">2. Information We Collect</h2>

        <p className="font-medium text-surface-200 mt-4">2.1 Account Information</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Full name, email address, and authentication credentials (managed via Auth0)</li>
          <li>User role and organizational information</li>
          <li>Profile picture (if provided through your identity provider)</li>
          <li>Login timestamps, session history, and device information</li>
        </ul>

        <p className="font-medium text-surface-200 mt-4">2.2 Business and Operational Data</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Store details: name, address, phone, business hours, tax information</li>
          <li>Customer records: names, addresses, phone numbers, email, PMB assignments</li>
          <li>Package data: tracking numbers, carrier info, dimensions, weight, photos, storage location</li>
          <li>Mail records: sender/recipient info, mail type, scan images, forwarding instructions</li>
          <li>Shipping labels: origin/destination addresses, declared values, service selections</li>
          <li>Transaction data: invoices, payments, subscription billing, storage fees</li>
        </ul>

        <p className="font-medium text-surface-200 mt-4">2.3 CMRA Compliance Data</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>PS Form 1583 records and signatures</li>
          <li>Government-issued identification documents (driver&apos;s license, passport) for customer verification</li>
          <li>ID verification dates and expiration tracking</li>
          <li>Compliance audit records and timestamps</li>
        </ul>

        <p className="font-medium text-surface-200 mt-4">2.4 Usage and Technical Data</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Feature usage patterns and interaction data (via PostHog analytics)</li>
          <li>Browser type, operating system, IP address, and device identifiers</li>
          <li>Error logs and performance metrics</li>
          <li>AI feature interactions (smart intake, mail sort, bill audit queries)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">3. How We Use Your Information</h2>
        <p>We use collected information for the following purposes:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong className="text-surface-200">Service Delivery:</strong> Operating the platform, processing packages and mail, generating shipping labels, managing customer accounts</li>
          <li><strong className="text-surface-200">Notifications:</strong> Sending package arrival alerts, pickup reminders, renewal notices, and billing confirmations via email (Resend) and SMS (Twilio)</li>
          <li><strong className="text-surface-200">Compliance:</strong> Maintaining USPS CMRA records, generating compliance reports, tracking ID verification status</li>
          <li><strong className="text-surface-200">AI Features:</strong> Powering smart intake (carrier detection), AI mail sorting, bill audit analysis, and customer onboarding document scanning</li>
          <li><strong className="text-surface-200">Analytics:</strong> Understanding feature usage to improve the Service, identifying performance issues, and generating business reports</li>
          <li><strong className="text-surface-200">Billing:</strong> Processing subscription payments via Stripe, generating invoices, managing account status</li>
          <li><strong className="text-surface-200">Security:</strong> Detecting unauthorized access, preventing fraud, and maintaining audit trails</li>
          <li><strong className="text-surface-200">Communication:</strong> Responding to support inquiries, sending product updates, and service announcements</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">4. Data Sharing and Third-Party Services</h2>
        <p>
          We do not sell your personal data. We share data with the following categories of third parties
          solely to operate the Service:
        </p>

        <p className="font-medium text-surface-200 mt-4">4.1 Infrastructure and Service Providers</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong className="text-surface-200">Auth0:</strong> Authentication and identity management</li>
          <li><strong className="text-surface-200">Vercel:</strong> Application hosting and serverless infrastructure</li>
          <li><strong className="text-surface-200">Neon (PostgreSQL):</strong> Database hosting and storage</li>
          <li><strong className="text-surface-200">Stripe:</strong> Payment processing and subscription billing</li>
        </ul>

        <p className="font-medium text-surface-200 mt-4">4.2 Communication Providers</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong className="text-surface-200">Resend:</strong> Transactional email delivery (notifications, invoices, alerts)</li>
          <li><strong className="text-surface-200">Twilio:</strong> SMS notifications for package arrivals and customer communications</li>
        </ul>

        <p className="font-medium text-surface-200 mt-4">4.3 Analytics and AI</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong className="text-surface-200">PostHog:</strong> Product analytics and feature usage tracking</li>
          <li><strong className="text-surface-200">OpenAI:</strong> AI-powered features (smart intake, mail sorting, document scanning)</li>
        </ul>

        <p className="font-medium text-surface-200 mt-4">4.4 Shipping Carriers</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Carrier APIs (USPS, UPS, FedEx, DHL) receive only the data necessary to create shipping labels and track packages</li>
        </ul>

        <p className="font-medium text-surface-200 mt-4">4.5 Legal and Regulatory</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>USPS: CMRA compliance data as required by federal postal regulations</li>
          <li>Law enforcement: When required by valid legal process (subpoena, court order, or government request)</li>
          <li>Business transfers: In connection with a merger, acquisition, or sale of assets (with notice to affected users)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">5. Data Security</h2>
        <p>We implement industry-standard security measures to protect your data:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong className="text-surface-200">Encryption in Transit:</strong> All data transmitted between your browser and our servers is encrypted using TLS 1.2+</li>
          <li><strong className="text-surface-200">Encryption at Rest:</strong> Sensitive PII fields (SSN, ID numbers, home addresses) are encrypted using AES-256-GCM</li>
          <li><strong className="text-surface-200">Authentication:</strong> Enterprise-grade authentication via Auth0 with support for MFA enrollment</li>
          <li><strong className="text-surface-200">Access Control:</strong> Role-based access control (RBAC) with superadmin, admin, manager, and employee roles</li>
          <li><strong className="text-surface-200">Audit Logging:</strong> Comprehensive activity logs tracking all data modifications with before/after snapshots</li>
          <li><strong className="text-surface-200">Session Management:</strong> Secure session handling with timeout warnings and login attempt tracking</li>
          <li><strong className="text-surface-200">Infrastructure:</strong> Hosted on Vercel&apos;s SOC 2 Type II certified infrastructure with Neon&apos;s managed PostgreSQL</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">6. Data Retention</h2>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong className="text-surface-200">Active Accounts:</strong> Data is retained for as long as your account is active and the subscription is current</li>
          <li><strong className="text-surface-200">Deleted Accounts:</strong> A 30-day soft-delete period applies, after which data may be permanently removed</li>
          <li><strong className="text-surface-200">CMRA Records:</strong> Compliance records (PS Form 1583, ID verifications) are retained for the periods required by USPS regulations, which may extend beyond account termination</li>
          <li><strong className="text-surface-200">Audit Logs:</strong> Activity and audit logs are retained for a minimum of 2 years for compliance and security purposes</li>
          <li><strong className="text-surface-200">Backups:</strong> Database backups are retained for 30 days and automatically purged</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">7. Your Rights</h2>
        <p>Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong className="text-surface-200">Access:</strong> Request a copy of the personal data we hold about you</li>
          <li><strong className="text-surface-200">Correction:</strong> Request correction of inaccurate or incomplete data</li>
          <li><strong className="text-surface-200">Deletion:</strong> Request deletion of your personal data (subject to legal retention requirements)</li>
          <li><strong className="text-surface-200">Portability:</strong> Request your data in a standard, machine-readable format (CSV/JSON export)</li>
          <li><strong className="text-surface-200">Restriction:</strong> Request restriction of processing in certain circumstances</li>
          <li><strong className="text-surface-200">Objection:</strong> Object to processing based on legitimate interests</li>
          <li><strong className="text-surface-200">Opt-Out:</strong> Opt out of non-essential communications and marketing</li>
        </ul>
        <p className="mt-2">
          To exercise these rights, contact us at{' '}
          <a href="mailto:privacy@bardolabs.ai" className="text-primary-500 hover:text-primary-400 underline">
            privacy@bardolabs.ai
          </a>. We will respond within 30 days.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">8. Cookies and Tracking Technologies</h2>
        <p>We use the following types of cookies and tracking technologies:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong className="text-surface-200">Essential Cookies:</strong> Required for authentication, session management, and security. Cannot be disabled.</li>
          <li><strong className="text-surface-200">Analytics Cookies:</strong> PostHog analytics cookies to understand feature usage and improve the Service. Can be disabled in browser settings.</li>
          <li><strong className="text-surface-200">Preference Cookies:</strong> Store your UI preferences such as theme, sidebar state, and notification settings.</li>
        </ul>
        <p className="mt-2">
          We do not use advertising cookies or sell data to ad networks. You can manage cookie
          preferences through your browser settings. Disabling essential cookies will prevent you
          from using the Service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">9. Children&apos;s Privacy</h2>
        <p>
          ShipOS Pro is a business-to-business service not directed at individuals under 13 years of
          age. We do not knowingly collect personal information from children under 13. If we become
          aware that we have inadvertently collected such information, we will delete it promptly.
          If you believe a child under 13 has provided personal information to us, please contact us
          at privacy@bardolabs.ai.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">10. International Data Transfers</h2>
        <p>
          Your data is primarily stored and processed in the United States. If you access the Service
          from outside the US, your data will be transferred to and processed in the US. By using the
          Service, you consent to such transfers. We ensure appropriate safeguards are in place for
          any cross-border data transfers.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">11. California Privacy Rights (CCPA)</h2>
        <p>
          If you are a California resident, you have additional rights under the California Consumer
          Privacy Act (CCPA):
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Right to know what personal information we collect and how it is used</li>
          <li>Right to request deletion of your personal information</li>
          <li>Right to opt out of the &quot;sale&quot; of personal information (we do not sell personal data)</li>
          <li>Right to non-discrimination for exercising your privacy rights</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">12. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy periodically to reflect changes in our practices or
          applicable law. Material changes will be communicated through the Service (via the agreement
          gate requiring re-acceptance), email notification, or both. The &quot;Last updated&quot; date at the
          top indicates the most recent revision.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">13. Contact Us</h2>
        <p>
          For privacy-related questions, data requests, or to exercise your rights, contact us at:
        </p>
        <p className="mt-2 text-surface-500">
          Bardo Labs Inc.<br />
          Privacy Team<br />
          Email:{' '}
          <a href="mailto:privacy@bardolabs.ai" className="text-primary-500 hover:text-primary-400 underline">
            privacy@bardolabs.ai
          </a>
        </p>
        <p className="mt-2">
          For general service inquiries:{' '}
          <a href="mailto:support@bardolabs.ai" className="text-primary-500 hover:text-primary-400 underline">
            support@bardolabs.ai
          </a>
        </p>
      </section>
    </div>
  );
}
