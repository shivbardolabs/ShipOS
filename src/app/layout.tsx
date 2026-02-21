import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShipOS - Postal Store Management",
  description:
    "All-in-one management platform for postal stores, mailbox rental, and shipping services",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-950 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
