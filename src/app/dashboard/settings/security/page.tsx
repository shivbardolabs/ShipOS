'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/components/tenant-provider';
import { formatDateTime } from '@/lib/utils';
import {
  Shield,
  Clock,
  Smartphone,
  Key,
  Monitor,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface Session {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  loginAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Helper: parse user agent into human-readable form                         */
/* -------------------------------------------------------------------------- */
function parseUserAgent(ua: string | null): string {
  if (!ua) return 'Unknown device';
  if (ua.includes('Chrome')) return 'Chrome Browser';
  if (ua.includes('Firefox')) return 'Firefox Browser';
  if (ua.includes('Safari')) return 'Safari Browser';
  if (ua.includes('Edge')) return 'Edge Browser';
  return 'Unknown Browser';
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function SecurityPage() {
  const { localUser } = useTenant();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/security/sessions')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.sessions) setSessions(data.sessions);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const failedLogins = sessions.filter((s) => !s.success);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Settings"
        description="Manage session security, MFA, and monitor login activity"
        icon={<Shield className="h-6 w-6" />}
      />

      {/* Security overview cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
                <Clock className="h-5 w-5 text-primary-500" />
              </div>
              <div>
                <p className="text-sm text-surface-400">Session Timeout</p>
                <p className="text-lg font-semibold text-surface-100">20 min</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Smartphone className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-surface-400">MFA Status</p>
                <p className="text-lg font-semibold text-surface-100">
                  {localUser?.mfaEnabled ? 'Enabled' : 'Not Enrolled'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-surface-400">Failed Logins</p>
                <p className="text-lg font-semibold text-surface-100">{failedLogins.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MFA Enrollment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5" />
            Two-Factor Authentication (MFA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-300">
                Add an extra layer of security to your account by enabling two-factor authentication.
                MFA is managed through Auth0 — contact your administrator to configure it.
              </p>
              <div className="flex items-center gap-2 mt-3">
                {localUser?.mfaEnabled ? (
                  <Badge variant="success">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    MFA Enabled
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    MFA Not Enrolled
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="secondary" onClick={() => window.open('https://manage.auth0.com', '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Auth0 Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Session Timeout Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Timeout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-surface-400 mb-4">
            Sessions automatically expire after a period of inactivity. A warning is shown
            5 minutes before logout.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-surface-700 p-4">
              <p className="text-sm font-medium text-surface-300">Warning Shown After</p>
              <p className="text-2xl font-bold text-surface-100 mt-1">15 minutes</p>
              <p className="text-xs text-surface-500 mt-1">of inactivity</p>
            </div>
            <div className="rounded-lg border border-surface-700 p-4">
              <p className="text-sm font-medium text-surface-300">Auto Logout After</p>
              <p className="text-2xl font-bold text-surface-100 mt-1">20 minutes</p>
              <p className="text-xs text-surface-500 mt-1">of inactivity</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions / Login History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Login History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-surface-500" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-surface-500 py-4 text-center">
              No login sessions recorded
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700 text-left">
                    <th className="py-2 pr-4 text-surface-400 font-medium">Status</th>
                    <th className="py-2 pr-4 text-surface-400 font-medium">Date</th>
                    <th className="py-2 pr-4 text-surface-400 font-medium">Device</th>
                    <th className="py-2 text-surface-400 font-medium">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 20).map((session) => (
                    <tr key={session.id} className="border-b border-surface-800">
                      <td className="py-3 pr-4">
                        {session.success ? (
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                            Success
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-red-400">
                            <XCircle className="h-4 w-4" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-surface-300">
                        {formatDateTime(session.loginAt)}
                      </td>
                      <td className="py-3 pr-4 text-surface-400">
                        {parseUserAgent(session.userAgent)}
                      </td>
                      <td className="py-3 text-surface-500 font-mono text-xs">
                        {session.ipAddress || '—'}
                      </td>
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
