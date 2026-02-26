/**
 * Terms of Service — Public page
 *
 * Comprehensive Terms & Conditions for ShipOS Pro (CMRA/mail management SaaS).
 * Tries loading dynamic content from the database first (LegalDocument),
 * falls back to the static content below if DB is unavailable.
 */

import Link from 'next/link';
import { PublicFooter } from '@/components/layout/public-footer';
import prisma from '@/lib/prisma';

export const metadata = {
  title: 'Terms of Service — ShipOS',
  description: 'ShipOS Terms of Service — governing use of our CMRA and postal management platform.',
};

/* ── Try loading from DB ─────────────────────────────────────────────────── */
async function getTermsContent(): Promise<{ html: string | null; version: number | null; publishedAt: string | null }> {
  try {
    const doc = await prisma.legalDocument.findFirst({
      where: { type: 'terms', isActive: true },
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

export default async function TermsPage() {
  const dbContent = await getTermsContent();

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
            <StaticTermsContent />
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

/* ── Static fallback content ─────────────────────────────────────────────── */
function StaticTermsContent() {
  return (
    <div className="space-y-8 text-sm text-surface-300 leading-relaxed">
      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">1. Acceptance of Terms</h2>
        <p>
          By accessing or using ShipOS Pro (&quot;the Service&quot;), a product operated by Bardo Labs Inc.
          (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you (&quot;User&quot;, &quot;you&quot;, or &quot;your&quot;) agree to be
          bound by these Terms of Service (&quot;Terms&quot;). If you are accepting these Terms on behalf of a
          business entity, you represent that you have the authority to bind that entity.
        </p>
        <p className="mt-2">
          If you do not agree to these Terms, you must not access or use the Service. Continued use of
          the Service after any modifications to these Terms constitutes acceptance of those changes.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">2. Description of Service</h2>
        <p>
          ShipOS Pro is a cloud-based postal store management platform designed for Commercial Mail
          Receiving Agency (CMRA) operators and mailbox service providers. The Service includes:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Package receiving, tracking, storage, and release management</li>
          <li>Mail receiving, scanning, sorting, and forwarding services</li>
          <li>Customer and Private Mailbox (PMB) management</li>
          <li>Outbound shipping label creation and carrier rate comparison</li>
          <li>USPS CMRA compliance tracking including PS Form 1583 management</li>
          <li>Customer notification services (email and SMS)</li>
          <li>Invoicing, billing, and subscription management</li>
          <li>Business analytics and reporting dashboards</li>
          <li>AI-powered features including smart intake, mail sorting, and bill audit</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">3. Account Registration and Responsibilities</h2>
        <p>
          To use the Service, you must create an account and provide accurate, complete information.
          You are responsible for:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Maintaining the confidentiality of your account credentials</li>
          <li>All activities that occur under your account</li>
          <li>Notifying us immediately of any unauthorized access or security breach</li>
          <li>Ensuring that all users within your organization comply with these Terms</li>
        </ul>
        <p className="mt-2">
          Each user account is personal and non-transferable. You may not share login credentials
          or allow multiple individuals to use a single account. Administrator accounts carry
          additional responsibilities for managing team access and permissions.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">4. USPS CMRA Compliance</h2>
        <p>
          If you operate a Commercial Mail Receiving Agency (CMRA), you acknowledge that:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>You are responsible for maintaining USPS CMRA compliance in your jurisdiction</li>
          <li>You must collect and verify PS Form 1583 from each mail-receiving customer</li>
          <li>You must verify two forms of valid identification as required by USPS regulations</li>
          <li>You are responsible for retaining compliance records for the periods required by USPS</li>
          <li>The Service provides tools to assist with compliance but does not guarantee regulatory compliance</li>
          <li>You must immediately report to USPS any suspicious mail or packages as required by law</li>
        </ul>
        <p className="mt-2">
          ShipOS Pro is a tool to help manage your CMRA operations. Ultimate responsibility for
          USPS regulatory compliance rests with you as the CMRA operator.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">5. Payment Terms and Fees</h2>
        <p>
          Access to ShipOS Pro requires a paid subscription. By subscribing, you agree to:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Pay all applicable subscription fees as specified in your chosen plan</li>
          <li>Provide valid, current payment information and authorize recurring charges</li>
          <li>Pay any applicable taxes, duties, or government-imposed fees</li>
        </ul>
        <p className="mt-2">
          <strong className="text-surface-200">Billing Cycle:</strong> Subscriptions are billed monthly
          or annually in advance based on your plan selection. All fees are non-refundable except where
          required by applicable law.
        </p>
        <p className="mt-2">
          <strong className="text-surface-200">Price Changes:</strong> We may adjust pricing with 30 days&apos;
          written notice. Continued use after a price change takes effect constitutes acceptance of the
          new price.
        </p>
        <p className="mt-2">
          <strong className="text-surface-200">Overdue Payments:</strong> Accounts with overdue payments
          may be suspended. We reserve the right to charge interest on overdue amounts at the lesser of
          1.5% per month or the maximum rate permitted by law.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">6. Storage Fees and Package Policies</h2>
        <p>
          Packages stored through the Service may be subject to storage fees as configured by the CMRA
          operator. The following policies apply:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Storage grace periods and daily rates are set by the individual CMRA operator</li>
          <li>Unclaimed packages may be returned to sender or disposed of per the operator&apos;s policy and applicable law</li>
          <li>The Company is not liable for packages stored at CMRA locations</li>
          <li>Insurance and declared value limitations apply as specified by the relevant shipping carrier</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">7. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Use the Service for any unlawful purpose or in violation of any applicable regulations</li>
          <li>Attempt to gain unauthorized access to any part of the Service or its infrastructure</li>
          <li>Interfere with, disrupt, or place an unreasonable load on the Service</li>
          <li>Upload malicious code, viruses, or harmful content</li>
          <li>Use the Service to process contraband, hazardous materials, or prohibited items</li>
          <li>Reverse engineer, decompile, or attempt to extract the source code of the Service</li>
          <li>Use automated scripts, bots, or scrapers to access the Service without permission</li>
          <li>Resell, sublicense, or redistribute the Service without written authorization</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">8. Data Ownership and Privacy</h2>
        <p>
          You retain full ownership of all data you input into the Service (&quot;Your Data&quot;). We process
          Your Data solely to provide the Service as described in our{' '}
          <Link href="/privacy" className="text-primary-500 hover:text-primary-400 underline">
            Privacy Policy
          </Link>.
        </p>
        <p className="mt-2">
          You grant us a limited, non-exclusive license to use, process, and store Your Data solely
          for the purpose of operating and improving the Service. We will not sell Your Data to third
          parties. Upon termination, you may request export of Your Data within 30 days.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">9. Service Availability and Support</h2>
        <p>
          We strive to maintain 99.9% uptime for the Service but do not guarantee uninterrupted access.
          Scheduled maintenance will be communicated in advance when possible. We are not liable for
          downtime or data loss resulting from:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Circumstances beyond our reasonable control (force majeure)</li>
          <li>Scheduled or emergency maintenance</li>
          <li>Third-party service outages (hosting, authentication, payment providers)</li>
          <li>Your internet connectivity or local infrastructure issues</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">10. Intellectual Property</h2>
        <p>
          The Service, including its design, code, features, documentation, and branding, is the
          intellectual property of Bardo Labs Inc. and is protected by copyright, trademark, and other
          laws. Your subscription grants you a limited, non-exclusive, non-transferable right to use
          the Service during the subscription term.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">11. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, BARDO LABS INC. SHALL NOT BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT
          LIMITED TO LOSS OF PROFITS, REVENUE, DATA, OR BUSINESS OPPORTUNITIES, WHETHER INCURRED
          DIRECTLY OR INDIRECTLY, REGARDLESS OF WHETHER WE HAVE BEEN ADVISED OF THE POSSIBILITY
          OF SUCH DAMAGES.
        </p>
        <p className="mt-2">
          OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING FROM OR RELATED TO THE SERVICE
          SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">12. Indemnification</h2>
        <p>
          You agree to indemnify, defend, and hold harmless Bardo Labs Inc., its officers, directors,
          employees, and agents from and against any claims, liabilities, damages, losses, and expenses
          (including reasonable attorneys&apos; fees) arising from:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Your use of the Service or violation of these Terms</li>
          <li>Your violation of any applicable law or regulation, including USPS CMRA requirements</li>
          <li>Any dispute between you and your customers or end users</li>
          <li>Any claims by third parties related to data you process through the Service</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">13. Termination</h2>
        <p>
          <strong className="text-surface-200">By You:</strong> You may cancel your subscription at any
          time through your account settings or by contacting us. Your access continues until the end
          of the current billing period.
        </p>
        <p className="mt-2">
          <strong className="text-surface-200">By Us:</strong> We may suspend or terminate your access
          immediately for violation of these Terms, non-payment, or illegal activity. We may also
          terminate with 30 days&apos; notice for any reason.
        </p>
        <p className="mt-2">
          <strong className="text-surface-200">Effect of Termination:</strong> Upon termination, your
          right to use the Service ceases immediately. You may request a data export within 30 days
          of termination. After 30 days, we may permanently delete Your Data.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">14. Dispute Resolution</h2>
        <p>
          Any dispute arising from these Terms or your use of the Service shall be resolved as follows:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong className="text-surface-200">Informal Resolution:</strong> We will first attempt to resolve any dispute through good-faith negotiation for a period of 30 days.</li>
          <li><strong className="text-surface-200">Arbitration:</strong> If informal resolution fails, disputes shall be settled by binding arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules.</li>
          <li><strong className="text-surface-200">Jurisdiction:</strong> These Terms are governed by the laws of the State of Delaware, without regard to conflict of law principles.</li>
          <li><strong className="text-surface-200">Class Action Waiver:</strong> You agree to resolve disputes individually and waive the right to participate in class action lawsuits or class-wide arbitrations.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">15. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. Material changes will be communicated
          through the Service (via the agreement gate), email notification, or both. You will be required
          to review and accept updated Terms before continuing to use the Service. The &quot;Last updated&quot;
          date at the top of this page indicates the most recent revision.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">16. Miscellaneous</h2>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong className="text-surface-200">Entire Agreement:</strong> These Terms, together with the Privacy Policy, constitute the entire agreement between you and Bardo Labs regarding the Service.</li>
          <li><strong className="text-surface-200">Severability:</strong> If any provision is found unenforceable, the remaining provisions remain in full force.</li>
          <li><strong className="text-surface-200">Waiver:</strong> Failure to enforce any provision does not constitute a waiver of that provision.</li>
          <li><strong className="text-surface-200">Assignment:</strong> You may not assign your rights under these Terms without our prior written consent.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-surface-200 mb-3">17. Contact</h2>
        <p>
          For questions about these Terms of Service, contact us at:{' '}
          <a href="mailto:legal@bardolabs.ai" className="text-primary-500 hover:text-primary-400 underline">
            legal@bardolabs.ai
          </a>
        </p>
        <p className="mt-2 text-surface-500">
          Bardo Labs Inc.<br />
          Email: legal@bardolabs.ai
        </p>
      </section>
    </div>
  );
}
