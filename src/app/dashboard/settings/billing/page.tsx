'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  ChevronDown,
  ChevronUp,
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

interface SubscriptionData {
  id: string;
  status: string;
  billingCycle: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  stripeSubscriptionId: string | null;
  plan: Plan;
  lastPayment: {
    amount: number;
    status: string;
    date: string;
    billingPeriod: string | null;
  } | null;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  description: string;
  invoiceUrl: string | null;
  billingPeriod: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  tenant?: { id: string; name: string; slug: string };
}

interface AdminBillingSummary {
  mrr: number;
  totalRevenue: number;
  totalFailed: number;
  totalPending: number;
  activeSubscriptions: number;
  paymentsThisPeriod: number;
}

interface AdminSubscription {
  id: string;
  tenantName: string;
  tenantSlug: string;
  planName: string;
  priceMonthly: number;
  status: string;
  billingCycle: string;
  currentPeriodEnd: string | null;
  hasStripe: boolean;
}

const planIcons: Record<string, React.ReactNode> = {
  starter: <Star className="h-6 w-6 text-blue-500" />,
  pro: <Zap className="h-6 w-6 text-primary-500" />,
  enterprise: <Crown className="h-6 w-6 text-amber-500" />,
};

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'succeeded':
    case 'active':
      return 'success' as const;
    case 'failed':
    case 'past_due':
    case 'canceled':
      return 'danger' as const;
    case 'pending':
    case 'manual':
    case 'trialing':
      return 'warning' as const;
    default:
      return 'muted' as const;
  }
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function BillingPage() {
  const { tenant, localUser } = useTenant();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [showAllPlans, setShowAllPlans] = useState(false);

  // Super admin state
  const [adminSummary, setAdminSummary] = useState<AdminBillingSummary | null>(null);
  const [adminSubscriptions, setAdminSubscriptions] = useState<AdminSubscription[]>([]);
  const [adminPayments, setAdminPayments] = useState<Invoice[]>([]);

  const isSuperAdmin = localUser?.role === 'superadmin';
  const isAdmin = isSuperAdmin || localUser?.role === 'admin';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const fetches: Promise<Response>[] = [
        fetch('/api/billing/plans'),
        fetch('/api/billing/invoices'),
        fetch('/api/billing/subscription'),
      ];

      // Super admin: also fetch global billing overview
      if (isSuperAdmin) {
        fetches.push(fetch('/api/admin/billing'));
      }

      const responses = await Promise.all(fetches);
      const [plansRes, invoicesRes, subRes, adminRes] = responses;

      const plansData = plansRes.ok ? await plansRes.json() : null;
      const invoicesData = invoicesRes.ok ? await invoicesRes.json() : null;
      const subData = subRes.ok ? await subRes.json() : null;

      if (plansData?.plans) setPlans(plansData.plans);
      if (invoicesData?.invoices) setInvoices(invoicesData.invoices);
      if (subData?.subscription) setSubscription(subData.subscription);

      if (isSuperAdmin && adminRes?.ok) {
        const adminData = await adminRes.json();
        if (adminData.summary) setAdminSummary(adminData.summary);
        if (adminData.subscriptions) setAdminSubscriptions(adminData.subscriptions);
        if (adminData.recentPayments) setAdminPayments(adminData.recentPayments);
      }
    } catch (err) {
      console.error('Failed to load billing data:', err);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-surface-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Subscription"
        description="Manage plan, payments, and invoices."
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

      {/* ── Super Admin: Revenue Dashboard ─────────────────────────────── */}
      {isSuperAdmin && adminSummary && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Platform Billing Overview
          </h2>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 uppercase tracking-wide">MRR</p>
                    <p className="text-xl font-bold text-surface-100">
                      {formatCurrency(adminSummary.mrr)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary-500/10">
                    <DollarSign className="h-5 w-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 uppercase tracking-wide">This Month</p>
                    <p className="text-xl font-bold text-surface-100">
                      {formatCurrency(adminSummary.totalRevenue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 uppercase tracking-wide">Active</p>
                    <p className="text-xl font-bold text-surface-100">
                      {adminSummary.activeSubscriptions}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 uppercase tracking-wide">Failed</p>
                    <p className="text-xl font-bold text-surface-100">
                      {formatCurrency(adminSummary.totalFailed)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* All client subscriptions */}
          {adminSubscriptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  All Client Subscriptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-700 text-left">
                        <th className="py-2 pr-4 text-surface-400 font-medium">Client</th>
                        <th className="py-2 pr-4 text-surface-400 font-medium">Plan</th>
                        <th className="py-2 pr-4 text-surface-400 font-medium">Price</th>
                        <th className="py-2 pr-4 text-surface-400 font-medium">Status</th>
                        <th className="py-2 pr-4 text-surface-400 font-medium">Cycle</th>
                        <th className="py-2 text-surface-400 font-medium">Next Bill</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminSubscriptions.map((sub) => (
                        <tr key={sub.id} className="border-b border-surface-800">
                          <td className="py-3 pr-4 text-surface-200 font-medium">{sub.tenantName}</td>
                          <td className="py-3 pr-4 text-surface-300">{sub.planName}</td>
                          <td className="py-3 pr-4 text-surface-100">{formatCurrency(sub.priceMonthly)}/mo</td>
                          <td className="py-3 pr-4">
                            <Badge variant={statusBadgeVariant(sub.status)}>{sub.status}</Badge>
                          </td>
                          <td className="py-3 pr-4 text-surface-400 capitalize">{sub.billingCycle}</td>
                          <td className="py-3 text-surface-400">
                            {sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* All client payments */}
          {adminPayments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Recent Payments (All Clients)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-700 text-left">
                        <th className="py-2 pr-4 text-surface-400 font-medium">Date</th>
                        <th className="py-2 pr-4 text-surface-400 font-medium">Client</th>
                        <th className="py-2 pr-4 text-surface-400 font-medium">Description</th>
                        <th className="py-2 pr-4 text-surface-400 font-medium">Period</th>
                        <th className="py-2 pr-4 text-surface-400 font-medium">Amount</th>
                        <th className="py-2 pr-4 text-surface-400 font-medium">Status</th>
                        <th className="py-2 text-surface-400 font-medium">Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminPayments.slice(0, 20).map((p) => (
                        <tr key={p.id} className="border-b border-surface-800">
                          <td className="py-3 pr-4 text-surface-300">{formatDate(p.createdAt)}</td>
                          <td className="py-3 pr-4 text-surface-200 font-medium">
                            {p.tenant?.name || '—'}
                          </td>
                          <td className="py-3 pr-4 text-surface-300">
                            {p.invoiceUrl ? (
                              <a href={p.invoiceUrl} target="_blank" rel="noreferrer" className="text-primary-500 hover:underline">
                                {p.description}
                              </a>
                            ) : (
                              p.description
                            )}
                          </td>
                          <td className="py-3 pr-4 text-surface-400">{p.billingPeriod || '—'}</td>
                          <td className="py-3 pr-4 text-surface-100 font-medium">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant={statusBadgeVariant(p.status)}>{p.status}</Badge>
                          </td>
                          <td className="py-3 text-surface-400 capitalize">{p.method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Current Subscription Card ─────────────────────────────────── */}
      {tenant && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary-500/10">
                      {planIcons[subscription.plan.slug] || <Star className="h-6 w-6" />}
                    </div>
                    <div>
                      <p className="text-xl font-bold text-surface-100">
                        {subscription.plan.name} Plan
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant={statusBadgeVariant(subscription.status)}>
                          {subscription.status}
                        </Badge>
                        <span className="text-sm text-surface-400 capitalize">
                          {subscription.billingCycle} billing
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-surface-100">
                      {formatCurrency(subscription.plan.priceMonthly)}
                    </p>
                    <p className="text-sm text-surface-500">/month</p>
                  </div>
                </div>

                {/* Billing period info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-surface-800">
                  <div>
                    <p className="text-xs text-surface-500 uppercase tracking-wide">Period Start</p>
                    <p className="text-sm text-surface-300 mt-1">
                      {subscription.currentPeriodStart
                        ? formatDate(subscription.currentPeriodStart)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 uppercase tracking-wide">Period End</p>
                    <p className="text-sm text-surface-300 mt-1">
                      {subscription.currentPeriodEnd
                        ? formatDate(subscription.currentPeriodEnd)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 uppercase tracking-wide">Last Payment</p>
                    <p className="text-sm text-surface-300 mt-1">
                      {subscription.lastPayment
                        ? `${formatCurrency(subscription.lastPayment.amount)} on ${formatDate(subscription.lastPayment.date)}`
                        : 'No payments yet'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 uppercase tracking-wide">Next Bill</p>
                    <p className="text-sm text-surface-300 mt-1 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-surface-500" />
                      {subscription.currentPeriodEnd
                        ? formatDate(subscription.currentPeriodEnd)
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Cancellation notice */}
                {subscription.cancelAtPeriodEnd && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-amber-300">
                      Your subscription will cancel at the end of the current period
                      {subscription.currentPeriodEnd && ` (${formatDate(subscription.currentPeriodEnd)})`}.
                    </p>
                  </div>
                )}

                {/* Actions */}
                {isAdmin && (
                  <div className="flex items-center gap-3 pt-2">
                    {subscription.stripeSubscriptionId && (
                      <>
                        <Button variant="secondary" onClick={handleManageBilling}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Manage in Stripe
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-surface-500 hover:text-accent-rose"
                          onClick={handleManageBilling}
                        >
                          Cancel plan
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllPlans(!showAllPlans)}
                    >
                      {showAllPlans ? (
                        <ChevronUp className="h-4 w-4 mr-1" />
                      ) : (
                        <ChevronDown className="h-4 w-4 mr-1" />
                      )}
                      {showAllPlans ? 'Hide plans' : 'Change plan'}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-surface-400">No active subscription</p>
                <p className="text-sm text-surface-500 mt-1">
                  Choose a plan below to get started.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Plans grid ─────────────────────────────────────────────────── */}
      {(!subscription || showAllPlans) && (
        <div>
          <h2 className="text-lg font-semibold text-surface-100 mb-4">Available Plans</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrentPlan = subscription?.plan.slug === plan.slug;
              return (
                <Card
                  key={plan.slug}
                  className={
                    isCurrentPlan
                      ? 'ring-2 ring-emerald-500'
                      : plan.popular
                        ? 'ring-2 ring-primary-500'
                        : ''
                  }
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      {planIcons[plan.slug] || <Star className="h-6 w-6" />}
                      <div>
                        <h3 className="font-semibold text-surface-100">{plan.name}</h3>
                        <div className="flex gap-2">
                          {isCurrentPlan && (
                            <Badge variant="success" className="text-[10px]">Current</Badge>
                          )}
                          {plan.popular && !isCurrentPlan && (
                            <Badge variant="default" className="text-[10px]">Most Popular</Badge>
                          )}
                        </div>
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
                        or {formatCurrency(plan.priceYearly)}/year (save{' '}
                        {Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100)}%)
                      </p>
                    )}

                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-surface-300">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {isAdmin && !isCurrentPlan && (
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
                        {subscription ? `Switch to ${plan.name}` : `Choose ${plan.name}`}
                      </Button>
                    )}

                    {isCurrentPlan && (
                      <div className="text-center py-2 text-sm text-emerald-500 font-medium">
                        ✓ Your current plan
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Invoice / Payment History ──────────────────────────────────── */}
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
                    <th className="py-2 pr-4 text-surface-400 font-medium">Period</th>
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
                          <a
                            href={invoice.invoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary-500 hover:underline"
                          >
                            {invoice.description}
                          </a>
                        ) : (
                          invoice.description
                        )}
                      </td>
                      <td className="py-3 pr-4 text-surface-400">
                        {invoice.billingPeriod || '—'}
                      </td>
                      <td className="py-3 pr-4 text-surface-100 font-medium">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusBadgeVariant(invoice.status)}>
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
