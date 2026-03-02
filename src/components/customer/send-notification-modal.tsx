'use client';

import { useState, useCallback } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Send, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import type { Customer } from '@/lib/types';

interface SendNotificationModalProps {
  customer: Customer;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
}

const NOTIFICATION_TYPES = [
  { value: 'package_arrival', label: 'Package Arrival' },
  { value: 'package_reminder', label: 'Package Reminder' },
  { value: 'mail_received', label: 'Mail Received' },
  { value: 'id_expiring', label: 'ID Expiring' },
  { value: 'renewal_reminder', label: 'Renewal Reminder' },
  { value: 'shipment_update', label: 'Shipment Update' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'custom', label: 'Custom Message' },
];

const CHANNEL_OPTIONS = [
  { value: 'default', label: 'Customer Preference' },
  { value: 'email', label: 'Email Only' },
  { value: 'sms', label: 'SMS Only' },
  { value: 'both', label: 'Email + SMS' },
];

export function SendNotificationModal({ customer, open, onClose, onSent }: SendNotificationModalProps) {
  const [type, setType] = useState('package_arrival');
  const [channel, setChannel] = useState('default');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCustom = type === 'custom';
  const fullName = `${customer.firstName} ${customer.lastName}`;

  // Determine what channels the customer has enabled
  const customerChannels = [
    customer.notifyEmail && 'Email',
    customer.notifySms && 'SMS',
  ].filter(Boolean);

  const resetForm = useCallback(() => {
    setType('package_arrival');
    setChannel('default');
    setSubject('');
    setBody('');
    setSending(false);
    setSent(false);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSend = useCallback(async () => {
    setError(null);

    if (isCustom && !subject.trim()) {
      setError('Subject is required for custom notifications');
      return;
    }
    if (isCustom && !body.trim()) {
      setError('Message body is required for custom notifications');
      return;
    }

    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        type,
        customerId: customer.id,
      };

      if (channel !== 'default') {
        payload.channel = channel;
      }

      if (isCustom) {
        payload.subject = subject.trim();
        payload.body = body.trim();
      }

      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to send (${res.status})`);
      }

      setSent(true);
      onSent?.();

      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send notification');
    } finally {
      setSending(false);
    }
  }, [type, channel, subject, body, customer.id, isCustom, onSent, handleClose]);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Send Notification"
      description={`${fullName} · ${customer.pmbNumber}`}
      size="md"
      footer={
        sent ? (
          <div className="flex items-center gap-2 text-emerald-500">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Notification sent</span>
          </div>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={handleClose} disabled={sending}>
              Cancel
            </Button>
            <Button
              size="sm"
              leftIcon={sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? 'Sending…' : 'Send Notification'}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-5">
        {/* Customer preferences info */}
        <div className="rounded-lg bg-surface-800/50 border border-surface-700 px-4 py-3">
          <p className="text-xs text-surface-400 mb-1">Customer notification preferences</p>
          <div className="flex items-center gap-3">
            {customerChannels.length > 0 ? (
              customerChannels.map((ch) => (
                <span
                  key={ch}
                  className="status-badge text-[10px] bg-emerald-100 text-emerald-600 border-emerald-200"
                >
                  {ch} enabled
                </span>
              ))
            ) : (
              <span className="text-xs text-surface-500 italic">No channels enabled</span>
            )}
          </div>
        </div>

        {/* Notification type */}
        <Select
          label="Notification Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={NOTIFICATION_TYPES}
        />

        {/* Channel override */}
        <Select
          label="Delivery Channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          options={CHANNEL_OPTIONS}
        />

        {/* Custom message fields */}
        {isCustom && (
          <>
            <Input
              label="Subject"
              value={subject}
              placeholder="Notification subject…"
              onChange={(e) => setSubject(e.target.value)}
            />
            <Textarea
              label="Message Body"
              value={body}
              placeholder="Write your message to the customer…"
              onChange={(e) => setBody(e.target.value)}
              rows={4}
            />
          </>
        )}

        {/* Error message */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
