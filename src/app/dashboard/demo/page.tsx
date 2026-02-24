'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Trash2,
  Users,
  Package,
  Mail,
  FileText,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  BookOpen,
} from 'lucide-react';

/* ── Walkthrough Steps ──────────────────────────────────────────────────── */

interface WalkthroughStep {
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
  category: string;
}

const WALKTHROUGH: WalkthroughStep[] = [
  {
    title: '1. Dashboard Overview',
    description: 'See real-time stats: packages in, customers active, revenue trends. The AI morning briefing summarizes what needs attention.',
    link: '/dashboard',
    icon: <Monitor className="h-5 w-5" />,
    category: 'Getting Started',
  },
  {
    title: '2. Check In a Package',
    description: 'Use AI Smart Intake to scan a tracking number. The system detects the carrier, matches the customer, and assigns a shelf location.',
    link: '/dashboard/packages/check-in',
    icon: <Package className="h-5 w-5" />,
    category: 'Package Flow',
  },
  {
    title: '3. Package Check-Out',
    description: 'Release packages with signature capture, storage fee calculation, and delegation support. Try bulk checkout for multiple packages.',
    link: '/dashboard/packages/check-out',
    icon: <Package className="h-5 w-5" />,
    category: 'Package Flow',
  },
  {
    title: '4. Customer Management',
    description: 'Browse customers, view their PMB details, package history, and compliance status. Edit profiles with role-based field access.',
    link: '/dashboard/customers',
    icon: <Users className="h-5 w-5" />,
    category: 'Customers',
  },
  {
    title: '5. Provision a New Customer',
    description: 'Walk through the 7-step wizard: plan selection → personal info → ID verification → Form 1583 → agreement → PMB assignment → confirmation.',
    link: '/dashboard/customers/provision',
    icon: <Users className="h-5 w-5" />,
    category: 'Customers',
  },
  {
    title: '6. Mail Handling',
    description: 'Receive, sort (AI-powered), and manage mail pieces. Forward, hold, or discard based on customer preferences.',
    link: '/dashboard/mail',
    icon: <Mail className="h-5 w-5" />,
    category: 'Operations',
  },
  {
    title: '7. CMRA Compliance',
    description: 'Review Form 1583 statuses, ID verification, and USPS compliance dashboard. Track expiring documents.',
    link: '/dashboard/compliance',
    icon: <ShieldCheck className="h-5 w-5" />,
    category: 'Compliance',
  },
  {
    title: '8. Invoicing & Reports',
    description: 'Generate invoices, view revenue analytics with period comparisons, and export reports as CSV.',
    link: '/dashboard/reports',
    icon: <FileText className="h-5 w-5" />,
    category: 'Business',
  },
  {
    title: '9. Renewal Pipeline',
    description: 'See upcoming renewals with 30/15/7/1-day dunning windows. Review past-due accounts and suspension triggers.',
    link: '/dashboard/renewals',
    icon: <FileText className="h-5 w-5" />,
    category: 'Business',
  },
  {
    title: '10. Admin Settings',
    description: 'Feature flags, tenant lifecycle, user management, branding, and security settings. Toggle features on/off in real time.',
    link: '/dashboard/admin',
    icon: <Monitor className="h-5 w-5" />,
    category: 'Admin',
  },
];

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function DemoPage() {
  const [seeding, setSeeding] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const seedDemo = async () => {
    setSeeding(true);
    setStatus(null);
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', message: `Seeded: ${data.counts.customers} customers, ${data.counts.packages} packages, ${data.counts.users} users` });
      } else {
        setStatus({ type: 'error', message: data.error || 'Seed failed' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error' });
    } finally {
      setSeeding(false);
    }
  };

  const cleanDemo = async () => {
    setCleaning(true);
    setStatus(null);
    try {
      const res = await fetch('/api/demo/seed', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', message: 'Demo data removed' });
      } else {
        setStatus({ type: 'error', message: data.error || 'Cleanup failed' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error' });
    } finally {
      setCleaning(false);
    }
  };

  const categories = [...new Set(WALKTHROUGH.map(s => s.category))];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Demo & Walkthrough"
        description="Seed demo data and follow the guided walkthrough to explore every ShipOS feature."
        icon={<BookOpen className="h-6 w-6" />}
      />

      {/* Seed Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-semibold text-surface-900">Demo Data</h3>
              <p className="text-sm text-surface-500 mt-1">
                Seed realistic demo data (1 tenant, 3 users, 15 customers, 30 packages) or clean it up.
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={seedDemo} disabled={seeding || cleaning}>
                {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Seed Demo Data
              </Button>
              <Button variant="outline" onClick={cleanDemo} disabled={seeding || cleaning}>
                {cleaning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Remove Demo Data
              </Button>
            </div>
          </div>
          {status && (
            <div className={`mt-4 flex items-center gap-2 text-sm ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {status.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {status.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Walkthrough */}
      {categories.map((category) => (
        <div key={category}>
          <h2 className="text-lg font-semibold text-surface-800 mb-4">{category}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {WALKTHROUGH.filter(s => s.category === category).map((step) => (
              <Card key={step.title} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 p-2 bg-brand-50 text-brand-600 rounded-lg">
                      {step.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-surface-900">{step.title}</h3>
                      <p className="text-sm text-surface-500 mt-1">{step.description}</p>
                      <a
                        href={step.link}
                        className="inline-flex items-center mt-3 text-sm text-brand-600 hover:text-brand-700 font-medium"
                      >
                        Open →
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Demo Accounts */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-surface-900 mb-4">Demo Accounts</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { email: 'admin@demo.shipos.app', role: 'Admin', color: 'bg-purple-100 text-purple-700', desc: 'Full access to all features including Super Admin panel' },
              { email: 'staff@demo.shipos.app', role: 'Staff', color: 'bg-blue-100 text-blue-700', desc: 'Day-to-day operations: packages, mail, customers' },
              { email: 'viewer@demo.shipos.app', role: 'Viewer', color: 'bg-gray-100 text-gray-700', desc: 'Read-only access to dashboards and reports' },
            ].map((account) => (
              <div key={account.email} className="p-4 rounded-lg border border-surface-200">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={account.color}>{account.role}</Badge>
                </div>
                <p className="font-mono text-sm text-surface-800">{account.email}</p>
                <p className="text-xs text-surface-500 mt-1">{account.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
