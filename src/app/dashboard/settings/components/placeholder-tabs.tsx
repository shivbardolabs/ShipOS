'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  ArrowRight,
  Database,
  DollarSign,
  Layers,
  Monitor,
  ScreenShare,
  Upload,
} from 'lucide-react';

export function BillingModelsTab() {
  return (
    <>
  <div className="space-y-4">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 rounded-lg bg-primary-500/10">
        <Layers className="h-5 w-5 text-primary-500" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-surface-100">Billing Model Configuration</h3>
        <p className="text-sm text-surface-400">
          Configure subscription, usage-based, and time-of-service billing models for your customers.
        </p>
      </div>
    </div>
    <div className="rounded-lg border border-surface-700 bg-surface-900/50 p-5">
      <p className="text-sm text-surface-300 mb-4">
        The full billing model configuration interface is available on a dedicated page with expanded controls for rate tiers, usage meters, and customer billing profiles.
      </p>
      <Link href="/dashboard/settings/billing-models">
        <Button leftIcon={<ArrowRight className="h-4 w-4" />}>
          Open Billing Model Settings
        </Button>
      </Link>
    </div>
  </div>
    </>
  );
}

export function MigrationTab() {
  return (
    <>
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Upload className="h-5 w-5 text-primary-600" />
        PostalMate Migration
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-surface-400 text-sm">
        Import your existing PostalMate data into ShipOS. Upload a PostalMate backup file (.7z)
        and we&apos;ll migrate your customers, shipments, packages, transactions, and address book.
      </p>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Customers', desc: 'Customer profiles and mailbox assignments' },
          { label: 'Shipments', desc: 'Shipping history, tracking, and costs' },
          { label: 'Packages', desc: 'Package check-in and release records' },
          { label: 'Transactions', desc: 'Invoice and payment history' },
          { label: 'Addresses', desc: 'Ship-to address book entries' },
          { label: 'Products', desc: 'Products, SKUs, and inventory' },
        ].map(item => (
          <div key={item.label} className="bg-surface-800/30 rounded-lg p-3 border border-surface-700/30">
            <p className="text-sm text-surface-200 font-medium">{item.label}</p>
            <p className="text-xs text-surface-500">{item.desc}</p>
          </div>
        ))}
      </div>
      <a href="/dashboard/settings/migration">
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Start Migration
        </Button>
      </a>
    </CardContent>
  </Card>
    </>
  );
}

export function CustomerDisplayTab() {
  return (
    <>
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScreenShare className="h-5 w-5 text-primary-600" />
          Customer Display
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-surface-400 text-sm">
          Configure the customer-facing display for transactions. Set up welcome screens,
          stats dashboards, signature capture, payment flow, and confirmation screens.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Welcome Screen', desc: 'Greeting, announcements, and marketing display' },
            { label: 'Stats Dashboard', desc: 'Package count, mail count, and oldest item' },
            { label: 'Signature Capture', desc: 'Digital signature pad for customer sign-off' },
            { label: 'Payment Screen', desc: 'Integrated payment flow when fees are due' },
            { label: 'Confirmation', desc: 'Transaction confirmation and summary screen' },
            { label: 'Marketing Display', desc: 'Rotating promotions and announcement slides' },
          ].map(item => (
            <div key={item.label} className="bg-surface-800/30 rounded-lg p-3 border border-surface-700/30">
              <p className="text-sm text-surface-200 font-medium">{item.label}</p>
              <p className="text-xs text-surface-500">{item.desc}</p>
            </div>
          ))}
        </div>
        <Link href="/dashboard/customer-display">
          <Button>
            <ScreenShare className="h-4 w-4 mr-2" />
            Open Customer Display
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  </div>
    </>
  );
}

export function PricingTab() {
  return (
    <>
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary-600" />
          Pricing Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-surface-400 text-sm">
          Manage all pricing, billing, and subscription configurations. Includes price lists,
          parcel types, billable actions, carrier incentives, and reports.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Price List', desc: 'Base pricing for all services' },
            { label: 'Parcel Types', desc: 'Package categories and surcharges' },
            { label: 'Billable Actions', desc: 'Fee schedule for store operations' },
            { label: 'Subscriptions', desc: 'Mailbox plan pricing tiers' },
            { label: 'Customer Billing', desc: 'Individual customer billing overrides' },
            { label: 'Carrier Incentives', desc: 'Carrier volume discounts and incentives' },
            { label: 'Reports & Audit', desc: 'Revenue reports and pricing audit trail' },
            { label: 'Digital Mail Costs', desc: 'Scanning and digital delivery pricing' },
          ].map(item => (
            <div key={item.label} className="bg-surface-800/30 rounded-lg p-3 border border-surface-700/30">
              <p className="text-sm text-surface-200 font-medium">{item.label}</p>
              <p className="text-xs text-surface-500">{item.desc}</p>
            </div>
          ))}
        </div>
        <Link href="/dashboard/pricing">
          <Button>
            <DollarSign className="h-4 w-4 mr-2" />
            Open Pricing Dashboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  </div>
    </>
  );
}

export function PlatformConfigTab() {
  return (
    <>
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-primary-600" />
          Platform Config
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-surface-400 text-sm">
          Configure supported client and customer platforms. Manage Desktop, POS, Tablet, and Mobile
          support settings for both employee-facing and customer-facing interfaces.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Desktop Browser', desc: 'Full browser-based app — core platform' },
            { label: 'POS System', desc: 'Integration with Square, Clover, Lightspeed, etc.' },
            { label: 'Tablet', desc: 'Simplified tablet-optimized interface' },
            { label: 'Mobile', desc: 'Mobile companion app configuration' },
            { label: 'Customer POS Screen', desc: '2nd screen customer display at POS' },
            { label: 'Customer Browser', desc: 'Customer self-service web portal' },
          ].map(item => (
            <div key={item.label} className="bg-surface-800/30 rounded-lg p-3 border border-surface-700/30">
              <p className="text-sm text-surface-200 font-medium">{item.label}</p>
              <p className="text-xs text-surface-500">{item.desc}</p>
            </div>
          ))}
        </div>
        <Link href="/dashboard/settings/platform-config">
          <Button>
            <Monitor className="h-4 w-4 mr-2" />
            Open Platform Config
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  </div>
    </>
  );
}

export function LegacyMigrationTab() {
  return (
    <>
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary-600" />
          Legacy Migration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-surface-400 text-sm">
          Import data from legacy systems (PostalMate, Mail Manager, etc.) via CSV. Supports
          customer records, package history, and address books with validation and dry-run.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'PostalMate Import', desc: 'Customer & mailbox data from PostalMate CSV' },
            { label: 'Mail Manager Import', desc: 'Customer data from Mail Manager CSV' },
            { label: 'Package History', desc: 'Import historical package tracking records' },
            { label: 'Validation & Dry Run', desc: 'Preview and validate before committing' },
          ].map(item => (
            <div key={item.label} className="bg-surface-800/30 rounded-lg p-3 border border-surface-700/30">
              <p className="text-sm text-surface-200 font-medium">{item.label}</p>
              <p className="text-xs text-surface-500">{item.desc}</p>
            </div>
          ))}
        </div>
        <Link href="/dashboard/settings/legacy-migration">
          <Button>
            <Database className="h-4 w-4 mr-2" />
            Open Legacy Migration Tool
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  </div>
    </>
  );
}

