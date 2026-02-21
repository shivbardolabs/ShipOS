'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { carrierRates } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';
import {
  Building2,
  DollarSign,
  Truck,
  Receipt,
  Printer,
  Bell,
  Users,
  Save,
  Plus,
  Edit3,
  Check,
  X,
  Shield,
  Wifi,
  WifiOff,
  TestTube,
  Mail,
  Upload,
  Trash2,
  Smartphone,
  Sparkles,
  TrendingUp,
  FileText } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  description?: string;
}

function ToggleSwitch({ checked, onChange, label, description }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full text-left"
    >
      <div
        className={`relative flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-surface-700'
        }`}
      >
        <div
          className={`h-4 w-4 rounded-full bg-white transition-transform shadow-sm ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </div>
      {(label || description) && (
        <div>
          {label && <span className="text-sm text-surface-200">{label}</span>}
          {description && <p className="text-xs text-surface-500">{description}</p>}
        </div>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Mock users                                                                */
/* -------------------------------------------------------------------------- */
const mockUsers = [
  { id: 'usr_001', name: 'Sarah Chen', email: 'sarah.chen@shipstation.com', role: 'admin', lastActive: '2 minutes ago' },
  { id: 'usr_002', name: 'Mike Johnson', email: 'mike.j@shipstation.com', role: 'manager', lastActive: '1 hour ago' },
  { id: 'usr_003', name: 'Emily Ross', email: 'emily.r@shipstation.com', role: 'employee', lastActive: '30 minutes ago' },
  { id: 'usr_004', name: 'James Park', email: 'james.p@shipstation.com', role: 'employee', lastActive: '3 hours ago' },
  { id: 'usr_005', name: 'Lisa Wang', email: 'lisa.w@shipstation.com', role: 'manager', lastActive: 'Yesterday' },
];

/* -------------------------------------------------------------------------- */
/*  Mock printers                                                             */
/* -------------------------------------------------------------------------- */
const mockPrinters = [
  { id: 'ptr_001', name: 'Front Counter Label Printer', model: 'Zebra ZD420', status: 'online', autoPrint: true },
  { id: 'ptr_002', name: 'Back Office Printer', model: 'Zebra GK420d', status: 'online', autoPrint: false },
  { id: 'ptr_003', name: 'Receipt Printer', model: 'Zebra ZD220', status: 'offline', autoPrint: false },
];

/* -------------------------------------------------------------------------- */
/*  Settings Page                                                             */
/* -------------------------------------------------------------------------- */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  // General settings state
  const [storeName, setStoreName] = useState('ShipStation Express - Downtown');
  const [storeAddress, setStoreAddress] = useState('123 Main Street, Suite 100');
  const [storeCity, setStoreCity] = useState('New York, NY 10001');
  const [storePhone, setStorePhone] = useState('(555) 123-4567');
  const [storeEmail, setStoreEmail] = useState('downtown@shipstation.com');
  const [taxRate, setTaxRate] = useState('8.875');
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('18:00');

  // Rates tab
  const [carrierTab, setCarrierTab] = useState('ups');

  // Receipt settings
  const [emailReceipts, setEmailReceipts] = useState(true);
  const [receiptDelivery, setReceiptDelivery] = useState('both');
  const [emailSubject, setEmailSubject] = useState('Your receipt from {{storeName}}');
  const [signatureLine, setSignatureLine] = useState(true);
  const [disclaimer, setDisclaimer] = useState('Thank you for choosing ShipStation Express! All sales are final. Shipping rates are subject to change.');

  // Drop-off settings
  const [dropOffSettings, setDropOffSettings] = useState<
    Record<string, { enabled: boolean; compensation: string; retailCharge: string; department: string }>
  >({
    ups: { enabled: true, compensation: '2.50', retailCharge: '4.99', department: 'Shipping' },
    fedex: { enabled: true, compensation: '2.75', retailCharge: '4.99', department: 'Shipping' },
    usps: { enabled: true, compensation: '1.50', retailCharge: '3.49', department: 'Shipping' },
    dhl: { enabled: false, compensation: '3.00', retailCharge: '5.99', department: 'International' },
    amazon: { enabled: true, compensation: '0.75', retailCharge: '2.99', department: 'Returns' } });

  // Notification settings
  const [smtpServer, setSmtpServer] = useState('smtp.sendgrid.net');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpFrom, setSmtpFrom] = useState('notifications@shipstation.com');
  const [smsProvider, setSmsProvider] = useState('twilio');
  const [smsDefaultArrival, setSmsDefaultArrival] = useState(true);

  // Receipt preferences
  const [receiptPreference, setReceiptPreference] = useState('sms');
  const [showReceiptOptions, setShowReceiptOptions] = useState(true);

  // Printers
  const [printers, setPrinters] = useState(mockPrinters);

  const tabs = [
    { id: 'general', label: 'General', icon: <Building2 className="h-4 w-4" /> },
    { id: 'rates', label: 'Rates & Pricing', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'dropoff', label: 'Drop-off Settings', icon: <Truck className="h-4 w-4" /> },
    { id: 'receipts', label: 'Receipts', icon: <Receipt className="h-4 w-4" /> },
    { id: 'printers', label: 'Label Printers', icon: <Printer className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'users', label: 'Users & Roles', icon: <Users className="h-4 w-4" /> },
  ];

  const carrierTabs = [
    { id: 'ups', label: 'UPS' },
    { id: 'fedex', label: 'FedEx' },
    { id: 'usps', label: 'USPS' },
    { id: 'dhl', label: 'DHL' },
  ];

  const filteredRates = carrierRates.filter((r) => r.carrier === carrierTab);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure your store, pricing, and preferences" />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left sidebar navigation */}
        <div className="lg:w-56 flex-shrink-0">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="vertical" />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* ================================================================ */}
          {/*  GENERAL                                                         */}
          {/* ================================================================ */}
          <TabPanel active={activeTab === 'general'}>
            <Card>
              <CardHeader>
                <CardTitle>Store Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  <Input label="Store Name" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Address" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} />
                    <Input label="City, State, ZIP" value={storeCity} onChange={(e) => setStoreCity(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Phone" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} />
                    <Input label="Email" value={storeEmail} onChange={(e) => setStoreEmail(e.target.value)} type="email" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Business Hours & Tax</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Open Time" type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
                    <Input label="Close Time" type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
                    <Input
                      label="Sales Tax Rate (%)"
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      helperText="Applied to taxable goods and services"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end mt-6">
              <Button leftIcon={<Save className="h-4 w-4" />}>Save Changes</Button>
            </div>
          </TabPanel>

          {/* ================================================================ */}
          {/*  RATES & PRICING                                                 */}
          {/* ================================================================ */}
          <TabPanel active={activeTab === 'rates'}>
            <Card>
              <CardHeader>
                <CardTitle>Carrier Rate Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Carrier tabs */}
                <Tabs tabs={carrierTabs} activeTab={carrierTab} onChange={setCarrierTab} />

                <div className="mt-4 overflow-x-auto rounded-lg border border-surface-700/50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-800 bg-surface-900/80">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Service</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Add-on</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">Wholesale</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">Retail</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-surface-400">Margin Type</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">Margin</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-surface-400">Active</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-surface-400">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRates.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-surface-500 text-sm">
                            No rates configured for this carrier
                          </td>
                        </tr>
                      ) : (
                        filteredRates.map((rate) => (
                          <tr key={rate.id} className="border-b border-surface-800/50 table-row-hover">
                            <td className="px-4 py-3 text-surface-200 font-medium">{rate.service}</td>
                            <td className="px-4 py-3 text-surface-400">{rate.addOnName || '—'}</td>
                            <td className="px-4 py-3 text-right text-surface-400">{formatCurrency(rate.wholesaleRate)}</td>
                            <td className="px-4 py-3 text-right text-surface-200 font-medium">{formatCurrency(rate.retailRate)}</td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="muted" dot={false}>
                                {rate.marginType}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right text-emerald-400 font-medium">{rate.marginValue}%</td>
                            <td className="px-4 py-3 text-center">
                              {rate.isActive ? (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                                  <Check className="h-3 w-3 text-emerald-400" />
                                </span>
                              ) : (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-700">
                                  <X className="h-3 w-3 text-surface-500" />
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button variant="ghost" size="sm" iconOnly>
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mt-4">
                  <Button leftIcon={<Save className="h-4 w-4" />}>Update Rates</Button>
                </div>
              </CardContent>
            </Card>
          </TabPanel>

          {/* ================================================================ */}
          {/*  DROP-OFF SETTINGS                                               */}
          {/* ================================================================ */}
          <TabPanel active={activeTab === 'dropoff'}>
            <div className="space-y-4">
              {Object.entries(dropOffSettings).map(([carrierId, settings]) => {
                const carrierName = carrierId === 'ups' ? 'UPS' : carrierId === 'fedex' ? 'FedEx' : carrierId === 'usps' ? 'USPS' : carrierId === 'dhl' ? 'DHL' : 'Amazon';
                return (
                  <Card key={carrierId}>
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex items-center gap-3 md:w-48 flex-shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-800">
                          <Truck className="h-5 w-5 text-surface-300" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-surface-200">{carrierName}</h3>
                          <p className="text-xs text-surface-500">Drop-off</p>
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <ToggleSwitch
                            checked={settings.enabled}
                            onChange={(val) =>
                              setDropOffSettings((prev) => ({
                                ...prev,
                                [carrierId]: { ...prev[carrierId], enabled: val } }))
                            }
                            label={settings.enabled ? 'Enabled' : 'Disabled'}
                          />
                        </div>
                        <Input
                          label="Compensation"
                          type="number"
                          value={settings.compensation}
                          onChange={(e) =>
                            setDropOffSettings((prev) => ({
                              ...prev,
                              [carrierId]: { ...prev[carrierId], compensation: e.target.value } }))
                          }
                          leftIcon={<DollarSign className="h-3.5 w-3.5" />}
                        />
                        <Input
                          label="Retail Charge"
                          type="number"
                          value={settings.retailCharge}
                          onChange={(e) =>
                            setDropOffSettings((prev) => ({
                              ...prev,
                              [carrierId]: { ...prev[carrierId], retailCharge: e.target.value } }))
                          }
                          leftIcon={<DollarSign className="h-3.5 w-3.5" />}
                        />
                        <Input
                          label="Department"
                          value={settings.department}
                          onChange={(e) =>
                            setDropOffSettings((prev) => ({
                              ...prev,
                              [carrierId]: { ...prev[carrierId], department: e.target.value } }))
                          }
                        />
                      </div>
                    </div>

                    {/* Credentials */}
                    <div className="mt-4 pt-4 border-t border-surface-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-3.5 w-3.5 text-surface-500" />
                        <span className="text-xs text-surface-500 uppercase tracking-wider">API Credentials</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="API Key" value="••••••••••••••••" type="password" readOnly />
                        <Input label="Account Number" value="••••••••" type="password" readOnly />
                      </div>
                    </div>
                  </Card>
                );
              })}

              <div className="flex justify-end">
                <Button leftIcon={<Save className="h-4 w-4" />}>Save Drop-off Settings</Button>
              </div>
            </div>
          </TabPanel>

          {/* ================================================================ */}
          {/*  RECEIPTS                                                        */}
          {/* ================================================================ */}
          <TabPanel active={activeTab === 'receipts'}>
            {/* Digital Receipt preference */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary-400" />
                  Receipt Delivery Preference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-3.5 mb-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 flex-shrink-0 mt-0.5">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-200">📱 75% of customers prefer digital receipts</p>
                      <p className="text-xs text-surface-400 mt-1">
                        Digital receipts are faster, greener, and easier for customers to reference later. SMS receipts have the highest open rates.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-surface-300 mb-2.5 block">Default Receipt Method</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { value: 'sms', label: 'SMS', desc: 'Text message', recommended: true },
                        { value: 'email', label: 'Email', desc: 'Email receipt', recommended: false },
                        { value: 'print', label: 'Print', desc: 'Paper receipt', recommended: false },
                        { value: 'sms_print', label: 'SMS + Print', desc: 'Both options', recommended: false },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setReceiptPreference(option.value)}
                          className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-3.5 text-center transition-all ${
                            receiptPreference === option.value
                              ? 'border-primary-500/40 bg-primary-500/10 ring-1 ring-primary-500/20'
                              : 'border-surface-700/50 bg-surface-800/30 hover:border-surface-600/50'
                          }`}
                        >
                          {option.recommended && (
                            <span className="absolute -top-2 right-2 inline-flex items-center rounded-full bg-primary-500/15 px-2 py-0.5 text-[9px] font-bold text-primary-400 border border-primary-500/20">
                              ★ BEST
                            </span>
                          )}
                          <span className={`text-sm font-medium ${receiptPreference === option.value ? 'text-surface-100' : 'text-surface-300'}`}>
                            {option.label}
                          </span>
                          <span className="text-[11px] text-surface-500">{option.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <ToggleSwitch
                    checked={showReceiptOptions}
                    onChange={setShowReceiptOptions}
                    label="Show receipt options to customer at checkout"
                    description="Let customers choose their preferred receipt method during check-out"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Receipt Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <ToggleSwitch
                    checked={emailReceipts}
                    onChange={setEmailReceipts}
                    label="Enable Email Receipts"
                    description="Automatically send receipts via email after transactions"
                  />

                  <Select
                    label="Receipt Delivery Method"
                    options={[
                      { value: 'print', label: 'Print Only' },
                      { value: 'email', label: 'Email Only' },
                      { value: 'both', label: 'Print & Email' },
                      { value: 'sms', label: 'SMS Only' },
                      { value: 'sms_print', label: 'SMS & Print' },
                      { value: 'none', label: 'None' },
                    ]}
                    value={receiptDelivery}
                    onChange={(e) => setReceiptDelivery(e.target.value)}
                  />

                  <Input
                    label="Email Subject Template"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    helperText="Use {{storeName}}, {{date}}, {{total}} as variables"
                  />

                  <div>
                    <label className="text-sm font-medium text-surface-300 mb-2 block">
                      Logo Upload
                    </label>
                    <div className="flex items-center justify-center h-32 border-2 border-dashed border-surface-700 rounded-lg hover:border-surface-600 transition-colors cursor-pointer">
                      <div className="text-center">
                        <Upload className="h-6 w-6 text-surface-500 mx-auto mb-2" />
                        <p className="text-sm text-surface-400">Click to upload logo</p>
                        <p className="text-xs text-surface-600">PNG, JPG up to 2MB</p>
                      </div>
                    </div>
                  </div>

                  <ToggleSwitch
                    checked={signatureLine}
                    onChange={setSignatureLine}
                    label="Include Signature Line"
                    description="Add a signature line at the bottom of printed receipts"
                  />

                  <Textarea
                    label="Disclaimer / Footer Text"
                    value={disclaimer}
                    onChange={(e) => setDisclaimer(e.target.value)}
                    helperText="This text appears at the bottom of every receipt"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end mt-6">
              <Button leftIcon={<Save className="h-4 w-4" />}>Save Receipt Settings</Button>
            </div>
          </TabPanel>

          {/* ================================================================ */}
          {/*  LABEL PRINTERS                                                  */}
          {/* ================================================================ */}
          <TabPanel active={activeTab === 'printers'}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-surface-200">Connected Printers</h2>
              <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                Add Printer
              </Button>
            </div>

            <div className="space-y-3">
              {printers.map((printer) => (
                <Card key={printer.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                          printer.status === 'online' ? 'bg-emerald-500/15' : 'bg-surface-800'
                        }`}
                      >
                        <Printer
                          className={`h-6 w-6 ${
                            printer.status === 'online' ? 'text-emerald-400' : 'text-surface-500'
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-surface-200">{printer.name}</h3>
                        <p className="text-xs text-surface-500">{printer.model}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {printer.status === 'online' ? (
                          <Wifi className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-400" />
                        )}
                        <Badge variant={printer.status === 'online' ? 'success' : 'danger'} dot>
                          {printer.status === 'online' ? 'Connected' : 'Offline'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1">
                        <ToggleSwitch
                          checked={printer.autoPrint}
                          onChange={(val) => {
                            setPrinters((prev) =>
                              prev.map((p) =>
                                p.id === printer.id ? { ...p, autoPrint: val } : p
                              )
                            );
                          }}
                          label="Auto-print"
                        />
                      </div>

                      <Button variant="outline" size="sm" leftIcon={<TestTube className="h-3.5 w-3.5" />}>
                        Test Print
                      </Button>
                      <Button variant="ghost" size="sm" iconOnly>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabPanel>

          {/* ================================================================ */}
          {/*  NOTIFICATIONS                                                   */}
          {/* ================================================================ */}
          <TabPanel active={activeTab === 'notifications'}>
            <div className="space-y-6">
              {/* SMS-First callout */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary-400" />
                    SMS Notifications
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary-400 border border-primary-500/20">
                      <Sparkles className="h-3 w-3" />
                      Recommended
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-primary-500/15 bg-primary-500/5 p-3.5 mb-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/15 flex-shrink-0 mt-0.5">
                        <TrendingUp className="h-4 w-4 text-primary-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-surface-200">📊 SMS has 98% open rate vs 20% for email</p>
                        <p className="text-xs text-surface-400 mt-1">
                          Customers respond 5× faster to SMS. Enable SMS as the default channel for time-sensitive notifications like package arrivals.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <ToggleSwitch
                      checked={smsDefaultArrival}
                      onChange={setSmsDefaultArrival}
                      label="Send SMS by default for package arrivals"
                      description="New check-ins will automatically trigger an SMS notification"
                    />

                    <Select
                      label="SMS Provider"
                      options={[
                        { value: 'twilio', label: 'Twilio' },
                        { value: 'vonage', label: 'Vonage' },
                        { value: 'sns', label: 'Amazon SNS' },
                      ]}
                      value={smsProvider}
                      onChange={(e) => setSmsProvider(e.target.value)}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input label="Account SID" value="••••••••••••••••" type="password" readOnly />
                      <Input label="Auth Token" value="••••••••••••••••" type="password" readOnly />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary-400" />
                    Email (SMTP) Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="SMTP Server"
                      value={smtpServer}
                      onChange={(e) => setSmtpServer(e.target.value)}
                    />
                    <Input
                      label="Port"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                    />
                    <Input
                      label="From Address"
                      value={smtpFrom}
                      onChange={(e) => setSmtpFrom(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Input label="SMTP Username" value="apikey" readOnly />
                    <Input label="SMTP Password" value="••••••••••••••••" type="password" readOnly />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { name: 'Package Arrival', channel: 'Email + SMS', status: 'active' },
                      { name: 'Package Reminder', channel: 'Email', status: 'active' },
                      { name: 'Mail Received', channel: 'Email', status: 'active' },
                      { name: 'ID Expiration Warning', channel: 'Email + SMS', status: 'active' },
                      { name: 'Renewal Reminder', channel: 'Email', status: 'active' },
                      { name: 'Shipment Update', channel: 'Email + SMS', status: 'inactive' },
                      { name: 'Welcome', channel: 'Email', status: 'active' },
                    ].map((template) => (
                      <div
                        key={template.name}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-800/50 transition-colors border border-surface-700/30"
                      >
                        <div className="flex items-center gap-3">
                          <Bell className="h-4 w-4 text-surface-500" />
                          <div>
                            <span className="text-sm text-surface-200">{template.name}</span>
                            <p className="text-xs text-surface-500">{template.channel}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={template.status === 'active' ? 'success' : 'muted'}
                            dot
                          >
                            {template.status}
                          </Badge>
                          <Button variant="ghost" size="sm" iconOnly>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button leftIcon={<Save className="h-4 w-4" />}>Save Notification Settings</Button>
              </div>
            </div>
          </TabPanel>

          {/* ================================================================ */}
          {/*  USERS & ROLES                                                   */}
          {/* ================================================================ */}
          <TabPanel active={activeTab === 'users'}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-surface-200">Team Members</h2>
              <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                Add User
              </Button>
            </div>

            <div className="space-y-3">
              {mockUsers.map((user) => {
                const roleColor =
                  user.role === 'admin'
                    ? 'default'
                    : user.role === 'manager'
                    ? 'warning'
                    : 'muted';
                const initials = user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('');

                return (
                  <Card key={user.id} hover>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-accent-violet text-xs font-bold text-white">
                          {initials}
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-surface-200">{user.name}</h3>
                          <p className="text-xs text-surface-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={roleColor as 'default' | 'warning' | 'muted'} dot>
                          {user.role}
                        </Badge>
                        <span className="text-xs text-surface-500">Active {user.lastActive}</span>
                        <Button variant="ghost" size="sm" iconOnly>
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Role Descriptions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Role Descriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      role: 'Admin',
                      description: 'Full access to all features including settings, user management, and financial data.',
                      badge: 'default' as const },
                    {
                      role: 'Manager',
                      description: 'Access to operations, reports, and team oversight. Cannot modify system settings.',
                      badge: 'warning' as const },
                    {
                      role: 'Employee',
                      description: 'Day-to-day operations: check-in/out packages, process shipments, handle customers.',
                      badge: 'muted' as const },
                  ].map((item) => (
                    <div
                      key={item.role}
                      className="flex items-start gap-3 p-3 rounded-lg bg-surface-800/30 border border-surface-700/30"
                    >
                      <Badge variant={item.badge} dot>
                        {item.role}
                      </Badge>
                      <p className="text-sm text-surface-400">{item.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabPanel>
        </div>
      </div>
    </div>
  );
}
