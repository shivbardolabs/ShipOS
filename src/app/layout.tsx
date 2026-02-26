import type { Metadata } from "next";
import { Suspense } from "react";
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { ThemeProvider } from '@/components/theme-provider';
import { TenantProvider } from '@/components/tenant-provider';
import { FeatureFlagProvider } from '@/components/feature-flag-provider';
import { PostHogAnalyticsProvider } from '@/components/posthog-provider';
import { GTMProvider, GTMNoScript } from '@/components/gtm-provider';
import "./globals.css";

export const metadata: Metadata = {
  title: "ShipOS — Postal Store Management",
  description:
    "All-in-one management platform for postal stores, mailbox rental, and shipping services. By Bardo Labs.",
};

/* Inline script to set theme class before first paint — prevents flash */
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('shipos-theme');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.add('light');
      }
    } catch(e) {
      document.documentElement.classList.add('light');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/shipos-logo-mark.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4F46E5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ShipOS" />
      </head>
      <UserProvider>
        <TenantProvider>
          <FeatureFlagProvider>
            <ThemeProvider>
              <Suspense fallback={null}>
                <PostHogAnalyticsProvider>
                  <GTMProvider />
                  <body className="min-h-screen bg-surface-950 font-sans antialiased">
                    <GTMNoScript />
                    {children}
                  </body>
                </PostHogAnalyticsProvider>
              </Suspense>
            </ThemeProvider>
          </FeatureFlagProvider>
        </TenantProvider>
      </UserProvider>
    </html>
  );
}
