'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { shipments, customers } from '@/lib/mock-data';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Shipment } from '@/lib/types';
import {
  Plus,
  Truck,
  DollarSign,
  TrendingUp,
  Clock,
  Package,
  MoreHorizontal,
  Eye,
  Printer,
  Copy } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Computed stats                                                            */
/* -------------------------------------------------------------------------- */
const shipmentsToday = shipments.filter(
  (s) => new Date(s.createdAt).toDateString() === new Date('2026-02-21').toDateString()
).length || 6;

const revenueToday = shipments
  .filter((s) => new Date(s.createdAt).toDateString() === new Date('2026-02-21').toDateString())
  .reduce((sum, s) => sum + s.retailPrice, 0) || 847.5;

const avgMargin =
  shipments.reduce((sum, s) => {
    if (s.wholesaleCost === 0) return sum;
    return sum + ((s.retailPrice - s.wholesaleCost) / s.retailPrice) * 100;
  }, 0) / shipments.length;

const pendingCount = shipments.filter(
  (s) => s.status === 'pending' || s.status === 'label_created'
).length;

/* -------------------------------------------------------------------------- */
/*  Shipping Page                                                             */
/* -------------------------------------------------------------------------- */
export default function ShippingPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [showNewShipment, setShowNewShipment] = useState(false);
  const [actionRow, setActionRow] = useState<string | null>(null);

  // Form state for new shipment
  const [formData, setFormData] = useState({
    customerId: '',
    carrier: '',
    service: '',
    destination: '',
    weight: '',
    length: '',
    width: '',
    height: '',
    wholesaleCost: '',
    marginPercent: '40',
    insurance: false,
    insuranceAmount: '' });

  const retailPrice = useMemo(() => {
    const wholesale = parseFloat(formData.wholesaleCost) || 0;
    const margin = parseFloat(formData.marginPercent) || 0;
    return wholesale * (1 + margin / 100);
  }, [formData.wholesaleCost, formData.marginPercent]);

  // Filter shipments by tab
  const filteredShipments = useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return shipments.filter((s) => s.status === 'pending' || s.status === 'label_created');
      case 'shipped':
        return shipments.filter((s) => s.status === 'shipped');
      case 'delivered':
        return shipments.filter((s) => s.status === 'delivered');
      default:
        return shipments;
    }
  }, [activeTab]);

  const tabs = [
    { id: 'all', label: 'All Shipments', count: shipments.length },
    { id: 'pending', label: 'Pending', count: shipments.filter((s) => s.status === 'pending' || s.status === 'label_created').length },
    { id: 'shipped', label: 'Shipped', count: shipments.filter((s) => s.status === 'shipped').length },
    { id: 'delivered', label: 'Delivered', count: shipments.filter((s) => s.status === 'delivered').length },
  ];

  const carrierServiceMap: Record<string, string[]> = {
    ups: ['Ground', '2-Day Air', 'Next Day Air', '3-Day Select'],
    fedex: ['Ground', 'Express', 'Overnight', '2Day', 'Home Delivery'],
    usps: ['First Class', 'Priority Mail', 'Priority Mail Express', 'Ground Advantage'],
    dhl: ['International Economy', 'International Express'] };

  const columns: Column<Shipment & Record<string, unknown>>[] = [
    {
      key: 'carrier',
      label: 'Carrier / Service',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium text-surface-100 uppercase text-xs">{row.carrier}</span>
          <p className="text-xs text-surface-500">{row.service}</p>
        </div>
      ) },
    {
      key: 'trackingNumber',
      label: 'Tracking #',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-primary-600">{row.trackingNumber}</span>
      ) },
    {
      key: 'customer',
      label: 'Customer',
      render: (row) => (
        <div>
          <span className="text-surface-200">
            {row.customer ? `${row.customer.firstName} ${row.customer.lastName}` : '—'}
          </span>
          <p className="text-xs text-surface-500">{row.customer?.pmbNumber}</p>
        </div>
      ) },
    {
      key: 'destination',
      label: 'Destination',
      sortable: true,
      render: (row) => <span className="text-surface-300 text-xs">{row.destination || '—'}</span> },
    {
      key: 'weight',
      label: 'Weight',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="text-surface-300">{row.weight ? `${row.weight} lbs` : '—'}</span>
      ) },
    {
      key: 'wholesaleCost',
      label: 'Wholesale',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="text-surface-400 text-xs">{formatCurrency(row.wholesaleCost)}</span>
      ) },
    {
      key: 'retailPrice',
      label: 'Retail',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="text-surface-200 font-medium">{formatCurrency(row.retailPrice)}</span>
      ) },
    {
      key: 'profit',
      label: 'Profit',
      align: 'right',
      render: (row) => {
        const profit = row.retailPrice - row.wholesaleCost;
        return (
          <span className={profit > 0 ? 'text-emerald-600 font-medium' : 'text-red-600'}>
            {formatCurrency(profit)}
          </span>
        );
      } },
    {
      key: 'paymentStatus',
      label: 'Payment',
      render: (row) => (
        <Badge status={row.paymentStatus} dot>
          {row.paymentStatus}
        </Badge>
      ) },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge status={row.status} dot>
          {row.status.replace('_', ' ')}
        </Badge>
      ) },
    {
      key: 'createdAt',
      label: 'Date',
      sortable: true,
      render: (row) => <span className="text-surface-400 text-xs">{formatDate(row.createdAt)}</span> },
    {
      key: 'actions',
      label: '',
      width: 'w-10',
      render: (row) => (
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={(e) => {
              e.stopPropagation();
              setActionRow(actionRow === row.id ? null : row.id);
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {actionRow === row.id && (
            <div className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-surface-700 bg-surface-900 shadow-xl py-1">
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:bg-surface-800">
                <Eye className="h-3.5 w-3.5" /> View Details
              </button>
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:bg-surface-800">
                <Copy className="h-3.5 w-3.5" /> Copy Tracking
              </button>
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:bg-surface-800">
                <Printer className="h-3.5 w-3.5" /> Print Label
              </button>
            </div>
          )}
        </div>
      ) },
  ];

  const handleFormChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    // In production, this would create a real shipment
    setShowNewShipment(false);
    setFormData({
      customerId: '',
      carrier: '',
      service: '',
      destination: '',
      weight: '',
      length: '',
      width: '',
      height: '',
      wholesaleCost: '',
      marginPercent: '40',
      insurance: false,
      insuranceAmount: '' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipping Center"
        description="Create and manage outbound shipments"
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowNewShipment(true)}>
            New Shipment
          </Button>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Truck className="h-5 w-5" />}
          title="Shipments Today"
          value={shipmentsToday}
          change={12}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          title="Revenue Today"
          value={formatCurrency(revenueToday)}
          change={8}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Avg Profit Margin"
          value={`${avgMargin.toFixed(1)}%`}
          change={3}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          title="Pending Shipments"
          value={pendingCount}
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Shipment Table */}
      <TabPanel active={true}>
        <DataTable
          columns={columns}
          data={filteredShipments as (Shipment & Record<string, unknown>)[]}
          keyAccessor={(row) => row.id}
          searchable
          searchPlaceholder="Search shipments…"
          searchFields={['trackingNumber', 'destination', 'carrier', 'service']}
          pageSize={10}
          emptyMessage="No shipments found"
        />
      </TabPanel>

      {/* New Shipment Modal */}
      <Modal
        open={showNewShipment}
        onClose={() => setShowNewShipment(false)}
        title="Create New Shipment"
        description="Fill in shipment details to generate a label"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowNewShipment(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} leftIcon={<Package className="h-4 w-4" />}>
              Create Shipment
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Customer */}
          <Select
            label="Customer"
            placeholder="Select a customer..."
            options={customers
              .filter((c) => c.status === 'active')
              .map((c) => ({
                value: c.id,
                label: `${c.firstName} ${c.lastName} (${c.pmbNumber})` }))}
            value={formData.customerId}
            onChange={(e) => handleFormChange('customerId', e.target.value)}
          />

          {/* Carrier & Service */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Carrier"
              placeholder="Select carrier..."
              options={[
                { value: 'ups', label: 'UPS' },
                { value: 'fedex', label: 'FedEx' },
                { value: 'usps', label: 'USPS' },
                { value: 'dhl', label: 'DHL' },
              ]}
              value={formData.carrier}
              onChange={(e) => handleFormChange('carrier', e.target.value)}
            />
            <Select
              label="Service Type"
              placeholder="Select service..."
              options={
                formData.carrier
                  ? (carrierServiceMap[formData.carrier] || []).map((s) => ({
                      value: s.toLowerCase().replace(/\s+/g, '_'),
                      label: s }))
                  : []
              }
              value={formData.service}
              onChange={(e) => handleFormChange('service', e.target.value)}
            />
          </div>

          {/* Destination */}
          <Input
            label="Destination Address"
            placeholder="City, State or full address"
            value={formData.destination}
            onChange={(e) => handleFormChange('destination', e.target.value)}
          />

          {/* Weight & Dimensions */}
          <div className="grid grid-cols-4 gap-4">
            <Input
              label="Weight (lbs)"
              type="number"
              placeholder="0.0"
              value={formData.weight}
              onChange={(e) => handleFormChange('weight', e.target.value)}
            />
            <Input
              label="Length (in)"
              type="number"
              placeholder="0"
              value={formData.length}
              onChange={(e) => handleFormChange('length', e.target.value)}
            />
            <Input
              label="Width (in)"
              type="number"
              placeholder="0"
              value={formData.width}
              onChange={(e) => handleFormChange('width', e.target.value)}
            />
            <Input
              label="Height (in)"
              type="number"
              placeholder="0"
              value={formData.height}
              onChange={(e) => handleFormChange('height', e.target.value)}
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Wholesale Cost"
              type="number"
              placeholder="0.00"
              leftIcon={<DollarSign className="h-4 w-4" />}
              value={formData.wholesaleCost}
              onChange={(e) => handleFormChange('wholesaleCost', e.target.value)}
            />
            <Input
              label="Margin %"
              type="number"
              placeholder="40"
              value={formData.marginPercent}
              onChange={(e) => handleFormChange('marginPercent', e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-300">Retail Price</label>
              <div className="flex items-center h-[38px] rounded-lg border border-surface-700 bg-surface-800 px-3.5 text-sm">
                <span className="text-emerald-600 font-semibold">
                  {formatCurrency(retailPrice)}
                </span>
              </div>
              <p className="text-xs text-surface-500">Auto-calculated</p>
            </div>
          </div>

          {/* Insurance */}
          <div className="flex items-center gap-4 p-4 rounded-lg border border-surface-700/50 bg-surface-800/30">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.insurance}
                onChange={(e) => handleFormChange('insurance', e.target.checked)}
                className="h-4 w-4 rounded border-surface-600 bg-surface-800 text-primary-600 focus:ring-primary-500/30"
              />
              <span className="text-sm text-surface-200">Add Shipping Insurance</span>
            </label>
            {formData.insurance && (
              <Input
                placeholder="Coverage amount"
                type="number"
                className="w-40"
                value={formData.insuranceAmount}
                onChange={(e) => handleFormChange('insuranceAmount', e.target.value)}
              />
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
