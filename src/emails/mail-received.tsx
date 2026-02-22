import { Text, Section, Row, Column } from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

interface MailReceivedEmailProps {
  customerName: string;
  pmbNumber: string;
  mailType?: string;
  sender?: string;
  locationName?: string;
}

export function MailReceivedEmail({
  customerName = 'Customer',
  pmbNumber = 'PMB-0001',
  mailType = 'letter',
  sender,
  locationName = 'your mailbox location',
}: MailReceivedEmailProps) {
  return (
    <BaseLayout preview={`✉️ New mail received at ${pmbNumber}`}>
      <Text style={heading}>New Mail Received</Text>

      <Text style={paragraph}>
        Hi {customerName},
      </Text>

      <Text style={paragraph}>
        New mail has been received at {locationName} for your mailbox{' '}
        <strong>{pmbNumber}</strong>.
      </Text>

      <Section style={detailsBox}>
        <Row>
          <Column style={detailLabel}>Type</Column>
          <Column style={detailValue}>{mailType}</Column>
        </Row>
        {sender && (
          <Row>
            <Column style={detailLabel}>From</Column>
            <Column style={detailValue}>{sender}</Column>
          </Row>
        )}
      </Section>

      <Text style={paragraph}>
        Contact your location for mail handling options including forwarding,
        scanning, or pickup.
      </Text>
    </BaseLayout>
  );
}

export default MailReceivedEmail;

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

const detailsBox: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  border: '1px solid #e5e7eb',
};

const detailLabel: React.CSSProperties = {
  fontSize: '13px',
  color: '#6b7280',
  padding: '4px 0',
  width: '100px',
};

const detailValue: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#1f2937',
  padding: '4px 0',
};
