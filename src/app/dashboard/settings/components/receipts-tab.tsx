'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ToggleSwitch } from './toggle-switch';
import { FileText, Save, Trash2, TrendingUp, Upload } from 'lucide-react';

export interface ReceiptsTabProps {
  emailReceipts: boolean;
  setEmailReceipts: (v: boolean) => void;
  receiptDelivery: string;
  setReceiptDelivery: (v: string) => void;
  emailSubject: string;
  setEmailSubject: (v: string) => void;
  signatureLine: boolean;
  setSignatureLine: (v: boolean) => void;
  disclaimer: string;
  setDisclaimer: (v: string) => void;
  receiptPreference: string;
  setReceiptPreference: (v: string) => void;
  showReceiptOptions: boolean;
  setShowReceiptOptions: (v: boolean) => void;
  receiptLogo: string | null;
  setReceiptLogo: (v: string | null) => void;
  logoUploading: boolean;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  storeName: string;
}

export function ReceiptsTab({ emailReceipts, setEmailReceipts, receiptDelivery, setReceiptDelivery, emailSubject, setEmailSubject, signatureLine, setSignatureLine, disclaimer, setDisclaimer, receiptPreference, setReceiptPreference, showReceiptOptions, setShowReceiptOptions, receiptLogo, setReceiptLogo, logoUploading, logoInputRef, handleLogoUpload, storeName }: ReceiptsTabProps) {
  return (
    <>
  {/* Digital Receipt preference */}
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary-600" />
        Receipt Delivery Preference
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-3.5 mb-5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 flex-shrink-0 mt-0.5">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
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
                    ? 'border-primary-300 bg-primary-500/10 ring-1 ring-primary-500/20'
                    : 'border-surface-700/50 bg-surface-800/30 hover:border-surface-600/50'
                }`}
              >
                {option.recommended && (
                  <span className="absolute -top-2 right-2 inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-[9px] font-bold text-primary-600 border border-primary-500/20">
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
          description="Customer picks receipt type."
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
          description="Auto-send email receipts."
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
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handleLogoUpload}
          />
          {receiptLogo ? (
            <div className="relative h-32 border border-surface-700 rounded-lg bg-surface-800/50 flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receiptLogo}
                alt="Receipt logo"
                className="max-h-24 max-w-full object-contain"
              />
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-300 hover:text-surface-100 transition-colors"
                  title="Replace logo"
                >
                  <Upload className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptLogo(null)}
                  className="p-1.5 rounded-lg bg-surface-700 hover:bg-red-600/80 text-surface-300 hover:text-white transition-colors"
                  title="Remove logo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => logoInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') logoInputRef.current?.click(); }}
              className="flex items-center justify-center h-32 border-2 border-dashed border-surface-700 rounded-lg hover:border-primary-500/50 hover:bg-primary-500/5 transition-colors cursor-pointer"
            >
              <div className="text-center">
                {logoUploading ? (
                  <div className="h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                ) : (
                  <Upload className="h-6 w-6 text-surface-500 mx-auto mb-2" />
                )}
                <p className="text-sm text-surface-400">{logoUploading ? 'Uploading…' : 'Click to upload logo'}</p>
                <p className="text-xs text-surface-600">PNG, JPG up to 2MB</p>
              </div>
            </div>
          )}
        </div>

        <ToggleSwitch
          checked={signatureLine}
          onChange={setSignatureLine}
          label="Include Signature Line"
          description="Add signature to receipts."
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
    </>
  );
}
