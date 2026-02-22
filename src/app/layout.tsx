import type { Metadata } from "next";
import { UserProvider } from '@auth0/nextjs-auth0/client';
import "./globals.css";

export const metadata: Metadata = {
  title: "ShipOS — Postal Store Management",
  description:
    "All-in-one management platform for postal stores, mailbox rental, and shipping services. By Bardo Labs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
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
        <body className="min-h-screen bg-surface-950 font-sans antialiased">
          {children}
        </body>
      </UserProvider>
    </html>
  );
}
