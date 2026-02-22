import { Text, Section, Row, Column } from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

interface PackageArrivalEmailProps {
  customerName: string;
  pmbNumber: string;
  carrier: string;
  trackingNumber?: string;
  packageType?: string;
  senderName?: string;
  locationName?: string;
  checkedInAt?: string;
}

export function PackageArrivalEmail({
  customerName = 'Customer',
  pmbNumber = 'PMB-0001',
  carrier = 'Unknown',
  trackingNumber,
  packageType = 'package',
  senderName,
  locationName = 'your mailbox location',
  checkedInAt,
}: PackageArrivalEmailProps) {
  return (
    <BaseLayout preview={`📦 New ${carrier} package received at ${pmbNumber}`}>
      <Text style={heading}>New Package Received!</Text>

      <Text style={paragraph}>
        Hi {customerName},
      </Text>

      <Text style={paragraph}>
        A new {packageType} has been received at {locationName} for your mailbox{' '}
        <strong>{pmbNumber}</strong>.
      </Text>

      <Section style={detailsBox}>
        <Row>
          <Column style={detailLabel}>Carrier</Column>
          <Column style={detailValue}>{carrier.toUpperCase()}</Column>
        </Row>
        {trackingNumber && (
          <Row>
            <Column style={detailLabel}>Tracking</Column>
            <Column style={detailValue}>{trackingNumber}</Column>
          </Row>
        )}
        {senderName && (
          <Row>
            <Column style={detailLabel}>From</Column>
            <Column style={detailValue}>{senderName}</Column>
          </Row>
        )}
        <Row>
          <Column style={detailLabel}>Type</Column>
          <Column style={detailValue}>{packageType}</Column>
        </Row>
        {checkedInAt && (
          <Row>
            <Column style={detailLabel}>Received</Column>
            <Column style={detailValue}>{checkedInAt}</Column>
          </Row>
        )}
      </Section>

      <Text style={paragraph}>
        Please pick up your package at your earliest convenience. Contact your
        location for hours and pickup details.
      </Text>
    </BaseLayout>
  );
}

export default PackageArrivalEmail;

/* Styles */
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
