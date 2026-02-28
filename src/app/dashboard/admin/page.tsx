'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTenant } from '@/components/tenant-provider';
import { SearchInput } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { RoleBadge, type UserRole } from '@/components/ui/role-badge';
import {
  ShieldCheck,
  Users,
  Activity,
  Clock,
  UserCheck,
  LogIn,
  Building2,
  AlertCircle,
  Pencil,
  Check,
  UserCog,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface AdminUser {
  id: string;
  auth0Id: string | null;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  lastLoginAt: string | null;
  loginCount: number;
  createdAt: string;
  updatedAt: string;
  tenant: { id: string; name: string; slug: string } | null;
  sessionCount: number;
}

interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  subscriptionTier: string;
  trialEndsAt: string | null;
  createdAt: string;
  userCount: number;
}

interface LoginSession {
  id: string;
  loginAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string | null;
    tenantName: string | null;
  };
}

/* -------------------------------------------------------------------------- */
/*  Time helpers                                                              */
/* -------------------------------------------------------------------------- */
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
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/* -------------------------------------------------------------------------- */
/*  Role color map for inline styles                                          */
/* -------------------------------------------------------------------------- */
const roleColors: Record<string, { bg: string; text: string; border: string }> = {
  superadmin: { bg: '#e11d4810', text: '#e11d48', border: '#e11d4830' },
  admin: { bg: '#7c3aed10', text: '#7c3aed', border: '#7c3aed30' },
  manager: { bg: '#d9770610', text: '#d97706', border: '#d9770630' },
  employee: { bg: '#0891b210', text: '#0891b2', border: '#0891b230' },
};

/* -------------------------------------------------------------------------- */
/*  Status indicator                                                          */
/* -------------------------------------------------------------------------- */
function OnlineIndicator({ lastLogin }: { lastLogin: string | null }) {
  if (!lastLogin) return <span className="text-xs text-surface-600">Never logged in</span>;
  const minutesAgo = (Date.now() - new Date(lastLogin).getTime()) / 60_000;
  const isRecent = minutesAgo < 30;
  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        {isRecent && (
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-50 animate-ping"
            style={{ backgroundColor: '#22c55e' }}
          />
        )}
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ backgroundColor: isRecent ? '#22c55e' : '#6b7280' }}
        />
      </span>
      <span className="text-xs text-surface-500">{timeAgo(lastLogin)}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tab navigation                                                            */
/* -------------------------------------------------------------------------- */
type TabKey = 'users' | 'sessions' | 'tenants';

function TabButton({
  active,
  label,
  icon: Icon,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ElementType;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
        active
          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
          : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count !== undefined && (
        <span
          className={`ml-1 px-1.5 py-0 text-[10px] font-bold rounded-full ${
            active ? 'bg-rose-500/25 text-rose-300' : 'bg-surface-700 text-surface-400'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Edit User Modal                                                           */
/* -------------------------------------------------------------------------- */
function EditUserModal({
  user,
  tenants,
  open,
  onClose,
  onSave,
}: {
  user: AdminUser | null;
  tenants: AdminTenant[];
  open: boolean;
  onClose: () => void;
  onSave: (userId: string, role: string, tenantId: string | null) => Promise<void>;
}) {
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
      setSelectedTenantId(user.tenant?.id ?? '__none__');
      setSaveSuccess(false);
    }
  }, [user]);

  const hasChanges =
    user &&
    (selectedRole !== user.role ||
      (selectedTenantId === '__none__' ? null : selectedTenantId) !==
        (user.tenant?.id ?? null));

  const handleSave = async () => {
    if (!user || !hasChanges) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const tenantId = selectedTenantId === '__none__' ? null : selectedTenantId;
      await onSave(user.id, selectedRole, tenantId);
      setSaveSuccess(true);
      setTimeout(() => onClose(), 800);
    } catch {
      // Error handling done in parent
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const rc = roleColors[user.role] || roleColors.employee;

  const roleOptions = [
    { value: 'superadmin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'employee', label: 'Employee' },
  ];

  const tenantOptions = [
    { value: '__none__', label: 'No Tenant (Unassigned)' },
    ...tenants.map((t) => ({
      value: t.id,
      label: `${t.name} (${t.userCount} user${t.userCount !== 1 ? 's' : ''})`,
    })),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit User Assignment"
      description="Assign tenant and role."
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={saving}
            disabled={!hasChanges || saving}
            onClick={handleSave}
            leftIcon={
              saveSuccess ? (
                <Check className="h-4 w-4" />
              ) : (
                <UserCog className="h-4 w-4" />
              )
            }
            className={
              saveSuccess
                ? 'bg-green-600 hover:bg-green-600'
                : undefined
            }
          >
            {saveSuccess ? 'Saved!' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* User identity */}
        <div className="flex items-center gap-4 p-4 rounded-xl border border-surface-700 bg-surface-800/50">
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar}
              alt={user.name || "User"}
              className="h-12 w-12 rounded-full object-cover flex-shrink-0"
              style={{ boxShadow: `0 0 0 2px ${rc.text}40` }}
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white flex-shrink-0"
              style={{ background: rc.text }}
            >
              {(user.name || user.email || "?")
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-base font-semibold text-surface-100 truncate">{user.name || "Unnamed"}</p>
            <p className="text-sm text-surface-400 truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <RoleBadge role={user.role as UserRole} size="xs" />
              {user.tenant && (
                <span className="text-xs text-surface-500 flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {user.tenant.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Role selector */}
        <div>
          <Select
            label="Role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            options={roleOptions}
          />
          <p className="text-xs text-surface-500 mt-1.5">
            {selectedRole === 'superadmin' && 'Full platform access — cross-tenant management, system configuration'}
            {selectedRole === 'admin' && 'Full tenant access — manage users, settings, billing'}
            {selectedRole === 'manager' && 'Operations — packages, mail, customers, reports'}
            {selectedRole === 'employee' && 'Basic operations — check-in, check-out, customer lookup'}
          </p>
        </div>

        {/* Tenant selector */}
        <div>
          <Select
            label="Tenant"
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            options={tenantOptions}
          />
          <p className="text-xs text-surface-500 mt-1.5">
            Assign this user to a specific tenant (store/location). Unassigned users will have a tenant created on next login.
          </p>
        </div>

        {/* Change summary */}
        {hasChanges && (
          <div
            className="p-3 rounded-lg border"
            style={{ background: '#f59e0b08', borderColor: '#f59e0b25' }}
          >
            <p className="text-xs font-semibold text-amber-400 mb-2">Pending Changes</p>
            <div className="space-y-1">
              {selectedRole !== user.role && (
                <p className="text-xs text-surface-300">
                  Role: <span className="text-surface-500">{user.role}</span>{' '}
                  <span className="text-surface-500">→</span>{' '}
                  <span className="font-medium text-surface-100">{selectedRole}</span>
                </p>
              )}
              {(selectedTenantId === '__none__' ? null : selectedTenantId) !==
                (user.tenant?.id ?? null) && (
                <p className="text-xs text-surface-300">
                  Tenant: <span className="text-surface-500">{user.tenant?.name || 'None'}</span>{' '}
                  <span className="text-surface-500">→</span>{' '}
                  <span className="font-medium text-surface-100">
                    {selectedTenantId === '__none__'
                      ? 'None'
                      : tenants.find((t) => t.id === selectedTenantId)?.name || 'Unknown'}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                 */
/* -------------------------------------------------------------------------- */
export default function MasterAdminPage() {
  const { localUser, loading } = useTenant();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('users');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Edit modal state
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Fetch data
  useEffect(() => {
    if (loading) return;
    if (localUser?.role !== 'superadmin') return;

    async function fetchData() {
      setLoadingData(true);
      setError(null);
      try {
        const [usersRes, sessionsRes, tenantsRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/sessions'),
          fetch('/api/admin/tenants'),
        ]);

        if (usersRes.ok) {
          try {
            const data = await usersRes.json();
            if (Array.isArray(data)) setUsers(data);
          } catch { /* ignore malformed response */ }
        }
        if (sessionsRes.ok) {
          try {
            const data = await sessionsRes.json();
            if (Array.isArray(data)) setSessions(data);
          } catch { /* ignore malformed response */ }
        }
        if (tenantsRes.ok) {
          try {
            const data = await tenantsRes.json();
            if (Array.isArray(data)) setTenants(data);
          } catch { /* ignore malformed response */ }
        }
      } catch (err) {
        console.error('Failed to fetch admin data', err);
        setError('Failed to load data. The database may not be available.');
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, [loading, localUser?.role]);

  // Handle save from edit modal
  const handleSaveUser = useCallback(
    async (userId: string, role: string, tenantId: string | null) => {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role, tenantId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update user');
      }

      const updated: AdminUser = await res.json();

      // Update local state
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

      // Refresh tenants to get updated user counts
      try {
        const tenantsRes = await fetch('/api/admin/tenants');
        if (tenantsRes.ok) {
          setTenants(await tenantsRes.json());
        }
      } catch {
        // non-critical
      }
    },
    []
  );

  // Handle tenant status change
  const handleTenantStatusChange = useCallback(
    async (tenantId: string, newStatus: string) => {
      try {
        const res = await fetch('/api/admin/tenants', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, status: newStatus }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update tenant');
        }

        const updated = await res.json();
        setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } catch (err) {
        console.error('Failed to update tenant status', err);
        setError(err instanceof Error ? err.message : 'Failed to update tenant');
      }
    },
    []
  );

  const openEditModal = useCallback((user: AdminUser) => {
    setEditUser(user);
    setEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditModalOpen(false);
    setTimeout(() => setEditUser(null), 200);
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    let result = users;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          u.tenant?.name?.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter);
    }
    return result;
  }, [users, search, roleFilter]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    if (!search) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(
      (s) =>
        (s.user.name || '').toLowerCase().includes(q) ||
        (s.user.email || '').toLowerCase().includes(q)
    );
  }, [sessions, search]);

  // Stats
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => {
      if (!u.lastLoginAt) return false;
      const daysSince = (Date.now() - new Date(u.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 7;
    }).length;
    const tenantCount = new Set(users.map((u) => u.tenant?.id).filter(Boolean)).size;
    const todaySessions = sessions.filter((s) => {
      const loginDate = new Date(s.loginAt).toDateString();
      return loginDate === new Date().toDateString();
    }).length;
    return { totalUsers, activeUsers, tenants: tenantCount, todaySessions };
  }, [users, sessions]);

  // ── Access guard ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-surface-800 rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-surface-800 rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-surface-800 rounded-xl" />
      </div>
    );
  }

  if (localUser?.role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
          style={{ background: '#e11d4815' }}
        >
          <ShieldCheck className="h-8 w-8" style={{ color: '#e11d48' }} />
        </div>
        <h2 className="text-xl font-bold text-surface-200 mb-2">Access Restricted</h2>
        <p className="text-surface-500 max-w-md">
          The Master Admin panel is only available to users with the{' '}
          <strong className="text-rose-400">Super Admin</strong> role.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: '#e11d4815' }}
          >
            <ShieldCheck className="h-5 w-5" style={{ color: '#e11d48' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-100">Master Admin</h1>
            <p className="text-sm text-surface-500">
              Platform-wide user management and login activity
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: '#6366f115' }}
            >
              <Users className="h-4.5 w-4.5" style={{ color: '#6366f1' }} />
            </div>
          </div>
          <p className="text-2xl font-bold text-surface-100">{stats.totalUsers}</p>
          <p className="text-xs text-surface-500 mt-0.5">Total Users</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: '#22c55e15' }}
            >
              <UserCheck className="h-4.5 w-4.5" style={{ color: '#22c55e' }} />
            </div>
          </div>
          <p className="text-2xl font-bold text-surface-100">{stats.activeUsers}</p>
          <p className="text-xs text-surface-500 mt-0.5">Active (7 days)</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: '#f59e0b15' }}
            >
              <Building2 className="h-4.5 w-4.5" style={{ color: '#f59e0b' }} />
            </div>
          </div>
          <p className="text-2xl font-bold text-surface-100">{stats.tenants}</p>
          <p className="text-xs text-surface-500 mt-0.5">Tenants</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: '#e11d4815' }}
            >
              <LogIn className="h-4.5 w-4.5" style={{ color: '#e11d48' }} />
            </div>
          </div>
          <p className="text-2xl font-bold text-surface-100">{stats.todaySessions}</p>
          <p className="text-xs text-surface-500 mt-0.5">Logins Today</p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: '#f59e0b10', borderColor: '#f59e0b30' }}>
          <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#f59e0b' }} />
          <div>
            <p className="text-sm font-medium text-amber-400">{error}</p>
            <p className="text-xs text-surface-500 mt-0.5">
              Showing mock data based on Auth0 session fallback.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <TabButton
          active={activeTab === 'users'}
          label="All Users"
          icon={Users}
          count={users.length}
          onClick={() => setActiveTab('users')}
        />
        <TabButton
          active={activeTab === 'sessions'}
          label="Login Sessions"
          icon={Activity}
          count={sessions.length}
          onClick={() => setActiveTab('sessions')}
        />
        <TabButton
          active={activeTab === 'tenants'}
          label="Tenants"
          icon={Building2}
          count={tenants.length}
          onClick={() => setActiveTab('tenants')}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-md">
          <SearchInput
            placeholder={activeTab === 'users' ? 'Search users by name, email, or tenant…' : 'Search sessions by user…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {activeTab === 'users' && (
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-40"
            options={[
              { value: 'all', label: 'All Roles' },
              { value: 'superadmin', label: 'Super Admin' },
              { value: 'admin', label: 'Admin' },
              { value: 'manager', label: 'Manager' },
              { value: 'employee', label: 'Employee' },
            ]}
          />
        )}
      </div>

      {/* Content */}
      {loadingData ? (
        <div className="glass-card divide-y divide-surface-800">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-surface-800" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-surface-800 rounded" />
                <div className="h-3 w-48 bg-surface-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'users' ? (
        <UsersTable users={filteredUsers} onEdit={openEditModal} />
      ) : activeTab === 'tenants' ? (
        <TenantsTable tenants={tenants} onStatusChange={handleTenantStatusChange} />
      ) : (
        <SessionsTable sessions={filteredSessions} />
      )}

      {/* Edit modal */}
      <EditUserModal
        user={editUser}
        tenants={tenants}
        open={editModalOpen}
        onClose={closeEditModal}
        onSave={handleSaveUser}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Users Table                                                               */
/* -------------------------------------------------------------------------- */
function UsersTable({
  users,
  onEdit,
}: {
  users: AdminUser[];
  onEdit: (user: AdminUser) => void;
}) {
  if (users.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Users className="h-10 w-10 text-surface-600 mx-auto mb-3" />
        <p className="text-surface-400 font-medium">No users found</p>
        <p className="text-sm text-surface-600 mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-surface-500 border-b border-surface-800">
        <div className="col-span-3">User</div>
        <div className="col-span-2">Role</div>
        <div className="col-span-2">Tenant</div>
        <div className="col-span-2">Last Login</div>
        <div className="col-span-1 text-center">Logins</div>
        <div className="col-span-1 text-center">Status</div>
        <div className="col-span-1 text-center">Actions</div>
      </div>

      {/* User rows */}
      <div className="divide-y divide-surface-800/50">
        {users.map((user) => {
          const rc = roleColors[user.role] || roleColors.employee;
          const hasLoggedIn = !!user.auth0Id;
          return (
            <div
              key={user.id}
              className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-surface-800/30 transition-colors group"
            >
              {/* User info */}
              <div className="col-span-3 flex items-center gap-3 min-w-0">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt={user.name || "User"}
                    className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                    style={{ boxShadow: `0 0 0 2px ${rc.text}40` }}
                  />
                ) : (
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0"
                    style={{ background: rc.text }}
                  >
                    {(user.name || user.email || '?')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || '?'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-200 truncate">{user.name || 'Unnamed'}</p>
                  <p className="text-xs text-surface-500 truncate">{user.email}</p>
                </div>
              </div>

              {/* Role */}
              <div className="col-span-2">
                <RoleBadge role={user.role as UserRole} size="xs" />
              </div>

              {/* Tenant */}
              <div className="col-span-2">
                {user.tenant ? (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-surface-500 flex-shrink-0" />
                    <span className="text-sm text-surface-300 truncate">{user.tenant.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-surface-600">No tenant</span>
                )}
              </div>

              {/* Last login */}
              <div className="col-span-2">
                <OnlineIndicator lastLogin={user.lastLoginAt} />
                {user.lastLoginAt && (
                  <p className="text-[10px] text-surface-600 mt-0.5">
                    {formatDateTime(user.lastLoginAt)}
                  </p>
                )}
              </div>

              {/* Login count */}
              <div className="col-span-1 text-center">
                <span className="text-sm font-medium text-surface-300">{user.loginCount}</span>
              </div>

              {/* Status */}
              <div className="col-span-1 text-center">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={
                    hasLoggedIn
                      ? { background: '#22c55e15', color: '#22c55e', border: '1px solid #22c55e30' }
                      : { background: '#6b728015', color: '#6b7280', border: '1px solid #6b728030' }
                  }
                >
                  {hasLoggedIn ? 'Active' : 'Pending'}
                </span>
              </div>

              {/* Actions */}
              <div className="col-span-1 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  onClick={() => onEdit(user)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-surface-400 hover:text-rose-400"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-surface-800 flex items-center justify-between">
        <p className="text-xs text-surface-500">
          Showing {users.length} user{users.length !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-surface-600">
          Click the edit icon to assign roles & tenants
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tenants Table — Status badges, tier, and activate/pause/disable toggle    */
/* -------------------------------------------------------------------------- */
const tenantStatusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  active: { label: 'Active', bg: '#22c55e15', text: '#22c55e', border: '#22c55e30' },
  paused: { label: 'Paused', bg: '#f59e0b15', text: '#f59e0b', border: '#f59e0b30' },
  disabled: { label: 'Disabled', bg: '#ef444415', text: '#ef4444', border: '#ef444430' },
  trial: { label: 'Trial', bg: '#6366f115', text: '#6366f1', border: '#6366f130' },
};

const tierLabels: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

function TenantsTable({
  tenants,
  onStatusChange,
}: {
  tenants: AdminTenant[];
  onStatusChange: (tenantId: string, status: string) => Promise<void>;
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (tenantId: string, newStatus: string) => {
    setUpdatingId(tenantId);
    try {
      await onStatusChange(tenantId, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  if (tenants.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Building2 className="h-10 w-10 text-surface-600 mx-auto mb-3" />
        <p className="text-surface-400 font-medium">No tenants found</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-surface-500 border-b border-surface-800">
        <div className="col-span-3">Tenant</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Plan</div>
        <div className="col-span-1 text-center">Users</div>
        <div className="col-span-2">Created</div>
        <div className="col-span-2 text-center">Actions</div>
      </div>

      {/* Tenant rows */}
      <div className="divide-y divide-surface-800/50">
        {tenants.map((tenant) => {
          const statusCfg = tenantStatusConfig[tenant.status] || tenantStatusConfig.active;
          const isUpdating = updatingId === tenant.id;

          return (
            <div
              key={tenant.id}
              className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-surface-800/30 transition-colors group"
            >
              {/* Name & slug */}
              <div className="col-span-3 min-w-0">
                <p className="text-sm font-medium text-surface-200 truncate">{tenant.name}</p>
                <p className="text-xs text-surface-500 font-mono truncate">/{tenant.slug}</p>
              </div>

              {/* Status badge */}
              <div className="col-span-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{
                    background: statusCfg.bg,
                    color: statusCfg.text,
                    border: `1px solid ${statusCfg.border}`,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: statusCfg.text }}
                  />
                  {statusCfg.label}
                </span>
              </div>

              {/* Tier */}
              <div className="col-span-2">
                <span className="text-sm text-surface-300">
                  {tierLabels[tenant.subscriptionTier] || tenant.subscriptionTier}
                </span>
                {tenant.trialEndsAt && (
                  <p className="text-[10px] text-surface-500">
                    Trial ends {new Date(tenant.trialEndsAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* User count */}
              <div className="col-span-1 text-center">
                <span className="text-sm font-medium text-surface-300">{tenant.userCount}</span>
              </div>

              {/* Created */}
              <div className="col-span-2">
                <span className="text-xs text-surface-400">
                  {new Date(tenant.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {/* Status actions */}
              <div className="col-span-2 flex items-center justify-center gap-1">
                {tenant.status !== 'active' && (
                  <button
                    onClick={() => handleStatusChange(tenant.id, 'active')}
                    disabled={isUpdating}
                    className="px-2 py-1 text-[10px] font-semibold rounded-md transition-all hover:bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 disabled:opacity-50"
                    title="Activate tenant"
                  >
                    Activate
                  </button>
                )}
                {tenant.status !== 'paused' && tenant.status !== 'disabled' && (
                  <button
                    onClick={() => handleStatusChange(tenant.id, 'paused')}
                    disabled={isUpdating}
                    className="px-2 py-1 text-[10px] font-semibold rounded-md transition-all hover:bg-amber-500/15 text-amber-400 border border-amber-500/20 disabled:opacity-50"
                    title="Pause tenant"
                  >
                    Pause
                  </button>
                )}
                {tenant.status !== 'disabled' && (
                  <button
                    onClick={() => handleStatusChange(tenant.id, 'disabled')}
                    disabled={isUpdating}
                    className="px-2 py-1 text-[10px] font-semibold rounded-md transition-all hover:bg-red-500/15 text-red-400 border border-red-500/20 disabled:opacity-50"
                    title="Disable tenant"
                  >
                    Disable
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-surface-800">
        <p className="text-xs text-surface-500">
          {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} •
          {' '}{tenants.filter((t) => t.status === 'active').length} active
        </p>
      </div>
    </div>
  );
}
/* -------------------------------------------------------------------------- */
/*  Sessions Table                                                            */
/* -------------------------------------------------------------------------- */
function SessionsTable({ sessions }: { sessions: LoginSession[] }) {
  if (sessions.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Activity className="h-10 w-10 text-surface-600 mx-auto mb-3" />
        <p className="text-surface-400 font-medium">No login sessions found</p>
        <p className="text-sm text-surface-600 mt-1">Sessions are recorded when users access the app</p>
      </div>
    );
  }

  // Group sessions by date
  const grouped = sessions.reduce(
    (acc, s) => {
      const date = new Date(s.loginAt).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(s);
      return acc;
    },
    {} as Record<string, LoginSession[]>
  );

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, dateSessions]) => (
        <div key={date} className="glass-card overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-surface-500" />
              <span className="text-sm font-medium text-surface-300">{date}</span>
            </div>
            <span className="text-xs text-surface-500">
              {dateSessions.length} login{dateSessions.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="divide-y divide-surface-800/50">
            {dateSessions.map((session) => {
              const rc = roleColors[session.user.role] || roleColors.employee;
              return (
                <div
                  key={session.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-surface-800/30 transition-colors"
                >
                  {/* Time */}
                  <div className="w-20 flex-shrink-0">
                    <span className="text-sm font-mono text-surface-400">
                      {new Date(session.loginAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                  </div>

                  {/* User */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {session.user.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={session.user.avatar}
                        alt={session.user.name || "User"}
                        className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white flex-shrink-0"
                        style={{ background: rc.text }}
                      >
                        {(session.user.name || session.user.email || '?')
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2) || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-200 truncate">
                        {session.user.name || "Unnamed"}
                      </p>
                      <p className="text-xs text-surface-500 truncate">{session.user.email}</p>
                    </div>
                  </div>

                  {/* Role badge */}
                  <RoleBadge role={session.user.role as UserRole} size="xs" />

                  {/* Tenant */}
                  <div className="w-36 flex-shrink-0">
                    {session.user.tenantName ? (
                      <span className="text-xs text-surface-400 truncate block">
                        {session.user.tenantName}
                      </span>
                    ) : (
                      <span className="text-xs text-surface-600">—</span>
                    )}
                  </div>

                  {/* Login indicator */}
                  <div className="flex-shrink-0">
                    <LogIn className="h-4 w-4 text-surface-600" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
