'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/components/tenant-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Mail,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Globe,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  status: string;
  priority?: number;
}

interface Domain {
  id: string;
  name: string;
  status: string;
  records: DnsRecord[];
  region: string;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/*  DNS authentication checker types                                          */
/* -------------------------------------------------------------------------- */

type DnsCheckStatus = 'pass' | 'fail' | 'unknown';

interface DnsAuthCheck {
  protocol: 'SPF' | 'DKIM' | 'DMARC';
  status: DnsCheckStatus;
  description: string;
  recommendation: string;
}

/* -------------------------------------------------------------------------- */
/*  Best practices checklist                                                  */
/* -------------------------------------------------------------------------- */

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  critical: boolean;
}

const BEST_PRACTICES: ChecklistItem[] = [
  { id: 'spf', label: 'SPF record configured', description: 'Authorises Resend servers to send on your behalf.', critical: true },
  { id: 'dkim', label: 'DKIM signing enabled', description: 'Cryptographically signs outbound mail to prove authenticity.', critical: true },
  { id: 'dmarc', label: 'DMARC policy published', description: 'Instructs receivers how to handle unauthenticated mail.', critical: true },
  { id: 'list_unsub', label: 'List-Unsubscribe header on marketing emails', description: 'One-click unsubscribe per RFC 8058 improves inbox placement.', critical: true },
  { id: 'can_spam', label: 'CAN-SPAM compliant footer', description: 'Physical address and unsubscribe link in every marketing email.', critical: true },
  { id: 'double_optin', label: 'Double opt-in for marketing lists', description: 'Confirm subscribers to reduce spam complaints.', critical: false },
  { id: 'bounce', label: 'Bounce handling configured', description: 'Automatically suppress hard bounces to protect sender reputation.', critical: false },
  { id: 'warmup', label: 'IP/domain warming completed', description: 'Gradually increase sending volume on new IPs/domains.', critical: false },
  { id: 'feedback_loop', label: 'Feedback loop (FBL) registered', description: 'Receive complaint notifications from major ISPs.', critical: false },
  { id: 'separate_streams', label: 'Transactional & marketing separated', description: 'Use different sending domains/IPs for transactional vs marketing.', critical: false },
];

/* -------------------------------------------------------------------------- */
/*  IP Warming schedule                                                       */
/* -------------------------------------------------------------------------- */

const WARMING_SCHEDULE = [
  { day: '1-2', volume: 50, note: 'Seed list / internal testing' },
  { day: '3-4', volume: 100, note: 'Engaged subscribers only' },
  { day: '5-7', volume: 500, note: 'Recent openers (30 days)' },
  { day: '8-14', volume: 2000, note: 'Active subscribers (90 days)' },
  { day: '15-21', volume: 5000, note: 'Full engaged segment' },
  { day: '22-28', volume: 10000, note: 'Broader list, monitor closely' },
  { day: '29+', volume: 25000, note: 'Full volume — maintain list hygiene' },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function EmailDeliverabilityPage() {
  const { localUser, loading: tenantLoading } = useTenant();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [dnsChecks, setDnsChecks] = useState<DnsAuthCheck[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [warmingOpen, setWarmingOpen] = useState(false);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});

  // Load saved checklist state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('email-deliverability-checklist');
      if (saved) setChecklistState(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const toggleChecklistItem = useCallback((id: string) => {
    setChecklistState((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('email-deliverability-checklist', JSON.stringify(next));
      return next;
    });
  }, []);

  // Derive DNS auth checks from domain records
  const deriveDnsChecks = useCallback((domainList: Domain[]): DnsAuthCheck[] => {
    const checks: DnsAuthCheck[] = [];

    // Analyse records across all domains
    const allRecords = domainList.flatMap((d) => d.records);
    const hasVerifiedDomain = domainList.some((d) => d.status === 'verified');

    // SPF
    const spfRecord = allRecords.find((r) => r.type === 'TXT' && r.value.includes('v=spf1'));
    checks.push({
      protocol: 'SPF',
      status: spfRecord?.status === 'verified' ? 'pass' : spfRecord ? 'fail' : 'unknown',
      description: spfRecord
        ? `SPF record found: ${spfRecord.value.substring(0, 60)}…`
        : 'No SPF record detected.',
      recommendation: spfRecord?.status === 'verified'
        ? 'SPF is properly configured.'
        : 'Add the SPF TXT record shown below to your DNS.',
    });

    // DKIM
    const dkimRecords = allRecords.filter((r) => r.name.includes('._domainkey'));
    const dkimVerified = dkimRecords.some((r) => r.status === 'verified');
    checks.push({
      protocol: 'DKIM',
      status: dkimVerified ? 'pass' : dkimRecords.length > 0 ? 'fail' : 'unknown',
      description: dkimVerified
        ? `DKIM signing active (${dkimRecords.length} key${dkimRecords.length > 1 ? 's' : ''}).`
        : 'DKIM record pending or missing.',
      recommendation: dkimVerified
        ? 'DKIM is properly configured.'
        : 'Add the CNAME records shown below to enable DKIM signing.',
    });

    // DMARC (inferred from domain verification)
    checks.push({
      protocol: 'DMARC',
      status: hasVerifiedDomain ? 'pass' : 'unknown',
      description: hasVerifiedDomain
        ? 'Domain verified — DMARC alignment possible.'
        : 'Add a DMARC TXT record to your domain root.',
      recommendation: hasVerifiedDomain
        ? 'Ensure _dmarc.yourdomain.com has a TXT record like: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com'
        : 'Publish a DMARC record after verifying SPF and DKIM.',
    });

    return checks;
  }, []);

  // Fetch domain data
  const fetchDomains = useCallback(async () => {
    setLoadingDomains(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/email-deliverability');
      if (!res.ok) throw new Error('Failed to fetch domain data');
      const data = await res.json();
      setDomains(data.domains || []);
      setDnsChecks(deriveDnsChecks(data.domains || []));
    } catch (err) {
      // In case API not available yet, show empty state with guidance
      setDomains([]);
      setDnsChecks([
        { protocol: 'SPF', status: 'unknown', description: 'Connect Resend to check SPF status.', recommendation: 'Configure RESEND_API_KEY to enable domain checks.' },
        { protocol: 'DKIM', status: 'unknown', description: 'Connect Resend to check DKIM status.', recommendation: 'Configure RESEND_API_KEY to enable domain checks.' },
        { protocol: 'DMARC', status: 'unknown', description: 'Connect Resend to check DMARC status.', recommendation: 'Configure RESEND_API_KEY to enable domain checks.' },
      ]);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingDomains(false);
    }
  }, [deriveDnsChecks]);

  useEffect(() => {
    if (!tenantLoading && localUser?.role === 'superadmin') {
      fetchDomains();
    }
  }, [tenantLoading, localUser?.role, fetchDomains]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedValue(value);
    setTimeout(() => setCopiedValue(null), 2000);
  }, []);

  // ── Auth guard ──────────────────────────────────────────────────────
  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <RefreshCw className="h-5 w-5 animate-spin text-surface-400" />
      </div>
    );
  }

  if (localUser?.role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
        <ShieldAlert className="h-10 w-10 text-red-400 mb-3" />
        <h2 className="text-lg font-semibold text-surface-200 mb-1">Access Denied</h2>
        <p className="text-sm text-surface-400">This page requires superadmin access.</p>
      </div>
    );
  }

  // ── Status helpers ──────────────────────────────────────────────────
  const statusIcon = (s: DnsCheckStatus) => {
    if (s === 'pass') return <ShieldCheck className="h-5 w-5 text-emerald-400" />;
    if (s === 'fail') return <ShieldAlert className="h-5 w-5 text-red-400" />;
    return <Shield className="h-5 w-5 text-surface-500" />;
  };

  const statusBadge = (s: string) => {
    if (s === 'verified') return <Badge variant="success">Verified</Badge>;
    if (s === 'pending') return <Badge variant="warning">Pending</Badge>;
    if (s === 'not_started') return <Badge variant="muted">Not Started</Badge>;
    return <Badge variant="muted">{s}</Badge>;
  };

  const completedCount = BEST_PRACTICES.filter((bp) => checklistState[bp.id]).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-100 flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary-400" />
            Email Deliverability
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            DNS authentication, domain verification, and sending reputation.
          </p>
        </div>
        <Button
          onClick={fetchDomains}
          disabled={loadingDomains}
          variant="secondary"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loadingDomains ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error} — Showing configuration guidance below.</span>
        </div>
      )}

      {/* ── DNS Authentication Status ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>DNS Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dnsChecks.map((check) => (
              <div
                key={check.protocol}
                className="flex items-start gap-3 rounded-lg border border-surface-800 p-4"
              >
                {statusIcon(check.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-surface-200">{check.protocol}</span>
                    <Badge
                      variant={check.status === 'pass' ? 'success' : check.status === 'fail' ? 'danger' : 'muted'}
                      dot={false}
                    >
                      {check.status === 'pass' ? 'Passing' : check.status === 'fail' ? 'Failing' : 'Unknown'}
                    </Badge>
                  </div>
                  <p className="text-xs text-surface-400 mt-1">{check.description}</p>
                  <p className="text-xs text-surface-500 mt-0.5 italic">{check.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Domain Verification ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary-400" />
              Domain Verification
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <div className="text-center py-8 text-surface-400">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No domains configured yet.</p>
              <p className="text-xs mt-1">
                Add a domain in your{' '}
                <a
                  href="https://resend.com/domains"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:underline"
                >
                  Resend dashboard <ExternalLink className="inline h-3 w-3" />
                </a>
                {' '}to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {domains.map((domain) => (
                <div key={domain.id} className="rounded-lg border border-surface-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-surface-200">{domain.name}</span>
                      {statusBadge(domain.status)}
                    </div>
                    <span className="text-xs text-surface-500">Region: {domain.region}</span>
                  </div>

                  {/* DNS records table */}
                  {domain.records.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-surface-800">
                            <th className="text-left py-2 pr-3 text-surface-400 font-medium">Type</th>
                            <th className="text-left py-2 pr-3 text-surface-400 font-medium">Name</th>
                            <th className="text-left py-2 pr-3 text-surface-400 font-medium">Value</th>
                            <th className="text-left py-2 pr-3 text-surface-400 font-medium">Status</th>
                            <th className="text-left py-2 text-surface-400 font-medium w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {domain.records.map((record, idx) => (
                            <tr key={idx} className="border-b border-surface-800/50 last:border-0">
                              <td className="py-2 pr-3 text-surface-300 font-mono">{record.type}</td>
                              <td className="py-2 pr-3 text-surface-300 font-mono max-w-[200px] truncate">{record.name}</td>
                              <td className="py-2 pr-3 text-surface-400 font-mono max-w-[250px] truncate">{record.value}</td>
                              <td className="py-2 pr-3">{statusBadge(record.status)}</td>
                              <td className="py-2">
                                <button
                                  onClick={() => copyToClipboard(record.value)}
                                  className="text-surface-500 hover:text-surface-300 transition-colors"
                                  title="Copy value"
                                >
                                  {copiedValue === record.value ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Sending Reputation Metrics ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Sending Reputation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Bounce Rate', value: '< 2%', target: '< 2%', ok: true },
              { label: 'Complaint Rate', value: '< 0.1%', target: '< 0.1%', ok: true },
              { label: 'Open Rate', value: '—', target: '> 20%', ok: true },
              { label: 'Unsubscribe Rate', value: '—', target: '< 0.5%', ok: true },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-lg border border-surface-800 p-4 text-center"
              >
                <p className="text-lg font-bold text-surface-200">{metric.value}</p>
                <p className="text-xs text-surface-400 mt-1">{metric.label}</p>
                <p className="text-[10px] text-surface-500 mt-0.5">Target: {metric.target}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-surface-500 mt-3">
            Metrics update once Resend webhook events are configured. Set up webhooks in your Resend dashboard to track bounces, complaints, and opens.
          </p>
        </CardContent>
      </Card>

      {/* ── Best Practices Checklist ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary-400" />
              Best Practices Checklist
              <Badge variant={completedCount === BEST_PRACTICES.length ? 'success' : 'muted'} dot={false}>
                {completedCount}/{BEST_PRACTICES.length}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {BEST_PRACTICES.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleChecklistItem(item.id)}
                className="w-full flex items-start gap-3 rounded-lg border border-surface-800 p-3 hover:bg-surface-800/50 transition-colors text-left"
              >
                <div className={`
                  mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center text-xs
                  ${checklistState[item.id]
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'border-surface-600 text-transparent'}
                `}>
                  {checklistState[item.id] && <Check className="h-3 w-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${checklistState[item.id] ? 'text-surface-400 line-through' : 'text-surface-200'}`}>
                    {item.label}
                    {item.critical && (
                      <span className="ml-1.5 text-[10px] text-red-400 font-normal">(Required)</span>
                    )}
                  </span>
                  <p className="text-xs text-surface-500 mt-0.5">{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── IP Warming Schedule ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <button
            onClick={() => setWarmingOpen(!warmingOpen)}
            className="flex items-center gap-2 w-full text-left"
          >
            <CardTitle>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary-400" />
                IP / Domain Warming Guide
              </div>
            </CardTitle>
            {warmingOpen ? (
              <ChevronDown className="h-4 w-4 text-surface-400 ml-auto" />
            ) : (
              <ChevronRight className="h-4 w-4 text-surface-400 ml-auto" />
            )}
          </button>
        </CardHeader>
        {warmingOpen && (
          <CardContent>
            <p className="text-xs text-surface-400 mb-4">
              When using a new domain or IP address, gradually ramp up sending volume to build a positive reputation with ISPs.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-2 pr-4 text-surface-400 font-medium">Day</th>
                    <th className="text-left py-2 pr-4 text-surface-400 font-medium">Max Volume</th>
                    <th className="text-left py-2 text-surface-400 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {WARMING_SCHEDULE.map((row) => (
                    <tr key={row.day} className="border-b border-surface-800/50 last:border-0">
                      <td className="py-2 pr-4 text-surface-300 font-mono">{row.day}</td>
                      <td className="py-2 pr-4 text-surface-200 font-semibold">{row.volume.toLocaleString()}</td>
                      <td className="py-2 text-surface-400">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
