'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/components/tenant-provider';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CreditCard,
  Crown,
  Star,
  Zap,
  Check,
  ExternalLink,
  AlertTriangle,
  Receipt,
  ArrowRight,
  Loader2,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface Plan {
  id?: string;
  slug: string;
  name: string;
  priceMonthly: number;
  priceYearly?: number;
  features: string[];
  popular?: boolean;
  stripePriceId?: string | null;
  maxMailboxes?: number;
  maxUsers?: number;
  maxStores?: number;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  description: string;
  invoiceUrl: string | null;
  createdAt: string;
}

const planIcons: Record<string, React.ReactNode> = {
  starter: <Star className="h-6 w-6 text-blue-500" />,
  pro: <Zap className="h-6 w-6 text-primary-500" />,
  enterprise: <Crown className="h-6 w-6 text-amber-500" />,
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function BillingPage() {
  const { tenant, localUser } = useTenant();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/billing/plans').then((r) => r.ok ? r.json() : null),
      fetch('/api/billing/invoices').then((r) => r.ok ? r.json() : null),
    ]).then(([plansData, invoicesData]) => {
      if (plansData?.plans) setPlans(plansData.plans);
      if (invoicesData?.invoices) setInvoices(invoicesData.invoices);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (plan: Plan) => {
    setSubscribing(plan.slug);
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSlug: plan.slug }),
      });
      const data = await res.json();

      if (data.mode === 'stripe' && data.priceId) {
        // Redirect to Stripe checkout
        const checkoutRes = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId: data.priceId, planId: data.planId }),
        });
        const checkoutData = await checkoutRes.json();
        if (checkoutData.url) {
          window.location.href = checkoutData.url;
          return;
        }
        if (checkoutData.error?.includes('not configured')) {
          setStripeConfigured(false);
        }
      }

      if (data.subscription) {
        // Manual subscription created successfully
        window.location.reload();
      }
    } catch {
      console.error('Subscribe failed');
    } finally {
      setSubscribing(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      console.error('Portal failed');
    }
  };

  const isAdmin = localUser?.role === 'superadmin' || localUser?.role === 'admin';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Subscription"
        description="Manage your subscription plan, payment methods, and invoices"
        icon={<CreditCard className="h-6 w-6" />}
      />

      {/* Stripe not configured notice */}
      {!stripeConfigured && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-surface-200">
                  Stripe Not Configured
                </p>
                <p className="text-sm text-surface-400 mt-1">
                  To enable online payments, set <code className="text-xs bg-surface-800 px-1.5 py-0.5 rounded">STRIPE_SECRET_KEY</code> and{' '}
                  <code className="text-xs bg-surface-800 px-1.5 py-0.5 rounded">STRIPE_WEBHOOK_SECRET</code> in your Vercel environment variables.
                  Subscriptions are currently tracked in manual mode.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current plan */}
      {tenant && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-surface-100">
                  {tenant.name}
                </p>
                <p className="text-sm text-surface-400 mt-1">
                  {tenant.stripeSubscriptionId ? 'Active Stripe subscription' : 'No active subscription'}
                </p>
              </div>
              {tenant.stripeSubscriptionId && (
                <Button variant="secondary" onClick={handleManageBilling}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage Billing
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans grid */}
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-4">Available Plans</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-surface-500" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.slug} className={plan.popular ? 'ring-2 ring-primary-500' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    {planIcons[plan.slug] || <Star className="h-6 w-6" />}
                    <div>
                      <h3 className="font-semibold text-surface-100">{plan.name}</h3>
                      {plan.popular && (
                        <Badge variant="default" className="text-[10px]">Most Popular</Badge>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold text-surface-100">
                      {formatCurrency(plan.priceMonthly)}
                    </span>
                    <span className="text-sm text-surface-500">/month</span>
                  </div>

                  {plan.priceYearly && (
                    <p className="text-xs text-surface-500 mb-4">
                      or {formatCurrency(plan.priceYearly)}/year (save {Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100)}%)
                    </p>
                  )}

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-surface-300">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {isAdmin && (
                    <Button
                      className="w-full"
                      variant={plan.popular ? 'default' : 'secondary'}
                      onClick={() => handleSubscribe(plan)}
                      disabled={subscribing === plan.slug}
                    >
                      {subscribing === plan.slug ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="h-4 w-4 mr-2" />
                      )}
                      Choose {plan.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Invoice history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-surface-500 py-4 text-center">
              No payment history yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700 text-left">
                    <th className="py-2 pr-4 text-surface-400 font-medium">Date</th>
                    <th className="py-2 pr-4 text-surface-400 font-medium">Description</th>
                    <th className="py-2 pr-4 text-surface-400 font-medium">Amount</th>
                    <th className="py-2 pr-4 text-surface-400 font-medium">Status</th>
                    <th className="py-2 text-surface-400 font-medium">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-surface-800">
                      <td className="py-3 pr-4 text-surface-300">{formatDate(invoice.createdAt)}</td>
                      <td className="py-3 pr-4 text-surface-300">
                        {invoice.invoiceUrl ? (
                          <a href={invoice.invoiceUrl} target="_blank" rel="noreferrer" className="text-primary-500 hover:underline">
                            {invoice.description}
                          </a>
                        ) : (
                          invoice.description
                        )}
                      </td>
                      <td className="py-3 pr-4 text-surface-100 font-medium">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={invoice.status === 'succeeded' ? 'success' : invoice.status === 'failed' ? 'danger' : 'warning'}>
                          {invoice.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-surface-400 capitalize">{invoice.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
