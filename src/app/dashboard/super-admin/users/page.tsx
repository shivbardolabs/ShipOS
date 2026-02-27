'use client';

import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input, SearchInput } from '@/components/ui/input';
import {
  Users,
  Plus,
  Pencil,
  ShieldCheck,
  ShieldOff,
  Mail,
  RotateCcw,
  Clock,
  AlertCircle,
  Key,
  Activity,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface SuperAdmin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  invitedBy: string | null;
  inviteExpiresAt: string | null;
  lastLoginAt: string | null;
  loginCount: number;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Mock data                                                                 */
/* -------------------------------------------------------------------------- */
const initialAdmins: SuperAdmin[] = [
  {
    id: 'sa1',
    firstName: 'Shiven',
    lastName: 'Ramji',
    email: 'shiv@bardolabs.ai',
    status: 'active',
    invitedBy: null,
    inviteExpiresAt: null,
    lastLoginAt: '2026-02-27T10:30:00Z',
    loginCount: 156,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-02-27T10:30:00Z',
  },
  {
    id: 'sa2',
    firstName: 'Rafael',
    lastName: 'Cordero',
    email: 'rafael@bardolabs.ai',
    status: 'active',
    invitedBy: 'Shiven Ramji',
    inviteExpiresAt: null,
    lastLoginAt: '2026-02-26T16:45:00Z',
    loginCount: 89,
    createdAt: '2025-03-15T09:00:00Z',
    updatedAt: '2026-02-26T16:45:00Z',
  },
  {
    id: 'sa3',
    firstName: 'Caitlin',
    lastName: 'Meyer',
    email: 'caitlin@bardolabs.ai',
    status: 'active',
    invitedBy: 'Shiven Ramji',
    inviteExpiresAt: null,
    lastLoginAt: '2026-02-25T11:20:00Z',
    loginCount: 42,
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2026-02-25T11:20:00Z',
  },
  {
    id: 'sa4',
    firstName: 'Dave',
    lastName: 'Thompson',
    email: 'dave@bardolabs.ai',
    status: 'pending',
    invitedBy: 'Shiven Ramji',
    inviteExpiresAt: '2026-03-01T09:00:00Z',
    lastLoginAt: null,
    loginCount: 0,
    createdAt: '2026-02-26T09:00:00Z',
    updatedAt: '2026-02-26T09:00:00Z',
  },
];

// Mock "current user" for self-deactivation prevention
const CURRENT_USER_ID = 'sa1';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

const statusVariant = (s: string) => {
  if (s === 'active') return 'success' as const;
  if (s === 'pending') return 'warning' as const;
  return 'muted' as const;
};

/* -------------------------------------------------------------------------- */
/*  Super Admin Users Page (BAR-232)                                          */
/* -------------------------------------------------------------------------- */
export default function SuperAdminUsersPage() {
  const [admins, setAdmins] = useState<SuperAdmin[]>(initialAdmins);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editAdmin, setEditAdmin] = useState<SuperAdmin | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form state for create/edit
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '' });

  // Filter admins
  const filtered = useMemo(() => {
    if (!search) return admins;
    const q = search.toLowerCase();
    return admins.filter(
      (a) =>
        a.firstName.toLowerCase().includes(q) ||
        a.lastName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
    );
  }, [admins, search]);

  // Stats
  const stats = useMemo(() => {
    const active = admins.filter((a) => a.status === 'active').length;
    const pending = admins.filter((a) => a.status === 'pending').length;
    const inactive = admins.filter((a) => a.status === 'inactive').length;
    return { total: admins.length, active, pending, inactive };
  }, [admins]);

  const activeCount = stats.active;

  const openCreate = useCallback(() => {
    setFormData({ firstName: '', lastName: '', email: '' });
    setFormErrors({});
    setShowCreateModal(true);
  }, []);

  const openEdit = useCallback((admin: SuperAdmin) => {
    setFormData({ firstName: admin.firstName, lastName: admin.lastName, email: admin.email });
    setFormErrors({});
    setEditAdmin(admin);
  }, []);

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format';
    else {
      const existing = admins.find(
        (a) => a.email.toLowerCase() === formData.email.toLowerCase() && a.id !== editAdmin?.id
      );
      if (existing) errors.email = 'Email already in use';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, admins, editAdmin]);

  const handleSave = useCallback(() => {
    if (!validateForm()) return;

    if (editAdmin) {
      setAdmins((prev) =>
        prev.map((a) =>
          a.id === editAdmin.id
            ? { ...a, ...formData, updatedAt: new Date().toISOString() }
            : a
        )
      );
      setEditAdmin(null);
    } else {
      const newAdmin: SuperAdmin = {
        id: `sa${Date.now()}`,
        ...formData,
        status: 'pending',
        invitedBy: 'Shiven Ramji',
        inviteExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        lastLoginAt: null,
        loginCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAdmins((prev) => [...prev, newAdmin]);
      setShowCreateModal(false);
    }
  }, [validateForm, formData, editAdmin]);

  const toggleStatus = useCallback(
    (adminId: string) => {
      const admin = admins.find((a) => a.id === adminId);
      if (!admin) return;

      // Prevent self-deactivation
      if (adminId === CURRENT_USER_ID) return;

      // Prevent deactivating the last active super admin
      if (admin.status === 'active' && activeCount <= 1) return;

      if (admin.status === 'active') {
        setShowDeactivateConfirm(adminId);
      } else {
        setAdmins((prev) =>
          prev.map((a) =>
            a.id === adminId ? { ...a, status: 'active', updatedAt: new Date().toISOString() } : a
          )
        );
      }
    },
    [admins, activeCount]
  );

  const confirmDeactivate = useCallback(() => {
    if (!showDeactivateConfirm) return;
    setAdmins((prev) =>
      prev.map((a) =>
        a.id === showDeactivateConfirm ? { ...a, status: 'inactive' as const, updatedAt: new Date().toISOString() } : a
      )
    );
    setShowDeactivateConfirm(null);
  }, [showDeactivateConfirm]);

  const resendInvite = useCallback((adminId: string) => {
    setAdmins((prev) =>
      prev.map((a) =>
        a.id === adminId
          ? { ...a, inviteExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), updatedAt: new Date().toISOString() }
          : a
      )
    );
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Users"
        description="Manage Bardo Labs staff who administer the mailbox platform"
        icon={<Users className="h-6 w-6" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowPasswordModal(true)} leftIcon={<Key className="h-4 w-4" />}>
              Change Password
            </Button>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              New Super Admin
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-surface-100">{stats.total}</p>
          <p className="text-xs text-surface-400">Total Admins</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
          <p className="text-xs text-surface-400">Active</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
          <p className="text-xs text-surface-400">Pending Invite</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-surface-500">{stats.inactive}</p>
          <p className="text-xs text-surface-400">Inactive</p>
        </div>
      </div>

      {/* Search */}
      <SearchInput
        placeholder="Search super admins…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-72"
      />

      {/* Admin Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((admin) => {
          const isSelf = admin.id === CURRENT_USER_ID;
          const isLastActive = admin.status === 'active' && activeCount <= 1;
          const inviteExpired =
            admin.status === 'pending' &&
            admin.inviteExpiresAt &&
            new Date(admin.inviteExpiresAt) < new Date();

          return (
            <Card key={admin.id}>
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/20 text-primary-400 text-sm font-bold flex-shrink-0">
                  {admin.firstName[0]}{admin.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-surface-100">
                      {admin.firstName} {admin.lastName}
                    </h3>
                    <Badge variant={statusVariant(admin.status)} dot>{admin.status}</Badge>
                    {isSelf && (
                      <span className="text-[10px] font-medium text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-surface-400 mt-0.5">{admin.email}</p>

                  <div className="flex items-center gap-4 mt-3 text-xs text-surface-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last login: {timeAgo(admin.lastLoginAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {admin.loginCount} logins
                    </span>
                  </div>

                  {/* Pending invite info */}
                  {admin.status === 'pending' && (
                    <div className="mt-3 rounded-lg bg-surface-800/50 p-2.5">
                      <div className="flex items-center gap-2 text-xs">
                        <Mail className="h-3.5 w-3.5 text-yellow-400" />
                        <span className="text-surface-300">
                          Invitation sent{admin.invitedBy ? ` by ${admin.invitedBy}` : ''}
                        </span>
                      </div>
                      {inviteExpired ? (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Invite expired — resend to continue
                        </p>
                      ) : admin.inviteExpiresAt ? (
                        <p className="text-xs text-surface-500 mt-1">
                          Expires {formatDate(admin.inviteExpiresAt)}
                        </p>
                      ) : null}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3">
                    <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-3 w-3" />} onClick={() => openEdit(admin)}>
                      Edit
                    </Button>
                    {admin.status === 'pending' && (
                      <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="h-3 w-3" />} onClick={() => resendInvite(admin.id)}>
                        Resend Invite
                      </Button>
                    )}
                    {admin.status === 'active' && !isSelf && !isLastActive && (
                      <Button variant="ghost" size="sm" leftIcon={<ShieldOff className="h-3 w-3 text-red-400" />} onClick={() => toggleStatus(admin.id)}>
                        <span className="text-red-400">Deactivate</span>
                      </Button>
                    )}
                    {admin.status === 'inactive' && (
                      <Button variant="ghost" size="sm" leftIcon={<ShieldCheck className="h-3 w-3 text-emerald-400" />} onClick={() => toggleStatus(admin.id)}>
                        <span className="text-emerald-400">Reactivate</span>
                      </Button>
                    )}
                    {isSelf && (
                      <span className="text-[10px] text-surface-500">Cannot deactivate yourself</span>
                    )}
                    {isLastActive && !isSelf && admin.status === 'active' && (
                      <span className="text-[10px] text-surface-500">Last active admin — cannot deactivate</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card>
          <p className="text-center text-sm text-surface-400 py-8">No super admins found.</p>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={showCreateModal || editAdmin !== null}
        onClose={() => { setShowCreateModal(false); setEditAdmin(null); }}
        title={editAdmin ? 'Edit Super Admin' : 'Create Super Admin'}
        description={editAdmin ? 'Update admin information' : 'A secure invitation will be sent to set up their password'}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCreateModal(false); setEditAdmin(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editAdmin ? 'Save Changes' : 'Send Invitation'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="First Name"
              placeholder="Jane"
              required
              value={formData.firstName}
              onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
              error={formErrors.firstName}
            />
            <Input
              label="Last Name"
              placeholder="Doe"
              required
              value={formData.lastName}
              onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
              error={formErrors.lastName}
            />
          </div>
          <Input
            label="Email"
            type="email"
            placeholder="jane@bardolabs.ai"
            required
            value={formData.email}
            onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
            error={formErrors.email}
            helperText={!editAdmin ? 'Invitation link expires after 72 hours' : undefined}
          />
          {!editAdmin && (
            <div className="rounded-lg bg-surface-800/50 p-3">
              <p className="text-xs text-surface-400">
                <strong className="text-surface-300">What happens next:</strong> The new admin will receive an email
                with a secure link to set their password. Once set, their status changes to Active and they can
                immediately log in to the super admin console.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Change Password Modal (self-service) */}
      <Modal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Your Password"
        description="Requires your current password for verification"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
            <Button onClick={() => setShowPasswordModal(false)}>Update Password</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Current Password" type="password" placeholder="Enter current password" required />
          <Input
            label="New Password"
            type="password"
            placeholder="Enter new password"
            required
            helperText="Min 8 chars, at least one uppercase, one lowercase, and one number"
          />
          <Input label="Confirm New Password" type="password" placeholder="Re-enter new password" required />
        </div>
      </Modal>

      {/* Deactivate Confirmation */}
      <Modal
        open={showDeactivateConfirm !== null}
        onClose={() => setShowDeactivateConfirm(null)}
        title="Deactivate Super Admin"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeactivateConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDeactivate}>Deactivate</Button>
          </>
        }
      >
        <p className="text-sm text-surface-300">
          This will immediately revoke access and terminate any active sessions for this admin.
          They can be reactivated later without needing to set a new password.
        </p>
      </Modal>
    </div>
  );
}
