import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Link,
} from '@react-email/components';
import * as React from 'react';

/* -------------------------------------------------------------------------- */
/*  Base email layout — wraps all ShipOS notification emails                  */
/* -------------------------------------------------------------------------- */

interface BaseLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>📦 ShipOS Pro</Text>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              You received this notification because you are a customer of a
              ShipOS Pro location. If you believe this was sent in error, please
              contact your mailbox provider.
            </Text>
            <Text style={footerText}>
              Powered by{' '}
              <Link href="https://shipospro.com" style={footerLink}>
                ShipOS Pro
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const body: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '20px 0 48px',
};

const header: React.CSSProperties = {
  padding: '24px 32px 16px',
};

const logoText: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#1a1a2e',
  margin: 0,
};

const content: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '32px',
  border: '1px solid #e5e7eb',
};

const hr: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const footer: React.CSSProperties = {
  padding: '0 32px',
};

const footerText: React.CSSProperties = {
  fontSize: '12px',
  color: '#9ca3af',
  lineHeight: '20px',
  margin: '4px 0',
};

const footerLink: React.CSSProperties = {
  color: '#6366f1',
  textDecoration: 'none',
};
