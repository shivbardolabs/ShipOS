'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleSwitch } from './toggle-switch';
import { Bell, Edit3, Mail, Save, Shield, Smartphone, TrendingUp, Wifi, WifiOff } from 'lucide-react';

export interface NotificationsTabProps {
  emailReceipts: boolean;
  setEmailReceipts: (v: boolean) => void;
  smtpFrom: string;
  setSmtpFrom: (v: string) => void;
  smsDefaultArrival: boolean;
  setSmsDefaultArrival: (v: boolean) => void;
  role?: string;
}

export function NotificationsTab({ emailReceipts, setEmailReceipts, smtpFrom, setSmtpFrom, smsDefaultArrival, setSmsDefaultArrival, role }: NotificationsTabProps) {
  return (
    <>
  <div className="space-y-6">
    {/* Notification Preferences — visible to all admins */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary-600" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-surface-500 mb-4">Choose which events trigger notifications and how they are delivered.</p>
        <div className="space-y-3">
          <ToggleSwitch
            checked={smsDefaultArrival}
            onChange={setSmsDefaultArrival}
            label="Send SMS by default for package arrivals"
            description="Auto-SMS when a package is checked in."
          />
          <ToggleSwitch
            checked={emailReceipts}
            onChange={setEmailReceipts}
            label="Email receipt after checkout"
            description="Customers receive an email receipt when a transaction completes."
          />
        </div>
      </CardContent>
    </Card>

    {/* SMS Provider Config — superadmin only */}
    {role === 'superadmin' && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary-600" />
            SMS — Twilio
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-600 border border-primary-500/20">
              <Shield className="h-3 w-3" />
              Super Admin
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-primary-500/15 bg-primary-500/5 p-3.5 mb-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 flex-shrink-0 mt-0.5">
                <TrendingUp className="h-4 w-4 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">📊 SMS has 98% open rate vs 20% for email</p>
                <p className="text-xs text-surface-400 mt-1">
                  Customers respond 5× faster to SMS. Enable SMS as the default channel for time-sensitive notifications like package arrivals.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-surface-500 mt-2">
              SMS notifications are sent via <a href="https://twilio.com" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">Twilio</a>. Configure credentials in your environment variables.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <Input label="Account SID" value="••••••••••••••••" type="password" readOnly placeholder="TWILIO_ACCOUNT_SID" />
              <Input label="Auth Token" value="••••••••••••••••" type="password" readOnly placeholder="TWILIO_AUTH_TOKEN" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <Input label="Phone Number" value={process.env.NEXT_PUBLIC_TWILIO_PHONE || '+1 (XXX) XXX-XXXX'} readOnly placeholder="TWILIO_PHONE_NUMBER" />
              <Input label="Messaging Service SID (optional)" value="••••••••••••••••" type="password" readOnly placeholder="TWILIO_MESSAGING_SERVICE_SID" />
            </div>
            <p className="text-[11px] text-surface-600 mt-2">
              Set via environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
            </p>
          </div>
        </CardContent>
      </Card>
    )}

    {/* Email Provider Config — superadmin only */}
    {role === 'superadmin' && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary-600" />
            Email — Resend
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-600 border border-primary-500/20">
              <Shield className="h-3 w-3" />
              Super Admin
            </span>
            {process.env.NEXT_PUBLIC_RESEND_CONFIGURED === 'true' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-500/20">
                <Wifi className="h-3 w-3" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 border border-amber-500/20">
                <WifiOff className="h-3 w-3" /> Not Configured
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-surface-500 mb-4">
            Email notifications are sent via <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">Resend</a> with React Email templates. Configure your API key and sending domain in your environment variables.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="API Key" value="••••••••••••••••" type="password" readOnly placeholder="RESEND_API_KEY" />
            <Input
              label="From Address"
              value={smtpFrom}
              onChange={(e) => setSmtpFrom(e.target.value)}
              placeholder="notifications@shipospro.com"
            />
          </div>
          <p className="text-[11px] text-surface-600 mt-2">
            Set via environment variables: RESEND_API_KEY, RESEND_FROM_EMAIL
          </p>
        </CardContent>
      </Card>
    )}

    <Card>
      <CardHeader>
        <CardTitle>Notification Templates</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[
            { name: 'Package Arrival', channel: 'Email + SMS', status: 'active' },
            { name: 'Package Reminder', channel: 'Email', status: 'active' },
            { name: 'Mail Received', channel: 'Email', status: 'active' },
            { name: 'ID Expiration Warning', channel: 'Email + SMS', status: 'active' },
            { name: 'Renewal Reminder', channel: 'Email', status: 'active' },
            { name: 'Shipment Update', channel: 'Email + SMS', status: 'inactive' },
            { name: 'Welcome', channel: 'Email', status: 'active' },
          ].map((template) => (
            <div
              key={template.name}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-800/50 transition-colors border border-surface-700/30"
            >
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-surface-500" />
                <div>
                  <span className="text-sm text-surface-200">{template.name}</span>
                  <p className="text-xs text-surface-500">{template.channel}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={template.status === 'active' ? 'success' : 'muted'}
                  dot
                >
                  {template.status}
                </Badge>
                <Button variant="ghost" size="sm" iconOnly>
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <div className="flex justify-end">
      <Button leftIcon={<Save className="h-4 w-4" />}>Save Notification Settings</Button>
    </div>
  </div>
    </>
  );
}
