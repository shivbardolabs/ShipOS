'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { ToggleSwitch } from './toggle-switch';
import { Bell, Check, Edit3, Mail, Save, Shield, Smartphone, TrendingUp, Wifi, WifiOff } from 'lucide-react';

interface NotificationTemplate {
  name: string;
  channel: string;
  status: string;
  subject: string;
  bodyEmail: string;
  bodySms: string;
}

export interface NotificationsTabProps {
  emailReceipts: boolean;
  setEmailReceipts: (v: boolean) => void;
  smtpFrom: string;
  setSmtpFrom: (v: string) => void;
  smsDefaultArrival: boolean;
  setSmsDefaultArrival: (v: boolean) => void;
  role?: string;
}

const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    name: 'Package Arrival',
    channel: 'Email + SMS',
    status: 'active',
    subject: '📦 New {{carrier}} package at {{pmbNumber}}',
    bodyEmail: 'Hi {{customerName}},\n\nA new {{carrier}} package has arrived at your mailbox {{pmbNumber}}.\n\nPlease pick up at your convenience.',
    bodySms: 'Hi {{customerName}}, a new {{carrier}} package has arrived at your mailbox {{pmbNumber}}. Please pick up at your convenience.',
  },
  {
    name: 'Package Reminder',
    channel: 'Email',
    status: 'active',
    subject: '⏰ {{packageCount}} package(s) waiting at {{pmbNumber}}',
    bodyEmail: 'Hi {{customerName}},\n\nReminder: you have {{packageCount}} package(s) waiting at {{pmbNumber}}.\n\nPlease pick up soon to avoid storage fees.',
    bodySms: 'Hi {{customerName}}, reminder: you have {{packageCount}} package(s) waiting at {{pmbNumber}}. Please pick up soon.',
  },
  {
    name: 'Mail Received',
    channel: 'Email',
    status: 'active',
    subject: '✉️ New mail received at {{pmbNumber}}',
    bodyEmail: 'Hi {{customerName}},\n\nNew {{mailType}} has been received at your mailbox {{pmbNumber}}.\n\nContact your location for handling options.',
    bodySms: 'Hi {{customerName}}, new {{mailType}} has been received at your mailbox {{pmbNumber}}. Contact your location for handling options.',
  },
  {
    name: 'ID Expiration Warning',
    channel: 'Email + SMS',
    status: 'active',
    subject: '⚠️ ID expiration notice for {{pmbNumber}}',
    bodyEmail: 'Hi {{customerName}},\n\nYour {{idType}} on file for {{pmbNumber}} {{expiryMessage}}.\n\nPlease bring updated ID to your location.',
    bodySms: 'Hi {{customerName}}, your {{idType}} on file for {{pmbNumber}} {{expiryMessage}}. Please bring updated ID to your location.',
  },
  {
    name: 'Renewal Reminder',
    channel: 'Email',
    status: 'active',
    subject: '🔔 Mailbox renewal reminder for {{pmbNumber}}',
    bodyEmail: 'Hi {{customerName}},\n\nYour mailbox {{pmbNumber}} renewal is due on {{renewalDate}}.\n\nPlease renew before the due date to avoid any interruption in service.',
    bodySms: 'Hi {{customerName}}, your mailbox {{pmbNumber}} renewal is due on {{renewalDate}}. Please renew to avoid service interruption.',
  },
  {
    name: 'Shipment Update',
    channel: 'Email + SMS',
    status: 'inactive',
    subject: '🚚 Shipment update for {{pmbNumber}}',
    bodyEmail: 'Hi {{customerName}},\n\nYour shipment status has been updated.\n\nCheck your dashboard for details.',
    bodySms: 'Hi {{customerName}}, your shipment status has been updated. Check your dashboard for details.',
  },
  {
    name: 'Welcome',
    channel: 'Email',
    status: 'active',
    subject: '🎉 Welcome to ShipOS Pro — {{pmbNumber}} is ready!',
    bodyEmail: 'Welcome to ShipOS Pro, {{customerName}}!\n\nYour mailbox {{pmbNumber}} is now active at {{locationName}}.\n\nYou\'ll receive notifications for packages and mail.',
    bodySms: 'Welcome to ShipOS Pro, {{customerName}}! Your mailbox {{pmbNumber}} is now active. You\'ll receive notifications for packages and mail.',
  },
];

export function NotificationsTab({ emailReceipts, setEmailReceipts, smtpFrom, setSmtpFrom, smsDefaultArrival, setSmsDefaultArrival, role }: NotificationsTabProps) {
  const [templates, setTemplates] = useState<NotificationTemplate[]>(NOTIFICATION_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    setTemplateSaving(true);
    // Update the template in the local list
    setTemplates((prev) =>
      prev.map((t) => (t.name === editingTemplate.name ? { ...editingTemplate } : t))
    );
    // Simulate save (templates are client-side for now)
    setTimeout(() => {
      setTemplateSaving(false);
      setTemplateSaved(true);
      setTimeout(() => {
        setTemplateSaved(false);
        setEditingTemplate(null);
      }, 1000);
    }, 400);
  };

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
          {templates.map((template) => (
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
                <Button variant="ghost" size="sm" iconOnly onClick={() => setEditingTemplate({ ...template })}>
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

  {/* Template Edit Modal */}
  <Modal
    open={!!editingTemplate}
    onClose={() => setEditingTemplate(null)}
    title={`Edit Template — ${editingTemplate?.name || ''}`}
    size="lg"
    footer={
      <>
        <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(null)}>
          Cancel
        </Button>
        <Button
          size="sm"
          leftIcon={templateSaved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          onClick={handleSaveTemplate}
          loading={templateSaving}
          disabled={templateSaving}
        >
          {templateSaved ? 'Saved!' : 'Save Changes'}
        </Button>
      </>
    }
  >
    {editingTemplate && (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Template Name"
            value={editingTemplate.name}
            onChange={(e) => setEditingTemplate((prev) => prev ? { ...prev, name: e.target.value } : prev)}
          />
          <Select
            label="Channel"
            value={editingTemplate.channel}
            onChange={(e) => setEditingTemplate((prev) => prev ? { ...prev, channel: e.target.value } : prev)}
            options={[
              { value: 'Email', label: 'Email' },
              { value: 'SMS', label: 'SMS' },
              { value: 'Email + SMS', label: 'Email + SMS' },
            ]}
          />
        </div>
        <Input
          label="Subject Line"
          value={editingTemplate.subject}
          onChange={(e) => setEditingTemplate((prev) => prev ? { ...prev, subject: e.target.value } : prev)}
          placeholder="Email subject line — use {{variable}} for dynamic values"
        />
        <Textarea
          label="Email Body"
          value={editingTemplate.bodyEmail}
          onChange={(e) => setEditingTemplate((prev) => prev ? { ...prev, bodyEmail: e.target.value } : prev)}
          rows={4}
          placeholder="Email body content — use {{variable}} for dynamic values"
        />
        <Textarea
          label="SMS Body"
          value={editingTemplate.bodySms}
          onChange={(e) => setEditingTemplate((prev) => prev ? { ...prev, bodySms: e.target.value } : prev)}
          rows={3}
          placeholder="SMS body content — use {{variable}} for dynamic values"
        />
        <ToggleSwitch
          checked={editingTemplate.status === 'active'}
          onChange={(val) => setEditingTemplate((prev) => prev ? { ...prev, status: val ? 'active' : 'inactive' } : prev)}
          label="Active"
          description="Enable or disable this notification template"
        />
      </div>
    )}
  </Modal>
    </>
  );
}
