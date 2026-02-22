import { Text, Section, Row, Column } from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

interface ShipmentUpdateEmailProps {
  customerName: string;
  pmbNumber: string;
  carrier: string;
  trackingNumber?: string;
  service?: string;
  status: string;
  destination?: string;
  locationName?: string;
}

export function ShipmentUpdateEmail({
  customerName = 'Customer',
  pmbNumber = 'PMB-0001',
  carrier = 'Unknown',
  trackingNumber,
  service,
  status = 'shipped',
  destination,
  locationName = 'your mailbox location',
}: ShipmentUpdateEmailProps) {
  const statusLabel: Record<string, string> = {
    pending: 'Pending',
    label_created: 'Label Created',
    shipped: 'Shipped',
    delivered: 'Delivered',
    returned: 'Returned',
  };

  const statusEmoji: Record<string, string> = {
    pending: '⏳',
    label_created: '🏷️',
    shipped: '🚚',
    delivered: '✅',
    returned: '↩️',
  };

  return (
    <BaseLayout
      preview={`${statusEmoji[status] || '📦'} Shipment ${statusLabel[status] || status} — ${carrier}`}
    >
      <Text style={heading}>Shipment Update</Text>

      <Text style={paragraph}>
        Hi {customerName},
      </Text>

      <Text style={paragraph}>
        Here&apos;s an update on your shipment from {locationName} for mailbox{' '}
        <strong>{pmbNumber}</strong>:
      </Text>

      <Section style={detailsBox}>
        <Row>
          <Column style={detailLabel}>Status</Column>
          <Column style={detailValue}>
            {statusEmoji[status] || '📦'} {statusLabel[status] || status}
          </Column>
        </Row>
        <Row>
          <Column style={detailLabel}>Carrier</Column>
          <Column style={detailValue}>{carrier.toUpperCase()}</Column>
        </Row>
        {service && (
          <Row>
            <Column style={detailLabel}>Service</Column>
            <Column style={detailValue}>{service}</Column>
          </Row>
        )}
        {trackingNumber && (
          <Row>
            <Column style={detailLabel}>Tracking</Column>
            <Column style={detailValue}>{trackingNumber}</Column>
          </Row>
        )}
        {destination && (
          <Row>
            <Column style={detailLabel}>Destination</Column>
            <Column style={detailValue}>{destination}</Column>
          </Row>
        )}
      </Section>
    </BaseLayout>
  );
}

export default ShipmentUpdateEmail;

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
