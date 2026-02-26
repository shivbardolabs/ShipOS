'use client';

import { useTenant } from '@/components/tenant-provider';
import { Card } from '@/components/ui/card';
import {
  Tag,
  ExternalLink,
  AlertCircle,
  Settings,
  Activity,
  Code2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Active integrations list                                                   */
/* -------------------------------------------------------------------------- */

interface Integration {
  name: string;
  description: string;
  envVar: string;
  configured: boolean;
  dashboardUrl?: string;
}

function useIntegrations(): Integration[] {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return [
    {
      name: 'PostHog',
      description: 'Product analytics, session replay, feature flags',
      envVar: 'NEXT_PUBLIC_POSTHOG_KEY',
      configured: !!posthogKey,
      dashboardUrl: posthogKey ? posthogHost.replace('/i.', '/app.') : undefined,
    },
    {
      name: 'Google Tag Manager',
      description: 'Tag management, conversion tracking, third-party scripts',
      envVar: 'NEXT_PUBLIC_GTM_ID',
      configured: !!gtmId,
      dashboardUrl: gtmId
        ? `https://tagmanager.google.com/#/container/accounts/0/containers/0/workspaces`
        : 'https://tagmanager.google.com/',
    },
    {
      name: 'Google Analytics',
      description: 'Traffic analytics (deploy via GTM — no code change needed)',
      envVar: '— via GTM',
      configured: !!gtmId,
    },
    {
      name: 'Facebook Pixel',
      description: 'Conversion tracking (deploy via GTM — no code change needed)',
      envVar: '— via GTM',
      configured: false,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function TagManagerAdminPage() {
  const { localUser } = useTenant();
  const integrations = useIntegrations();

  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  // ── Guard: superadmin only ──
  if (localUser && localUser.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-surface-600 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-surface-300">Access Denied</h2>
          <p className="text-surface-500 mt-1">Superadmin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
          <Tag className="h-7 w-7 text-indigo-400" />
          Tag Manager
        </h1>
        <p className="text-surface-400 mt-1">
          Google Tag Manager configuration and third-party integrations
        </p>
      </div>

      {/* ── GTM Container Status ───────────────────────────────────────── */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
              <Code2 className="h-5 w-5 text-blue-400" />
              Google Tag Manager
            </h2>
            <p className="text-surface-400 text-sm mt-1">
              Industry-standard tag management — deploy analytics, conversion pixels, and
              marketing scripts without code changes
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              gtmId
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${gtmId ? 'bg-green-400' : 'bg-yellow-400'}`} />
            {gtmId ? 'Active' : 'Not configured'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg bg-surface-900/50 border border-surface-800 p-4">
            <p className="text-xs text-surface-500 uppercase tracking-wide">Container ID</p>
            <p className="text-sm text-surface-300 mt-1 font-mono">
              {gtmId || 'Not set'}
            </p>
          </div>
          <div className="rounded-lg bg-surface-900/50 border border-surface-800 p-4">
            <p className="text-xs text-surface-500 uppercase tracking-wide">Environment Variable</p>
            <p className="text-sm text-surface-300 mt-1 font-mono">NEXT_PUBLIC_GTM_ID</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <a
            href="https://tagmanager.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Open GTM Console
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a
            href="https://support.google.com/tagmanager/answer/6103696"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-300 transition-colors"
          >
            Setup Guide
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </Card>

      {/* ── Setup Instructions ─────────────────────────────────────────── */}
      <Card>
        <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
          <Settings className="h-5 w-5 text-indigo-400" />
          How to Add Tags
        </h2>
        <div className="mt-3 space-y-3 text-sm text-surface-400">
          <div className="rounded-lg bg-surface-900/50 border border-surface-800 p-4">
            <p className="font-medium text-surface-200 mb-2">1. Get your GTM Container ID</p>
            <p>
              Sign in to{' '}
              <a
                href="https://tagmanager.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline"
              >
                tagmanager.google.com
              </a>
              , create a container (Web), and copy the ID (starts with <code className="bg-surface-800 px-1 py-0.5 rounded text-xs">GTM-</code>).
            </p>
          </div>
          <div className="rounded-lg bg-surface-900/50 border border-surface-800 p-4">
            <p className="font-medium text-surface-200 mb-2">2. Add the environment variable</p>
            <p>
              Set <code className="bg-surface-800 px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX</code> in
              your <code className="bg-surface-800 px-1 py-0.5 rounded text-xs">.env</code> or hosting provider.
              Redeploy the app.
            </p>
          </div>
          <div className="rounded-lg bg-surface-900/50 border border-surface-800 p-4">
            <p className="font-medium text-surface-200 mb-2">3. Add tags in GTM</p>
            <p>
              Use the GTM web interface to add Google Analytics, Meta Pixel, or any other tags.
              ShipOS pushes a <code className="bg-surface-800 px-1 py-0.5 rounded text-xs">page_view</code> event
              to the data layer on every route change — use it as a trigger.
            </p>
          </div>
        </div>
      </Card>

      {/* ── Active Integrations ────────────────────────────────────────── */}
      <Card>
        <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-400" />
          Integrations
        </h2>
        <p className="text-surface-400 text-sm mt-1 mb-4">
          Analytics and marketing integrations status
        </p>

        <div className="space-y-2">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center justify-between rounded-lg bg-surface-900/50 border border-surface-800 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {integration.configured ? (
                  <CheckCircle2 className="h-4.5 w-4.5 text-green-400 shrink-0" />
                ) : (
                  <XCircle className="h-4.5 w-4.5 text-surface-600 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-surface-200">{integration.name}</p>
                  <p className="text-xs text-surface-500">{integration.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <code className="text-xs text-surface-500 font-mono hidden sm:block">
                  {integration.envVar}
                </code>
                {integration.dashboardUrl && (
                  <a
                    href={integration.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-surface-500 hover:text-indigo-400 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
