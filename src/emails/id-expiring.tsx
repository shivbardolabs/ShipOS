import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

interface IdExpiringEmailProps {
  customerName: string;
  pmbNumber: string;
  idType: string;
  expirationDate: string;
  daysUntilExpiry: number;
  locationName?: string;
}

export function IdExpiringEmail({
  customerName = 'Customer',
  pmbNumber = 'PMB-0001',
  idType = 'ID',
  expirationDate = '',
  daysUntilExpiry = 30,
  locationName = 'your mailbox location',
}: IdExpiringEmailProps) {
  const isUrgent = daysUntilExpiry <= 7;

  return (
    <BaseLayout
      preview={`⚠️ Your ${idType} expires ${daysUntilExpiry <= 0 ? 'today' : `in ${daysUntilExpiry} days`} — action required for ${pmbNumber}`}
    >
      <Text style={heading}>ID Expiration Notice</Text>

      <Text style={paragraph}>
        Hi {customerName},
      </Text>

      <Text style={paragraph}>
        Your <strong>{idType}</strong> on file for mailbox{' '}
        <strong>{pmbNumber}</strong> is{' '}
        {daysUntilExpiry <= 0
          ? 'expired'
          : `expiring on ${expirationDate} (${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''} from now)`}
        .
      </Text>

      <Section style={isUrgent ? urgentBox : warningBox}>
        <Text style={isUrgent ? urgentText : warningText}>
          {isUrgent
            ? '🚨 Urgent: Please update your ID immediately to maintain compliance with USPS CMRA regulations. Your mailbox services may be interrupted without a valid ID on file.'
            : '⚠️ Please bring your updated ID to your location to keep your mailbox account in good standing. A valid government-issued ID is required under USPS CMRA regulations.'}
        </Text>
      </Section>

      <Text style={paragraph}>
        Visit {locationName} with your renewed ID at your earliest convenience.
        If you have questions, contact your location directly.
      </Text>
    </BaseLayout>
  );
}

export default IdExpiringEmail;

const heading: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: '700',
  color: '#1a1a2e',
  margin: '0 0 16px',
};

const paragraph: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '24px',
  color: 'var(--color-surface-300)',
  margin: '0 0 16px',
};

const warningBox: React.CSSProperties = {
  backgroundColor: 'var(--color-status-warning-50)',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  border: '1px solid #fde68a',
};

const warningText: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--color-status-warning-800)',
  margin: 0,
  lineHeight: '22px',
};

const urgentBox: React.CSSProperties = {
  backgroundColor: 'var(--color-status-error-50)',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  border: '1px solid #fecaca',
};

const urgentText: React.CSSProperties = {
  fontSize: '14px',
  color: '#991b1b',
  margin: 0,
  lineHeight: '22px',
};
