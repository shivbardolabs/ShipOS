'use client';

import { useState, useCallback } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CheckCircle, Save, Plus, Trash2 } from 'lucide-react';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import type { ParsedAddress } from '@/components/ui/address-autocomplete';
import type { Customer, AuthorizedPerson } from '@/lib/types';

interface EditCustomerModalProps {
  customer: Customer;
  open: boolean;
  onClose: () => void;
  saved: boolean;
  onSave: () => void;
}

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

  const handleSave = useCallback(() => {
    if (!validate()) return;
    onSave();
  }, [validate, onSave]);

  return (
    <Modal
      open={open}
      onClose={() => { resetForm(); onClose(); }}
      title="Edit Customer Profile"
      description={`${customer.firstName} ${customer.lastName} · ${customer.pmbNumber}`}
      size="xl"
      footer={
        saved ? (
          <div className="flex items-center gap-2 text-emerald-500">
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
              onChange={(e) => handleChange('pmbNumber', e.target.value)}
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
                  <button
                    onClick={() => removePerson(person.id)}
                    className="text-surface-500 hover:text-red-400 transition-colors p-1"
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
  );
}
