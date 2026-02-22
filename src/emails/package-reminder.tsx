import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

interface PackageReminderEmailProps {
  customerName: string;
  pmbNumber: string;
  packageCount: number;
  oldestDays: number;
  locationName?: string;
}

export function PackageReminderEmail({
  customerName = 'Customer',
  pmbNumber = 'PMB-0001',
  packageCount = 1,
  oldestDays = 7,
  locationName = 'your mailbox location',
}: PackageReminderEmailProps) {
  return (
    <BaseLayout preview={`⏰ Reminder: ${packageCount} package(s) waiting at ${pmbNumber}`}>
      <Text style={heading}>Package Pickup Reminder</Text>

      <Text style={paragraph}>
        Hi {customerName},
      </Text>

      <Text style={paragraph}>
        This is a friendly reminder that you have{' '}
        <strong>{packageCount} package{packageCount > 1 ? 's' : ''}</strong>{' '}
        waiting for pickup at {locationName} for mailbox{' '}
        <strong>{pmbNumber}</strong>.
      </Text>

      <Section style={alertBox}>
        <Text style={alertText}>
          ⏰ Your oldest package has been waiting for{' '}
          <strong>{oldestDays} day{oldestDays > 1 ? 's' : ''}</strong>.
          {oldestDays >= 14 && ' Storage fees may apply.'}
        </Text>
      </Section>

      <Text style={paragraph}>
        Please pick up your package{packageCount > 1 ? 's' : ''} at your
        earliest convenience to avoid any storage fees.
      </Text>
    </BaseLayout>
  );
}

export default PackageReminderEmail;

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

const alertBox: React.CSSProperties = {
  backgroundColor: '#fffbeb',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  border: '1px solid #fde68a',
};

const alertText: React.CSSProperties = {
  fontSize: '14px',
  color: '#92400e',
  margin: 0,
  lineHeight: '22px',
};
