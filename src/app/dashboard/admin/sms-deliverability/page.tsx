'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/components/tenant-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Check,
  AlertTriangle,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronRight,
  UserCheck,
  UserX,
  MessageSquare,
  Hash,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface ConsentStats {
  totalConsented: number;
  totalOptedOut: number;
  recentOptOuts: number; // last 30 days
  consentMethods: Record<string, number>;
}

/* -------------------------------------------------------------------------- */
/*  10DLC Registration guide                                                  */
/* -------------------------------------------------------------------------- */

interface RegistrationStep {
  step: number;
  title: string;
  description: string;
  link?: { label: string; url: string };
}

const REGISTRATION_STEPS: RegistrationStep[] = [
  {
    step: 1,
    title: 'Register your Brand',
    description: 'Submit your business details (EIN, business name, address) through The Campaign Registry (TCR) via Twilio.',
    link: { label: 'Twilio Brand Registration', url: 'https://www.twilio.com/docs/messaging/guides/10dlc/register-a-brand' },
  },
  {
    step: 2,
    title: 'Create a Campaign',
    description: 'Describe your messaging use case, sample messages, opt-in flow, and expected volume.',
    link: { label: 'Campaign Registration', url: 'https://www.twilio.com/docs/messaging/guides/10dlc/register-a-campaign' },
  },
  {
    step: 3,
    title: 'Associate Phone Numbers',
    description: 'Link your Twilio phone number(s) to the approved campaign.',
  },
  {
    step: 4,
    title: 'Verify Messaging Service',
    description: 'Ensure your Messaging Service is configured with the campaign-linked numbers.',
  },
];

/* -------------------------------------------------------------------------- */
/*  Number type info                                                          */
/* -------------------------------------------------------------------------- */

interface NumberTypeInfo {
  type: string;
  throughput: string;
  useCase: string;
  registration: string;
}

const NUMBER_TYPES: NumberTypeInfo[] = [
  { type: 'Local (10DLC)', throughput: '15-75 msg/sec', useCase: 'Standard A2P messaging', registration: '10DLC campaign required' },
  { type: 'Toll-Free', throughput: '25 msg/sec', useCase: 'Higher volume, brand recognition', registration: 'Toll-free verification' },
  { type: 'Short Code', throughput: '100+ msg/sec', useCase: 'High-volume marketing, 2FA', registration: 'Short code approval (8-12 weeks)' },
];

/* -------------------------------------------------------------------------- */
/*  CTIA Compliance checklist                                                 */
/* -------------------------------------------------------------------------- */

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  critical: boolean;
}

const CTIA_CHECKLIST: ChecklistItem[] = [
  { id: 'consent', label: 'Express written consent collected', description: 'Obtain clear opt-in before sending any messages.', critical: true },
  { id: 'disclosure', label: 'Program disclosure in first message', description: 'Include business name, message frequency, data rates, and opt-out instructions.', critical: true },
  { id: 'stop', label: 'STOP keyword handling', description: 'Immediately honor STOP, CANCEL, END, QUIT, UNSUBSCRIBE.', critical: true },
  { id: 'help', label: 'HELP keyword handling', description: 'Respond with business contact and program info.', critical: true },
  { id: 'start', label: 'START/UNSTOP re-opt-in', description: 'Allow recipients to re-subscribe via keyword.', critical: true },
  { id: '10dlc', label: '10DLC campaign registered', description: 'Register brand and campaign with The Campaign Registry.', critical: true },
  { id: 'consent_records', label: 'Consent records maintained', description: 'Store date, time, method, and IP for each opt-in.', critical: true },
  { id: 'quiet_hours', label: 'Quiet hours respected', description: 'Do not send messages between 9 PM and 8 AM recipient local time.', critical: false },
  { id: 'frequency', label: 'Message frequency capped', description: 'Stay within the frequency disclosed at opt-in.', critical: false },
  { id: 'content', label: 'No SHAFT content', description: 'No sex, hate, alcohol, firearms, or tobacco content.', critical: false },
];

/* -------------------------------------------------------------------------- */
/*  SMS warming schedule                                                      */
/* -------------------------------------------------------------------------- */

const SMS_WARMING = [
  { day: '1-3', volume: 100, note: 'Internal / test numbers only' },
  { day: '4-7', volume: 500, note: 'Recent opted-in customers' },
  { day: '8-14', volume: 2000, note: 'Engaged customers (opened in 30d)' },
  { day: '15-21', volume: 5000, note: 'Full opted-in list segment' },
  { day: '22+', volume: 10000, note: 'Full volume — monitor carrier filtering' },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function SmsDeliverabilityPage() {
  const { localUser, loading: tenantLoading } = useTenant();
  const [consentStats, setConsentStats] = useState<ConsentStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warmingOpen, setWarmingOpen] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});

  // Load saved checklist state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sms-deliverability-checklist');
      if (saved) setChecklistState(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const toggleChecklistItem = useCallback((id: string) => {
    setChecklistState((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('sms-deliverability-checklist', JSON.stringify(next));
      return next;
    });
  }, []);

  // Fetch consent stats
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/sms-deliverability');
      if (!res.ok) throw new Error('Failed to fetch SMS stats');
      const data = await res.json();
      setConsentStats(data);
    } catch (err) {
      setConsentStats({
        totalConsented: 0,
        totalOptedOut: 0,
        recentOptOuts: 0,
        consentMethods: {},
      });
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (!tenantLoading && localUser?.role === 'superadmin') {
      fetchStats();
    }
  }, [tenantLoading, localUser?.role, fetchStats]);

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

  const completedCount = CTIA_CHECKLIST.filter((bp) => checklistState[bp.id]).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-100 flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-primary-400" />
            SMS Deliverability
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            10DLC registration, CTIA compliance, and consent management.
          </p>
        </div>
        <Button
          onClick={fetchStats}
          disabled={loadingStats}
          variant="secondary"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loadingStats ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error} — Showing configuration guidance below.</span>
        </div>
      )}

      {/* ── Consent Overview ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="flex items-center gap-3 p-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-surface-200">{consentStats?.totalConsented ?? '—'}</p>
              <p className="text-xs text-surface-400">Opted In</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3 p-2">
            <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
              <UserX className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-surface-200">{consentStats?.totalOptedOut ?? '—'}</p>
              <p className="text-xs text-surface-400">Opted Out</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3 p-2">
            <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-surface-200">{consentStats?.recentOptOuts ?? '—'}</p>
              <p className="text-xs text-surface-400">Opt-Outs (30d)</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3 p-2">
            <div className="h-9 w-9 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-surface-200">
                {consentStats ? Object.keys(consentStats.consentMethods).length : '—'}
              </p>
              <p className="text-xs text-surface-400">Consent Methods</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── 10DLC Registration Guide ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <button
            onClick={() => setRegistrationOpen(!registrationOpen)}
            className="flex items-center gap-2 w-full text-left"
          >
            <CardTitle>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary-400" />
                10DLC Registration Guide
              </div>
            </CardTitle>
            {registrationOpen ? (
              <ChevronDown className="h-4 w-4 text-surface-400 ml-auto" />
            ) : (
              <ChevronRight className="h-4 w-4 text-surface-400 ml-auto" />
            )}
          </button>
        </CardHeader>
        {registrationOpen && (
          <CardContent>
            <p className="text-xs text-surface-400 mb-4">
              10-Digit Long Code (10DLC) registration is required for A2P (Application-to-Person) messaging in the US.
              Unregistered traffic faces heavy filtering and low throughput.
            </p>
            <div className="space-y-3">
              {REGISTRATION_STEPS.map((step) => (
                <div key={step.step} className="flex gap-3 rounded-lg border border-surface-800 p-3">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-primary-500/20 flex items-center justify-center text-xs font-bold text-primary-400">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-surface-200">{step.title}</p>
                    <p className="text-xs text-surface-400 mt-0.5">{step.description}</p>
                    {step.link && (
                      <a
                        href={step.link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-400 hover:underline mt-1 inline-block"
                      >
                        {step.link.label} →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Number Type Information ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Number Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left py-2 pr-4 text-surface-400 font-medium">Type</th>
                  <th className="text-left py-2 pr-4 text-surface-400 font-medium">Throughput</th>
                  <th className="text-left py-2 pr-4 text-surface-400 font-medium">Use Case</th>
                  <th className="text-left py-2 text-surface-400 font-medium">Registration</th>
                </tr>
              </thead>
              <tbody>
                {NUMBER_TYPES.map((nt) => (
                  <tr key={nt.type} className="border-b border-surface-800/50 last:border-0">
                    <td className="py-2 pr-4 text-surface-200 font-medium">{nt.type}</td>
                    <td className="py-2 pr-4 text-surface-300 font-mono">{nt.throughput}</td>
                    <td className="py-2 pr-4 text-surface-400">{nt.useCase}</td>
                    <td className="py-2 text-surface-400">{nt.registration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── CTIA Compliance Checklist ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary-400" />
              CTIA Compliance Checklist
              <Badge variant={completedCount === CTIA_CHECKLIST.length ? 'success' : 'muted'} dot={false}>
                {completedCount}/{CTIA_CHECKLIST.length}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {CTIA_CHECKLIST.map((item) => (
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

      {/* ── Consent Management ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary-400" />
              Consent Management
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {consentStats && Object.keys(consentStats.consentMethods).length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-surface-400">Consent collected by method:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(consentStats.consentMethods).map(([method, count]) => (
                  <div key={method} className="rounded-lg border border-surface-800 p-3 text-center">
                    <p className="text-lg font-bold text-surface-200">{count}</p>
                    <p className="text-xs text-surface-400 mt-0.5 capitalize">{method.replace(/_/g, ' ')}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-surface-400">
              <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No consent records yet.</p>
              <p className="text-xs mt-1">Consent records will appear as customers opt in to SMS notifications.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SMS Warming Schedule ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <button
            onClick={() => setWarmingOpen(!warmingOpen)}
            className="flex items-center gap-2 w-full text-left"
          >
            <CardTitle>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary-400" />
                SMS Warming Schedule
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
              Gradually increase SMS volume to build trust with carrier networks and avoid filtering.
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
                  {SMS_WARMING.map((row) => (
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
