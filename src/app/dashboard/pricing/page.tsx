'use client';

import { useState } from 'react';
import { useTenant } from '@/components/tenant-provider';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Layers,
  Package,
  ClipboardList,
  Crown,
  CreditCard,
  Truck,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import {
  PriceListTab,
  ParcelTypesTab,
  BillableActionsTab,
  SubscriptionsTab,
  CustomerBillingTab,
  CarrierIncentivesTab,
  ReportsAuditTab,
} from '@/components/pricing';

/* -------------------------------------------------------------------------- */
/*  Tab definitions                                                           */
/* -------------------------------------------------------------------------- */
const TABS = [
  { id: 'price-list', label: 'Price List', icon: <Layers className="h-3.5 w-3.5" /> },
  { id: 'parcel-types', label: 'Parcel Types', icon: <Package className="h-3.5 w-3.5" /> },
  { id: 'billable-actions', label: 'Billable Actions', icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { id: 'subscriptions', label: 'Subscriptions', icon: <Crown className="h-3.5 w-3.5" /> },
  { id: 'billing', label: 'Customer Billing', icon: <CreditCard className="h-3.5 w-3.5" /> },
  { id: 'carrier-incentives', label: 'Carrier Incentives', icon: <Truck className="h-3.5 w-3.5" /> },
  { id: 'reports', label: 'Reports & Audit', icon: <BarChart3 className="h-3.5 w-3.5" /> },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function PricingDashboardPage() {
  const { localUser } = useTenant();
  const [activeTab, setActiveTab] = useState('price-list');
  const role = localUser?.role;

  /* Manager + access only */
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShieldCheck className="h-12 w-12 text-surface-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-surface-300">Access Restricted</h2>
          <p className="text-sm text-surface-500 mt-1">
            The Pricing Dashboard is available to managers and administrators only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
            <DollarSign className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-surface-100">Pricing Dashboard</h1>
              <Badge variant="info" dot={false}>v2</Badge>
            </div>
            <p className="text-sm text-surface-500">
              Manage pricing, subscriptions, billing, carrier incentives, and financial reporting.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab panels */}
      <TabPanel active={activeTab === 'price-list'}>
        <PriceListTab />
      </TabPanel>

      <TabPanel active={activeTab === 'parcel-types'}>
        <ParcelTypesTab />
      </TabPanel>

      <TabPanel active={activeTab === 'billable-actions'}>
        <BillableActionsTab />
      </TabPanel>

      <TabPanel active={activeTab === 'subscriptions'}>
        <SubscriptionsTab />
      </TabPanel>

      <TabPanel active={activeTab === 'billing'}>
        <CustomerBillingTab />
      </TabPanel>

      <TabPanel active={activeTab === 'carrier-incentives'}>
        <CarrierIncentivesTab />
      </TabPanel>

      <TabPanel active={activeTab === 'reports'}>
        <ReportsAuditTab />
      </TabPanel>
    </div>
  );
}
