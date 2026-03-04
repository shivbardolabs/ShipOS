'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleSwitch } from './toggle-switch';
import { DollarSign, Save, Shield, Truck } from 'lucide-react';

export interface DropoffTabProps {
  dropOffSettings: Record<string, { enabled: boolean; compensation: string; retailCharge: string; department: string }>;
  setDropOffSettings: React.Dispatch<React.SetStateAction<Record<string, { enabled: boolean; compensation: string; retailCharge: string; department: string }>>>;
}

export function DropoffTab({ dropOffSettings, setDropOffSettings }: DropoffTabProps) {
  return (
    <>
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
    </>
  );
}
