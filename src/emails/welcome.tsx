import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

interface WelcomeEmailProps {
  customerName: string;
  pmbNumber: string;
  locationName?: string;
  locationAddress?: string;
}

export function WelcomeEmail({
  customerName = 'Customer',
  pmbNumber = 'PMB-0001',
  locationName = 'your mailbox location',
  locationAddress,
}: WelcomeEmailProps) {
  return (
    <BaseLayout preview={`🎉 Welcome to ShipOS Pro — your mailbox ${pmbNumber} is ready!`}>
      <Text style={heading}>Welcome to ShipOS Pro! 🎉</Text>

      <Text style={paragraph}>
        Hi {customerName},
      </Text>

      <Text style={paragraph}>
        Your mailbox <strong>{pmbNumber}</strong> at {locationName} is now
        active. Here&apos;s what you need to know:
      </Text>

      <Section style={featureBox}>
        <Text style={featureItem}>📦 <strong>Package Notifications</strong> — You&apos;ll get alerts whenever a package arrives</Text>
        <Text style={featureItem}>✉️ <strong>Mail Updates</strong> — Stay informed when new mail is received</Text>
        <Text style={featureItem}>🚚 <strong>Shipping Tracking</strong> — Track outgoing shipments in real time</Text>
        <Text style={featureItem}>📋 <strong>CMRA Compliant</strong> — Your mailbox meets all USPS regulations</Text>
      </Section>

      {locationAddress && (
        <Text style={paragraph}>
          <strong>Your location:</strong> {locationAddress}
        </Text>
      )}

      <Text style={paragraph}>
        If you have any questions, don&apos;t hesitate to contact your mailbox
        location. We&apos;re glad to have you!
      </Text>
    </BaseLayout>
  );
}

export default WelcomeEmail;

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

const featureBox: React.CSSProperties = {
  backgroundColor: 'var(--color-status-success-50)',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  border: '1px solid #bbf7d0',
};

const featureItem: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--color-status-success-800)',
  margin: '6px 0',
  lineHeight: '22px',
};
