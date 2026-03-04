'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { ToggleSwitch } from './toggle-switch';
import { formatCurrency } from '@/lib/utils';
import { Check, Edit3, Save, X } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface RatesTabProps {
  carrierTab: string;
  setCarrierTab: (v: string) => void;
  carrierTabs: { id: string; label: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filteredRates: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editingRate: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setEditingRate: React.Dispatch<React.SetStateAction<any | null>>;
  rateSaving: boolean;
  rateSaved: boolean;
  handleSaveRate: () => void;
  handleUpdateAllRates: () => void;
}

export function RatesTab({ carrierTab, setCarrierTab, carrierTabs, filteredRates, editingRate, setEditingRate, rateSaving, rateSaved, handleSaveRate, handleUpdateAllRates }: RatesTabProps) {
  return (
    <>
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
                <tr key={rate.id} className="border-b border-surface-700/60 table-row-hover">
                  <td className="px-4 py-3 text-surface-200 font-medium">{rate.service}</td>
                  <td className="px-4 py-3 text-surface-400">{rate.addOnName || '—'}</td>
                  <td className="px-4 py-3 text-right text-surface-400">{formatCurrency(rate.wholesaleRate)}</td>
                  <td className="px-4 py-3 text-right text-surface-200 font-medium">{formatCurrency(rate.retailRate)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="muted" dot={false}>
                      {rate.marginType}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-medium">{rate.marginValue}%</td>
                  <td className="px-4 py-3 text-center">
                    {rate.isActive ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                        <Check className="h-3 w-3 text-emerald-600" />
                      </span>
                    ) : (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-700">
                        <X className="h-3 w-3 text-surface-500" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button variant="ghost" size="sm" iconOnly onClick={() => setEditingRate({ ...rate, retailRate: String(rate.retailRate), marginValue: String(rate.marginValue) })}>
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
        <Button
          leftIcon={rateSaved && !editingRate ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          onClick={handleUpdateAllRates}
          loading={rateSaving && !editingRate}
          disabled={rateSaving}
        >
          {rateSaved && !editingRate ? 'Rates Updated!' : 'Update Rates'}
        </Button>
      </div>
    </CardContent>
  </Card>

  {/* Rate Edit Modal */}
  <Modal
    open={!!editingRate}
    onClose={() => setEditingRate(null)}
    title={`Edit Rate — ${editingRate?.service || ''}`}
    description={editingRate?.addOnName ? `Add-on: ${editingRate.addOnName}` : undefined}
    size="md"
    footer={
      <>
        <Button variant="ghost" size="sm" onClick={() => setEditingRate(null)}>
          Cancel
        </Button>
        <Button
          size="sm"
          leftIcon={rateSaved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          onClick={handleSaveRate}
          loading={rateSaving}
          disabled={rateSaving}
        >
          {rateSaved ? 'Saved!' : 'Save Changes'}
        </Button>
      </>
    }
  >
    {editingRate && (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Wholesale Rate"
            value={formatCurrency(editingRate.wholesaleRate)}
            readOnly
            disabled
          />
          <Input
            label="Retail Rate"
            type="number"
            step="0.01"
            value={editingRate.retailRate}
            onChange={(e) => setEditingRate((prev: typeof editingRate) => prev ? { ...prev, retailRate: e.target.value } : prev)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Margin Type"
            value={editingRate.marginType}
            onChange={(e) => setEditingRate((prev: typeof editingRate) => prev ? { ...prev, marginType: e.target.value } : prev)}
            options={[
              { value: 'markup', label: 'Markup' },
              { value: 'margin', label: 'Margin' },
            ]}
          />
          <Input
            label="Margin Value (%)"
            type="number"
            step="0.1"
            value={editingRate.marginValue}
            onChange={(e) => setEditingRate((prev: typeof editingRate) => prev ? { ...prev, marginValue: e.target.value } : prev)}
          />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <ToggleSwitch
            checked={editingRate.isActive}
            onChange={(val) => setEditingRate((prev: typeof editingRate) => prev ? { ...prev, isActive: val } : prev)}
            label="Active"
            description="Enable or disable this rate for transactions"
          />
        </div>
      </div>
    )}
  </Modal>
    </>
  );
}
