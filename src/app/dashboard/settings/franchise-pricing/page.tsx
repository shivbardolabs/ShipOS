'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useTenant } from '@/components/tenant-provider';
import { formatCurrency } from '@/lib/utils';
import {
  Building2,
  Plus,
  Save,
  Loader2,
  MapPin,
  Users,
  DollarSign,
  History,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface FranchiseSummary {
  id: string;
  name: string;
  slug: string;
  adminEmail: string | null;
  adminName: string | null;
  locationCount: number;
  isActive: boolean;
  createdAt: string;
}

interface FranchiseDetail {
  id: string;
  name: string;
  slug: string;
  adminEmail: string | null;
  adminName: string | null;
  phone: string | null;
  defaultPricing: Record<string, Record<string, number>> | null;
  locations: {
    id: string;
    tenantId: string;
    customPricing: Record<string, Record<string, number>> | null;
    isActive: boolean;
  }[];
  pricingOverrides: {
    id: string;
    tenantId: string | null;
    tierSlug: string;
    field: string;
    oldValue: string | null;
    newValue: string;
    changedBy: string | null;
    changedAt: string;
  }[];
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function FranchisePricingPage() {
  const { localUser } = useTenant();
  const isSuperAdmin = localUser?.role === 'superadmin';
  const [franchises, setFranchises] = useState<FranchiseSummary[]>([]);
  const [selectedFranchise, setSelectedFranchise] = useState<FranchiseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', slug: '', adminEmail: '', adminName: '', phone: '' });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pmb/franchise-pricing');
      if (res.ok) {
        const data = await res.json();
        if (data.franchises) {
          setFranchises(data.franchises);
        } else if (data.franchise) {
          // Non-superadmin: just sees their own franchise
          if (data.franchise) {
            setFranchises([{
              id: data.franchise.id,
              name: data.franchise.name,
              slug: '',
              adminEmail: null,
              adminName: null,
              locationCount: data.franchise.locationCount ?? 0,
              isActive: true,
              createdAt: '',
            }]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load franchises:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const loadFranchiseDetail = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pmb/franchise-pricing?franchiseId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedFranchise(data.franchise);
      }
    } catch (err) {
      console.error('Failed to load franchise detail:', err);
    }
    setLoading(false);
  };

  const createFranchise = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/pmb/franchise-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_franchise', ...createForm }),
      });
      if (res.ok) {
        setCreateModal(false);
        setCreateForm({ name: '', slug: '', adminEmail: '', adminName: '', phone: '' });
        fetchList();
      }
    } catch (err) {
      console.error('Create failed:', err);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-surface-400" />
      </div>
    );
  }

  // Franchise detail view
  if (selectedFranchise) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedFranchise(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        <PageHeader
          title={selectedFranchise.name}
          description="Franchise pricing overrides and location management"
          icon={<Building2 className="h-6 w-6" />}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<MapPin className="h-5 w-5" />} title="Locations" value={selectedFranchise.locations.length} />
          <StatCard icon={<Users className="h-5 w-5" />} title="Admin" value={selectedFranchise.adminName ?? '—'} />
          <StatCard icon={<History className="h-5 w-5" />} title="Pricing Changes" value={selectedFranchise.pricingOverrides.length} />
          <StatCard icon={<ShieldCheck className="h-5 w-5" />} title="Default Overrides" value={selectedFranchise.defaultPricing ? Object.keys(selectedFranchise.defaultPricing).length : 0} />
        </div>

        {/* Default Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Default Franchise Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedFranchise.defaultPricing ? (
              <div className="space-y-2">
                {Object.entries(selectedFranchise.defaultPricing).map(([tierSlug, overrides]) => (
                  <div key={tierSlug} className="flex items-center justify-between p-3 bg-surface-900 rounded-lg">
                    <span className="font-medium text-surface-200 capitalize">{tierSlug}</span>
                    <div className="flex gap-4 text-sm text-surface-400">
                      {Object.entries(overrides).map(([field, value]) => (
                        <span key={field}>{field}: {typeof value === 'number' ? formatCurrency(value) : String(value)}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-surface-500">No default pricing overrides — locations use standard tenant pricing</p>
            )}
          </CardContent>
        </Card>

        {/* Locations */}
        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedFranchise.locations.length > 0 ? (
              <div className="space-y-2">
                {selectedFranchise.locations.map((loc) => (
                  <div key={loc.id} className="flex items-center justify-between p-3 bg-surface-900 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-surface-500" />
                      <span className="text-surface-200">Tenant: {loc.tenantId}</span>
                      <Badge variant={loc.isActive ? 'success' : 'muted'}>
                        {loc.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="text-sm text-surface-400">
                      {loc.customPricing ? `${Object.keys(loc.customPricing).length} overrides` : 'Using defaults'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-surface-500">No locations assigned to this franchise</p>
            )}
          </CardContent>
        </Card>

        {/* Audit Trail */}
        {selectedFranchise.pricingOverrides.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pricing Change History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {selectedFranchise.pricingOverrides.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-surface-900 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <History className="h-3.5 w-3.5 text-surface-500" />
                      <span className="text-surface-300">
                        <span className="font-medium capitalize">{entry.tierSlug}</span> → {entry.field}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-surface-400">
                      <span>{entry.oldValue ?? '—'} → {entry.newValue}</span>
                      <span>{new Date(entry.changedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Franchise list view
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Franchise Pricing"
        description="Manage pricing overrides for franchise groups and their locations"
        icon={<Building2 className="h-6 w-6" />}
        actions={
          isSuperAdmin ? (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateModal(true)}>
              New Franchise Group
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={<Building2 className="h-5 w-5" />} title="Franchise Groups" value={franchises.length} />
        <StatCard icon={<MapPin className="h-5 w-5" />} title="Total Locations" value={franchises.reduce((s, f) => s + f.locationCount, 0)} />
        <StatCard icon={<DollarSign className="h-5 w-5" />} title="Active" value={franchises.filter((f) => f.isActive).length} />
      </div>

      {/* Franchise Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {franchises.map((f) => (
          <Card key={f.id} className="cursor-pointer hover:border-surface-600 transition-colors" onClick={() => loadFranchiseDetail(f.id)}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-surface-400" />
                  <h3 className="font-semibold text-surface-100">{f.name}</h3>
                </div>
                <Badge variant={f.isActive ? 'success' : 'muted'}>{f.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <div className="space-y-1 text-sm text-surface-400">
                <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {f.locationCount} locations</div>
                {f.adminEmail && <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> {f.adminEmail}</div>}
              </div>
              <div className="mt-3 flex items-center text-xs text-brand-400">
                View details <ChevronRight className="h-3 w-3 ml-1" />
              </div>
            </CardContent>
          </Card>
        ))}
        {franchises.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-surface-500">
              {isSuperAdmin ? 'No franchise groups yet — create one to get started' : 'Your store is not part of a franchise group'}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Franchise Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="New Franchise Group" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="e.g. PostalPros National" />
            <Input label="Slug" value={createForm.slug} onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })} placeholder="e.g. postalpros-national" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Admin Name" value={createForm.adminName} onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })} />
            <Input label="Admin Email" value={createForm.adminEmail} onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })} />
          </div>
          <Input label="Phone" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button
              leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              onClick={createFranchise}
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
