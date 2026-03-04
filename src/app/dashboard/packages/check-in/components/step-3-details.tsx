'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Camera, CheckCircle2, AlertTriangle, Snowflake, X as XIcon,
} from 'lucide-react';
import { CameraMeasure } from '@/components/packages/camera-measure';
import type { PackageDimensions } from '@/components/packages/camera-measure';
import { ToggleSwitch } from './helpers';
import type { DuplicatePackage } from './types';
import { packageTypeOptions } from './types';

export interface Step3Props {
  packageType: string;
  setPackageType: (v: string) => void;
  packageDimensions: PackageDimensions;
  setPackageDimensions: React.Dispatch<React.SetStateAction<PackageDimensions>>;
  hazardous: boolean;
  setHazardous: (v: boolean) => void;
  perishable: boolean;
  setPerishable: (v: boolean) => void;
  setPerishableWarningAcked: (v: boolean) => void;
  condition: string;
  setCondition: (v: string) => void;
  conditionOther: string;
  setConditionOther: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  storageLocation: string;
  setStorageLocation: (v: string) => void;
  storageLocationCustom: string | boolean;
  setStorageLocationCustom: (v: any) => void;
  requiresSignature: boolean;
  setRequiresSignature: (v: boolean) => void;
  definedStorageLocations: { name: string; isDefault: boolean }[];
  photos: string[];
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  photoInputRef: React.RefObject<HTMLInputElement | null>;
  duplicatePackage: DuplicatePackage | null;
  duplicateAcknowledged: boolean;
  duplicateOverrideReason: string;
  showDuplicateModal: boolean;
  setShowDuplicateModal: (v: boolean) => void;
  setStep: (v: number) => void;
  step: number;
}

export function Step3PackageDetails(props: Step3Props) {
  const {
    packageType, setPackageType,
    packageDimensions, setPackageDimensions,
    hazardous, setHazardous, perishable, setPerishable, setPerishableWarningAcked,
    condition, setCondition, conditionOther, setConditionOther,
    notes, setNotes,
    storageLocation, setStorageLocation,
    storageLocationCustom, setStorageLocationCustom,
    requiresSignature, setRequiresSignature,
    definedStorageLocations, photos, setPhotos, photoInputRef,
    duplicatePackage, duplicateAcknowledged, duplicateOverrideReason,
    showDuplicateModal, setShowDuplicateModal,
    setStep, step,
  } = props;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-1">
          Package Details
        </h2>
        <p className="text-sm text-surface-400">
          Describe the package characteristics
        </p>
      </div>

      {/* BAR-328: Duplicate tracking warning with override status */}
      {duplicatePackage && !showDuplicateModal && (
        <div className={cn(
          'p-4 rounded-xl border flex items-start gap-3',
          duplicateAcknowledged
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-amber-500/30 bg-amber-500/5'
        )}>
          {duplicateAcknowledged ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div>
            {duplicateAcknowledged ? (
              <>
                <p className="text-sm font-medium text-emerald-300">Duplicate override active</p>
                <p className="text-xs text-surface-400 mt-1">
                  Proceeding with re-check-in for tracking number already assigned to {duplicatePackage.customerName} ({duplicatePackage.customerPmb}).
                  {duplicateOverrideReason && <> Reason: {duplicateOverrideReason}</>}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-amber-300">Duplicate tracking number detected</p>
                <p className="text-xs text-surface-400 mt-1">
                  This tracking number is already assigned to a package for {duplicatePackage.customerName} ({duplicatePackage.customerPmb})
                </p>
                <button
                  className="mt-2 text-xs text-primary-400 hover:text-primary-300 underline"
                  onClick={() => setShowDuplicateModal(true)}
                >
                  Review &amp; override
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Package Type Selector */}
      <div>
        <label className="text-sm font-medium text-surface-300 mb-3 block">
          Package Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {packageTypeOptions.map((pt) => {
            const isActive = packageType === pt.id;
            return (
              <button
                key={pt.id}
                onClick={() => setPackageType(pt.id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border p-4 transition-all',
                  isActive
                    ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500/30'
                    : 'border-surface-700/50 bg-surface-900/60 hover:border-surface-600'
                )}
              >
                <span className="text-2xl">{pt.icon}</span>
                <span
                  className={cn(
                    'text-sm font-medium',
                    isActive ? 'text-primary-600' : 'text-surface-300'
                  )}
                >
                  {pt.label}
                </span>
                <span className="text-[10px] text-surface-500">
                  {pt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-4">
        <ToggleSwitch
          label="Hazardous Materials"
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          checked={hazardous}
          onChange={setHazardous}
        />
        <ToggleSwitch
          label="Perishable"
          icon={<Snowflake className="h-4 w-4 text-blue-600" />}
          checked={perishable}
          onChange={(val) => {
            setPerishable(val);
            if (!val) setPerishableWarningAcked(false);
          }}
        />
        <ToggleSwitch
          label="Requires Signature"
          icon={<CheckCircle2 className="h-4 w-4 text-purple-500" />}
          checked={requiresSignature}
          onChange={setRequiresSignature}
        />
      </div>

      {/* Conditional inline alerts (kept for reference even with modals) */}
      {(hazardous || perishable) && (
        <div className={cn(
          'p-4 rounded-xl border space-y-2',
          hazardous
            ? 'bg-amber-500/5 border-amber-500/20'
            : 'bg-blue-500/5 border-blue-500/20'
        )}>
          {hazardous && (
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span><strong>Hazardous Materials:</strong> Package must be stored in hazmat-designated area. Notify manager on duty.</span>
            </div>
          )}
          {perishable && (
            <div className="flex items-center gap-2 text-sm text-blue-400">
              <Snowflake className="h-4 w-4 shrink-0" />
              <span><strong>Perishable:</strong> Customer will receive an urgent notification. Package should be released within 24 hours.</span>
            </div>
          )}
        </div>
      )}

      {/* Condition + Photo Capture (BAR-9 Gap 2) */}
      <div className="flex items-end gap-3">
        <div className="max-w-xs flex-1">
          <Select
            label="Condition"
            value={condition}
            onChange={(e) => {
              setCondition(e.target.value);
              if (e.target.value !== 'other') setConditionOther('');
            }}
            options={[
              { value: 'good', label: 'Good' },
              { value: 'damaged', label: 'Damaged' },
              { value: 'wet', label: 'Wet' },
              { value: 'opened', label: 'Opened' },
              { value: 'partially_opened', label: 'Partially Opened' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </div>
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg border transition-all',
            condition !== 'good'
              ? 'border-amber-500/50 bg-amber-500/10 text-amber-400 animate-pulse hover:bg-amber-500/20'
              : 'border-surface-600/50 bg-surface-800/50 text-surface-400 hover:border-surface-500 hover:text-surface-300'
          )}
          title="Take photo of package condition"
        >
          <Camera className="h-5 w-5" />
        </button>
      </div>

      {/* Photo previews (BAR-9 Gap 2) */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative group">
              <img
                src={photo}
                alt={`Condition photo ${idx + 1}`}
                className="h-16 w-16 rounded-lg object-cover border border-surface-700"
              />
              <button
                type="button"
                onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {condition === 'other' && (
        <div className="max-w-lg">
          <Input
            label="Describe Condition"
            placeholder="Describe the condition of the package..."
            value={conditionOther}
            onChange={(e) => setConditionOther(e.target.value)}
          />
        </div>
      )}

      {/* Storage Location — BAR-326: Dropdown from defined locations + custom entry */}
      <div className="max-w-lg">
        {definedStorageLocations.length > 0 && !storageLocationCustom ? (
          <div className="flex flex-col gap-1.5">
            <Select
              label="Storage Location"
              placeholder="Select a location…"
              value={storageLocation}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setStorageLocationCustom(true);
                  setStorageLocation('');
                } else {
                  setStorageLocation(e.target.value);
                }
              }}
              options={[
                ...definedStorageLocations.map((l) => ({ value: l.name, label: l.name })),
                { value: '__custom__', label: '✏️ Enter custom location…' },
              ]}
              helperText="Where this package will be stored in your facility"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Input
              label="Storage Location"
              placeholder="e.g. Shelf A3, Bin 12, Rack B-2..."
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              helperText="Where this package will be stored in your facility"
            />
            {definedStorageLocations.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStorageLocationCustom(false);
                  const defaultLoc = definedStorageLocations.find((l) => l.isDefault);
                  setStorageLocation(defaultLoc ? defaultLoc.name : definedStorageLocations[0]?.name || '');
                }}
                className="text-xs text-primary-400 hover:text-primary-300 text-left"
              >
                ← Back to predefined locations
              </button>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="max-w-lg">
        <Textarea
          label="Notes"
          placeholder="Any special handling instructions..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Camera Measure Dimensions */}
      <div className="max-w-lg">
        <CameraMeasure
          dimensions={packageDimensions}
          onChange={setPackageDimensions}
          onSuggestPackageType={(type) => {
            // Auto-select package type from AI suggestion if not already set
            if (!packageType) setPackageType(type);
          }}
        />
      </div>
    </div>
  );
}
