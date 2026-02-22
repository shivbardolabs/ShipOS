import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

interface RenewalReminderEmailProps {
  customerName: string;
  pmbNumber: string;
  renewalDate: string;
  daysUntilRenewal: number;
  locationName?: string;
}

export function RenewalReminderEmail({
  customerName = 'Customer',
  pmbNumber = 'PMB-0001',
  renewalDate = '',
  daysUntilRenewal = 30,
  locationName = 'your mailbox location',
}: RenewalReminderEmailProps) {
  return (
    <BaseLayout
      preview={`📋 Mailbox ${pmbNumber} renewal — ${daysUntilRenewal} days remaining`}
    >
      <Text style={heading}>Mailbox Renewal Reminder</Text>

      <Text style={paragraph}>
        Hi {customerName},
      </Text>

      <Text style={paragraph}>
        Your mailbox <strong>{pmbNumber}</strong> at {locationName} is due for
        renewal on <strong>{renewalDate}</strong> ({daysUntilRenewal} day
        {daysUntilRenewal !== 1 ? 's' : ''} from now).
      </Text>

      <Section style={infoBox}>
        <Text style={infoText}>
          📋 Please contact your location or visit in person to renew your
          mailbox and continue receiving mail and packages without interruption.
        </Text>
      </Section>

      <Text style={paragraph}>
        If you&apos;ve already renewed, you can disregard this message. Thank
        you for being a valued customer!
      </Text>
    </BaseLayout>
  );
}

export default RenewalReminderEmail;

const heading: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: '700',
  color: '#1a1a2e',
  margin: '0 0 16px',
};

const paragraph: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#374151',
  margin: '0 0 16px',
};

const infoBox: React.CSSProperties = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  border: '1px solid #bfdbfe',
};

const infoText: React.CSSProperties = {
  fontSize: '14px',
  color: '#1e40af',
  margin: 0,
  lineHeight: '22px',
};
