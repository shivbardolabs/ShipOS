'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Save } from 'lucide-react';

export interface GeneralTabProps {
  storeName: string; setStoreName: (v: string) => void;
  storeAddress: string; setStoreAddress: (v: string) => void;
  storeCity: string; setStoreCity: (v: string) => void;
  storeState: string; setStoreState: (v: string) => void;
  storeZip: string; setStoreZip: (v: string) => void;
  storePhone: string; setStorePhone: (v: string) => void;
  storeEmail: string; setStoreEmail: (v: string) => void;
  taxRate: string; setTaxRate: (v: string) => void;
  openTime: string; setOpenTime: (v: string) => void;
  closeTime: string; setCloseTime: (v: string) => void;
  savingTenant: boolean;
  tenantSaved: boolean;
  handleSaveTenant: () => void;
}

export function GeneralTab({ storeName, setStoreName, storeAddress, setStoreAddress, storeCity, setStoreCity, storeState, setStoreState, storeZip, setStoreZip, storePhone, setStorePhone, storeEmail, setStoreEmail, taxRate, setTaxRate, openTime, setOpenTime, closeTime, setCloseTime, savingTenant, tenantSaved, handleSaveTenant }: GeneralTabProps) {
  return (
    <>
  <Card>
    <CardHeader>
      <CardTitle>Store Information</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-5">
        <Input label="Store Name" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="My Postal Store" />
        <Input label="Street Address" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} placeholder="123 Main Street, Suite 100" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="City" value={storeCity} onChange={(e) => setStoreCity(e.target.value)} placeholder="New York" />
          <Input label="State" value={storeState} onChange={(e) => setStoreState(e.target.value)} placeholder="NY" />
          <Input label="ZIP Code" value={storeZip} onChange={(e) => setStoreZip(e.target.value)} placeholder="10001" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Phone" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} placeholder="(555) 123-4567" />
          <Input label="Email" value={storeEmail} onChange={(e) => setStoreEmail(e.target.value)} type="email" placeholder="info@mystore.com" />
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

  <div className="flex items-center justify-end gap-3 mt-6">
    {tenantSaved && (
      <span className="flex items-center gap-1.5 text-sm text-emerald-500">
        <Check className="h-4 w-4" /> Saved
      </span>
    )}
    <Button
      leftIcon={<Save className="h-4 w-4" />}
      onClick={handleSaveTenant}
      disabled={savingTenant}
    >
      {savingTenant ? 'Saving…' : 'Save Changes'}
    </Button>
  </div>
    </>
  );
}
