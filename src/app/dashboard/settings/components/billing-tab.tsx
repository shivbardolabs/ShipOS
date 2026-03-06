'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Check, CreditCard, FileText, Save } from 'lucide-react';
import { DemoModeBadge } from '@/components/ui/demo-mode-badge';

export interface BillingTabProps {
  cardholderName: string; setCardholderName: (v: string) => void;
  cardNumber: string; setCardNumber: (v: string) => void;
  cardExpiry: string; setCardExpiry: (v: string) => void;
  cardCvc: string; setCardCvc: (v: string) => void;
  billingAddress: string; setBillingAddress: (v: string) => void;
  billingCity: string; setBillingCity: (v: string) => void;
  billingState: string; setBillingState: (v: string) => void;
  billingZip: string; setBillingZip: (v: string) => void;
  billingSaved: boolean; setBillingSaved: (v: boolean) => void;
  billingSaving: boolean; setBillingSaving: (v: boolean) => void;
}

export function BillingTab({ cardholderName, setCardholderName, cardNumber, setCardNumber, cardExpiry, setCardExpiry, cardCvc, setCardCvc, billingAddress, setBillingAddress, billingCity, setBillingCity, billingState, setBillingState, billingZip, setBillingZip, billingSaved, setBillingSaved, billingSaving, setBillingSaving }: BillingTabProps) {
  return (
    <>
  <div className="space-y-6">
    {/* Demo Mode Banner */}
    <DemoModeBadge variant="banner" />

    {/* Payment Method */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary-600" />
          Payment Method
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-surface-400 mb-6">
          Add or update your payment method. This card will be charged for your subscription and any additional services.
        </p>

        {/* Card visual */}
        <div className="relative mb-8 max-w-sm mx-auto">
          <div className="rounded-2xl p-6 text-white"
            style={{ background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-status-violet-600), var(--color-primary-500))' }}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <CreditCard className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium opacity-80">ShipOS</span>
              </div>
              <span className="text-xs opacity-60 uppercase tracking-wider">
                {cardNumber ? (cardNumber.startsWith('3') ? 'AMEX' : cardNumber.startsWith('4') ? 'VISA' : cardNumber.startsWith('5') ? 'MASTERCARD' : 'CARD') : 'CARD'}
              </span>
            </div>
            <p className="text-lg font-mono tracking-[0.2em] mb-6">
              {cardNumber ? cardNumber.replace(/(.{4})/g, '$1 ').trim() || '•••• •••• •••• ••••' : '•••• •••• •••• ••••'}
            </p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase opacity-50 mb-0.5">Cardholder</p>
                <p className="text-sm font-medium">{cardholderName || 'YOUR NAME'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase opacity-50 mb-0.5">Expires</p>
                <p className="text-sm font-medium">{cardExpiry || 'MM/YY'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <Input
            label="Cardholder Name"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            placeholder="Jane Smith"
          />
          <Input
            label="Card Number"
            value={cardNumber}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 16);
              setCardNumber(v);
            }}
            placeholder="4242 4242 4242 4242"
            helperText="We accept Visa, Mastercard, and American Express"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Expiration Date"
              value={cardExpiry}
              onChange={(e) => {
                let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
                setCardExpiry(v);
              }}
              placeholder="MM/YY"
            />
            <Input
              label="CVC / Security Code"
              value={cardCvc}
              onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="•••"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Billing Address */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary-600" />
          Billing Address
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          <Input
            label="Street Address"
            value={billingAddress}
            onChange={(e) => setBillingAddress(e.target.value)}
            placeholder="123 Billing Street, Suite 100"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="City"
              value={billingCity}
              onChange={(e) => setBillingCity(e.target.value)}
              placeholder="New York"
            />
            <Input
              label="State"
              value={billingState}
              onChange={(e) => setBillingState(e.target.value)}
              placeholder="NY"
            />
            <Input
              label="ZIP Code"
              value={billingZip}
              onChange={(e) => setBillingZip(e.target.value)}
              placeholder="10001"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Billing History snippet */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary-600" />
          Recent Invoices
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border border-surface-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-400 uppercase tracking-wider">Description</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-400 uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {[
                { date: 'Feb 1, 2026', desc: 'Pro Plan — Monthly', amount: '$179.00', status: 'paid' },
                { date: 'Jan 1, 2026', desc: 'Pro Plan — Monthly', amount: '$179.00', status: 'paid' },
                { date: 'Dec 1, 2025', desc: 'Pro Plan — Monthly', amount: '$179.00', status: 'paid' },
              ].map((inv, i) => (
                <tr key={i} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-4 py-3 text-surface-300">{inv.date}</td>
                  <td className="px-4 py-3 text-surface-300">{inv.desc}</td>
                  <td className="px-4 py-3 text-surface-200 font-medium">{inv.amount}</td>
                  <td className="px-4 py-3">
                    <Badge variant="success" dot={false} className="text-xs">{inv.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" leftIcon={<FileText className="h-3.5 w-3.5" />}>
            View All Invoices
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* Save */}
    <div className="flex items-center justify-end gap-3">
      {billingSaved && (
        <span className="flex items-center gap-1.5 text-sm text-status-success-500">
          <Check className="h-4 w-4" /> Billing info saved
        </span>
      )}
      <Button
        leftIcon={<Save className="h-4 w-4" />}
        onClick={() => {
          setBillingSaving(true);
          setTimeout(() => {
            setBillingSaving(false);
            setBillingSaved(true);
            setTimeout(() => setBillingSaved(false), 3000);
          }, 1000);
        }}
        disabled={billingSaving}
      >
        {billingSaving ? 'Saving…' : 'Save Billing Info'}
      </Button>
    </div>
  </div>
    </>
  );
}
