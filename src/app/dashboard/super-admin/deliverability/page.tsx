'use client';

import { useState } from 'react';
import { useTenant } from '@/components/tenant-provider';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  ArrowRight,
  Activity,
  Globe,
  UserCheck,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface ChannelHealth {
  label: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  description: string;
}

/* -------------------------------------------------------------------------- */
/*  Health data (static overview — detail pages have live data)               */
/* -------------------------------------------------------------------------- */

const EMAIL_HEALTH: ChannelHealth[] = [
  { label: 'DNS Authentication', status: 'unknown', description: 'SPF, DKIM, DMARC configuration' },
  { label: 'Domain Verification', status: 'unknown', description: 'Resend domain status' },
  { label: 'Sending Reputation', status: 'unknown', description: 'Bounce & complaint rates' },
  { label: 'CAN-SPAM Compliance', status: 'healthy', description: 'Unsubscribe headers & physical address in templates' },
];

const SMS_HEALTH: ChannelHealth[] = [
  { label: '10DLC Registration', status: 'unknown', description: 'Brand & campaign registration' },
  { label: 'CTIA Compliance', status: 'healthy', description: 'STOP/HELP/START keyword handling' },
  { label: 'Consent Tracking', status: 'healthy', description: 'Opt-in/out records maintained' },
  { label: 'First-Message Disclosure', status: 'healthy', description: 'Business name, frequency, data rates, opt-out' },
];

/* -------------------------------------------------------------------------- */
/*  Component — Super Admin context (links to /dashboard/super-admin/*)      */
/* -------------------------------------------------------------------------- */

export default function DeliverabilityDashboard() {
  const { localUser, loading: tenantLoading } = useTenant();
  const [activeTab, setActiveTab] = useState('email');

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

  const healthIcon = (status: ChannelHealth['status']) => {
    switch (status) {
      case 'healthy':
        return <ShieldCheck className="h-4 w-4 text-emerald-400" />;
      case 'warning':
        return <ShieldAlert className="h-4 w-4 text-yellow-400" />;
      case 'critical':
        return <ShieldAlert className="h-4 w-4 text-red-400" />;
      default:
        return <Activity className="h-4 w-4 text-surface-500" />;
    }
  };

  const healthBadge = (status: ChannelHealth['status']) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="success">Healthy</Badge>;
      case 'warning':
        return <Badge variant="warning">Warning</Badge>;
      case 'critical':
        return <Badge variant="danger">Critical</Badge>;
      default:
        return <Badge variant="muted">Check Required</Badge>;
    }
  };

  const renderHealthCards = (
    items: ChannelHealth[],
    detailLink: string,
    detailLabel: string
  ) => (
    <div className="space-y-4">
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-lg border border-surface-800 p-3"
          >
            {healthIcon(item.status)}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-surface-200">{item.label}</span>
              <p className="text-xs text-surface-500">{item.description}</p>
            </div>
            {healthBadge(item.status)}
          </div>
        ))}
      </div>

      <Link
        href={detailLink}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors mt-2"
      >
        {detailLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-surface-100 flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary-400" />
          CRM Deliverability
        </h1>
        <p className="text-sm text-surface-400 mt-1">
          Monitor email and SMS deliverability health across your communication channels.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="flex items-center gap-3 p-2">
            <div className="h-9 w-9 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-200">Email</p>
              <p className="text-xs text-surface-400">Resend</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3 p-2">
            <div className="h-9 w-9 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-200">SMS</p>
              <p className="text-xs text-surface-400">Twilio</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3 p-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-200">Templates</p>
              <p className="text-xs text-surface-400">CAN-SPAM compliant</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3 p-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-200">Compliance</p>
              <p className="text-xs text-surface-400">CTIA + TCPA</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-0 mb-0">
          <Tabs
            tabs={[
              { id: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
              { id: 'sms', label: 'SMS', icon: <MessageSquare className="h-4 w-4" /> },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </CardHeader>
        <CardContent className="pt-4">
          <TabPanel active={activeTab === 'email'}>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-surface-200 mb-1">Email Health Overview</h3>
              <p className="text-xs text-surface-400">
                Authentication, domain verification, and sending reputation status.
              </p>
            </div>
            {renderHealthCards(
              EMAIL_HEALTH,
              '/dashboard/super-admin/email-deliverability',
              'View Full Email Deliverability Settings'
            )}
          </TabPanel>

          <TabPanel active={activeTab === 'sms'}>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-surface-200 mb-1">SMS Health Overview</h3>
              <p className="text-xs text-surface-400">
                10DLC registration, carrier compliance, and consent tracking status.
              </p>
            </div>
            {renderHealthCards(
              SMS_HEALTH,
              '/dashboard/super-admin/sms-deliverability',
              'View Full SMS Deliverability Settings'
            )}
          </TabPanel>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Infrastructure Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-surface-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-4 w-4 text-primary-400" />
                <h4 className="text-sm font-semibold text-surface-200">Email Infrastructure</h4>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-surface-400">Provider</span>
                  <span className="text-surface-200">Resend</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Category tagging</span>
                  <Badge variant="success" dot={false}>Active</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">List-Unsubscribe headers</span>
                  <Badge variant="success" dot={false}>Active</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Delivery tracking</span>
                  <Badge variant="success" dot={false}>Active</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">HTML templates</span>
                  <Badge variant="success" dot={false}>Active</Badge>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-surface-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="h-4 w-4 text-primary-400" />
                <h4 className="text-sm font-semibold text-surface-200">SMS Infrastructure</h4>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-surface-400">Provider</span>
                  <span className="text-surface-200">Twilio</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Business prefix</span>
                  <Badge variant="success" dot={false}>Active</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">STOP/HELP/START</span>
                  <Badge variant="success" dot={false}>Active</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Consent tracking</span>
                  <Badge variant="success" dot={false}>Active</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">First-message compliance</span>
                  <Badge variant="success" dot={false}>Active</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
