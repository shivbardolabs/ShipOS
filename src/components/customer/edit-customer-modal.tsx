'use client';
/* eslint-disable */

import { useState, useCallback } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CheckCircle, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import type { ParsedAddress } from '@/components/ui/address-autocomplete';
import { PS1583ChangeGuard } from '@/components/customer/ps1583-change-guard';
import type { Customer, AuthorizedPerson } from '@/lib/types';

interface EditCustomerModalProps {
  customer: Customer;
  open: boolean;
  onClose: () => void;
  saved: boolean;
  onSave: () => void;
}

/** PS1583-protected fields that trigger the change guard */
const PS1583_PROTECTED_FIELDS = [
  'firstName',
  'lastName',
] as const;

export function EditCustomerModal({ customer, open, onClose, saved, onSave }: EditCustomerModalProps) {
  const [form, setForm] = useState(() => ({
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email || '',
    phone: customer.phone || '',
    businessName: customer.businessName || '',
    pmbNumber: customer.pmbNumber,
    address: customer.address || '',
    forwardingAddress: customer.forwardingAddress || '',
    billingTerms: customer.billingTerms || 'Monthly',
    notifyEmail: customer.notifyEmail,
    notifySms: customer.notifySms,
    notes: customer.notes || '',
  }));
  const [authorizedPersons, setAuthorizedPersons] = useState<AuthorizedPerson[]>(
    customer.authorizedPickupPersons || []
  );
  const [newPerson, setNewPerson] = useState({ name: '', phone: '', relationship: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // PS1583 Change Guard state
  const [showChangeGuard, setShowChangeGuard] = useState(false);
  const [changeGuardLoading, setChangeGuardLoading] = useState(false);
  const [protectedChanges, setProtectedChanges] = useState<Array<{
    field: string;
    label: string;
    oldValue: string | null;
    newValue: string | null;
  }>>([]);

  const resetForm = useCallback(() => {
    setForm({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email || '',
      phone: customer.phone || '',
      businessName: customer.businessName || '',
      pmbNumber: customer.pmbNumber,
      address: customer.address || '',
      forwardingAddress: customer.forwardingAddress || '',
      billingTerms: customer.billingTerms || 'Monthly',
      notifyEmail: customer.notifyEmail,
      notifySms: customer.notifySms,
      notes: customer.notes || '',
    });
    setAuthorizedPersons(customer.authorizedPickupPersons || []);
    setNewPerson({ name: '', phone: '', relationship: '' });
    setFormErrors({});
  }, [customer]);

  const handleChange = useCallback((field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }, []);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!form.firstName.trim()) errors.firstName = 'First name is required';
    if (!form.lastName.trim()) errors.lastName = 'Last name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Invalid email';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  const addPerson = useCallback(() => {
    if (!newPerson.name.trim()) return;
    setAuthorizedPersons((prev) => [
      ...prev,
      {
        id: `ap_new_${Date.now()}`,
        name: newPerson.name.trim(),
        phone: newPerson.phone.trim() || undefined,
        relationship: newPerson.relationship.trim() || undefined,
      },
    ]);
    setNewPerson({ name: '', phone: '', relationship: '' });
  }, [newPerson]);

  const removePerson = useCallback((id: string) => {
    setAuthorizedPersons((prev) => prev.filter((p) => p.id !== id));
  }, []);

  /** Check if any PS1583-protected fields have changed */
  const checkProtectedFields = useCallback(async (): Promise<boolean> => {
    // Build changes object
    const changes: Record<string, string> = {};
    if (form.firstName !== customer.firstName) changes.firstName = form.firstName;
    if (form.lastName !== customer.lastName) changes.lastName = form.lastName;

    // If no protected fields changed, no guard needed
    if (Object.keys(changes).length === 0) return false;

    try {
      const res = await fetch(`/api/customers/${customer.id}/change-guard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (data.warningRequired && data.protectedFieldsChanged.length > 0) {
        setProtectedChanges(data.protectedFieldsChanged);
        return true;
      }
    } catch (e) {
      console.error('Change guard check failed', e);
    }

    return false;
  }, [form, customer]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  /** Build a diff of changed non-protected fields for the PATCH request */
  const buildChanges = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const changes: Record<string, any> = {};
    if (form.email !== (customer.email || '')) changes.email = form.email || null;
    if (form.phone !== (customer.phone || '')) changes.phone = form.phone || null;
    if (form.businessName !== (customer.businessName || '')) changes.businessName = form.businessName || null;
    if (form.pmbNumber !== customer.pmbNumber) changes.pmbNumber = form.pmbNumber;
    if (form.address !== (customer.address || '')) changes.address = form.address || null;
    if (form.forwardingAddress !== (customer.forwardingAddress || '')) changes.forwardingAddress = form.forwardingAddress || null;
    if (form.billingTerms !== (customer.billingTerms || 'Monthly')) changes.billingTerms = form.billingTerms;
    if (form.notifyEmail !== customer.notifyEmail) changes.notifyEmail = form.notifyEmail;
    if (form.notifySms !== customer.notifySms) changes.notifySms = form.notifySms;
    if (form.notes !== (customer.notes || '')) changes.notes = form.notes || null;
    // Include name changes for non-protected save path
    if (form.firstName !== customer.firstName) changes.firstName = form.firstName;
    if (form.lastName !== customer.lastName) changes.lastName = form.lastName;
    return changes;
  }, [form, customer]);

  /** Persist changes via PATCH /api/customers/[id] */
  const persistChanges = useCallback(async (changes: Record<string, unknown>) => {
    if (Object.keys(changes).length === 0) {
      onSave();
      return true;
    }
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setSaveError(data?.error || 'Failed to save changes');
        return false;
      }
      onSave();
      return true;
    } catch {
      setSaveError('Failed to save changes');
      return false;
    } finally {
      setSaving(false);
    }
  }, [customer.id, onSave]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    // Check for PS1583-protected field changes
    const needsGuard = await checkProtectedFields();
    if (needsGuard) {
      setShowChangeGuard(true);
      return;
    }

    // No protected changes — persist all changes via PATCH
    const changes = buildChanges();
    await persistChanges(changes);
  }, [validate, checkProtectedFields, buildChanges, persistChanges]);

  const handleConfirmProtectedChanges = useCallback(async () => {
    setChangeGuardLoading(true);
    try {
      // Apply protected name changes through the change guard API (audit logging)
      const nameChanges: Record<string, string> = {};
      if (form.firstName !== customer.firstName) nameChanges.firstName = form.firstName;
      if (form.lastName !== customer.lastName) nameChanges.lastName = form.lastName;

      const confirmedProtectedFields = protectedChanges.map((c) => c.field);

      await fetch(`/api/customers/${customer.id}/change-guard`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes: nameChanges, confirmedProtectedFields }),
      });

      // Also persist non-protected field changes via regular PATCH
      const allChanges = buildChanges();
      // Remove name fields (already handled by change-guard)
      delete allChanges.firstName;
      delete allChanges.lastName;
      await persistChanges(allChanges);
      setShowChangeGuard(false);
    } catch (e) {
      console.error('Protected change failed', e);
    } finally {
      setChangeGuardLoading(false);
    }
  }, [form, customer, protectedChanges, buildChanges, persistChanges]);

  return (
    <>
      <Modal
        open={open}
        onClose={() => { resetForm(); onClose(); }}
        title="Edit Customer Profile"
        description={`${customer.firstName} ${customer.lastName} · ${customer.pmbNumber}`}
        size="xl"
        footer={
          saved ? (
            <div className="flex items-center gap-2 text-status-success-500">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Saved successfully</span>
            </div>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => { resetForm(); onClose(); }}>
                Cancel
              </Button>
              <Button size="sm" leftIcon={<Save className="h-3.5 w-3.5" />} onClick={handleSave}>
                Save Changes
              </Button>
            </>
          )
        }
      >
        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-surface-200 mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={form.firstName}
                error={formErrors.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
              />
              <Input
                label="Last Name"
                value={form.lastName}
                error={formErrors.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                error={formErrors.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
              <Input
                label="Business Name"
                value={form.businessName}
                onChange={(e) => handleChange('businessName', e.target.value)}
              />
              <Input
                label="PMB Number"
                value={form.pmbNumber}
                readOnly
                className="cursor-not-allowed opacity-60"
                helperText="PMB number cannot be changed"
              />
              <Select
                label="Billing Terms"
                value={form.billingTerms}
                onChange={(e) => handleChange('billingTerms', e.target.value)}
                options={[
                  { value: 'Monthly', label: 'Monthly' },
                  { value: 'Quarterly', label: 'Quarterly' },
                  { value: 'Semiannual', label: 'Semiannual' },
                  { value: 'Annual', label: 'Annual' },
                  { value: 'Custom', label: 'Custom' },
                ]}
              />
              <div className="flex flex-col gap-1.5 justify-end">
                <p className="text-sm font-medium text-surface-300">Notifications</p>
                <div className="flex items-center gap-4 h-[38px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.notifyEmail}
                      onChange={(e) => handleChange('notifyEmail', e.target.checked)}
                      className="rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500/30"
                    />
                    <span className="text-sm text-surface-300">Email</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.notifySms}
                      onChange={(e) => handleChange('notifySms', e.target.checked)}
                      className="rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500/30"
                    />
                    <span className="text-sm text-surface-300">SMS</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="border-t border-surface-800 pt-5">
            <h3 className="text-sm font-semibold text-surface-200 mb-3">Addresses</h3>
            <div className="grid grid-cols-1 gap-4">
              <AddressAutocomplete
                label="Street Address"
                value={form.address}
                placeholder="Start typing an address..."
                onChange={(v) => handleChange('address', v)}
                onSelect={(parsed: ParsedAddress) => {
                  const full = [parsed.street, parsed.city, parsed.state, parsed.zip].filter(Boolean).join(', ');
                  handleChange('address', full);
                }}
              />
              <AddressAutocomplete
                label="Preferred Forwarding Address"
                value={form.forwardingAddress}
                placeholder="Start typing an address..."
                onChange={(v) => handleChange('forwardingAddress', v)}
                onSelect={(parsed: ParsedAddress) => {
                  const full = [parsed.street, parsed.city, parsed.state, parsed.zip].filter(Boolean).join(', ');
                  handleChange('forwardingAddress', full);
                }}
              />
            </div>
          </div>

          {/* Authorized Pickup Persons */}
          <div className="border-t border-surface-800 pt-5">
            <h3 className="text-sm font-semibold text-surface-200 mb-3">Authorized Pickup Persons</h3>
            {authorizedPersons.length > 0 && (
              <div className="space-y-2 mb-4">
                {authorizedPersons.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center gap-3 rounded-lg bg-surface-800/50 px-3 py-2.5"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-600/10 text-primary-500 text-xs font-semibold">
                      {person.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-surface-200">{person.name}</span>
                      {person.relationship && (
                        <span className="text-xs text-surface-500 ml-2">({person.relationship})</span>
                      )}
                      {person.phone && (
                        <span className="text-xs text-surface-500 ml-2">{person.phone}</span>
                      )}
                    </div>
                    <button type="button"
                      onClick={() => removePerson(person.id)}
                      className="text-surface-500 hover:text-status-error-400 transition-colors p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-lg border border-dashed border-surface-700 p-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Input
                  placeholder="Full name *"
                  value={newPerson.name}
                  onChange={(e) => setNewPerson((p) => ({ ...p, name: e.target.value }))}
                />
                <Input
                  placeholder="Phone"
                  value={newPerson.phone}
                  onChange={(e) => setNewPerson((p) => ({ ...p, phone: e.target.value }))}
                />
                <Input
                  placeholder="Relationship"
                  value={newPerson.relationship}
                  onChange={(e) => setNewPerson((p) => ({ ...p, relationship: e.target.value }))}
                />
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={addPerson}
                  disabled={!newPerson.name.trim()}
                  className="h-[38px]"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="border-t border-surface-800 pt-5">
            <Textarea
              label="Notes"
              value={form.notes}
              placeholder="Internal notes about this customer..."
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* PS1583 Change Guard Dialog (BAR-235) */}
      <PS1583ChangeGuard
        open={showChangeGuard}
        onClose={() => setShowChangeGuard(false)}
        onConfirm={handleConfirmProtectedChanges}
        loading={changeGuardLoading}
        protectedChanges={protectedChanges}
        customerName={`${customer.firstName} ${customer.lastName}`}
        pmbNumber={customer.pmbNumber}
        form1583Status={customer.form1583Status || 'unknown'}
      />
    </>
  );
}
