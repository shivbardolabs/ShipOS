'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTenant } from '@/components/tenant-provider';
import { SearchInput } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
      <span
        className="relative flex h-2 w-2"
      >
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
type TabKey = 'users' | 'sessions';

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
/*  Main Page                                                                 */
/* -------------------------------------------------------------------------- */
export default function MasterAdminPage() {
  const { localUser, loading } = useTenant();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('users');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Fetch data
  useEffect(() => {
    if (loading) return;
    if (localUser?.role !== 'superadmin') return;

    async function fetchData() {
      setLoadingData(true);
      setError(null);
      try {
        const [usersRes, sessionsRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/sessions'),
        ]);

        if (usersRes.ok) {
          setUsers(await usersRes.json());
        }
        if (sessionsRes.ok) {
          setSessions(await sessionsRes.json());
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

  // Filtered users
  const filteredUsers = useMemo(() => {
    let result = users;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
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
        s.user.name.toLowerCase().includes(q) ||
        s.user.email.toLowerCase().includes(q)
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
    const tenants = new Set(users.map((u) => u.tenant?.id).filter(Boolean)).size;
    const todaySessions = sessions.filter((s) => {
      const loginDate = new Date(s.loginAt).toDateString();
      return loginDate === new Date().toDateString();
    }).length;
    return { totalUsers, activeUsers, tenants, todaySessions };
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
          >
            <option value="all">All Roles</option>
            <option value="superadmin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </Select>
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
        <UsersTable users={filteredUsers} />
      ) : (
        <SessionsTable sessions={filteredSessions} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Users Table                                                               */
/* -------------------------------------------------------------------------- */
function UsersTable({ users }: { users: AdminUser[] }) {
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
        <div className="col-span-4">User</div>
        <div className="col-span-2">Role</div>
        <div className="col-span-2">Tenant</div>
        <div className="col-span-2">Last Login</div>
        <div className="col-span-1 text-center">Logins</div>
        <div className="col-span-1 text-center">Status</div>
      </div>

      {/* User rows */}
      <div className="divide-y divide-surface-800/50">
        {users.map((user) => {
          const rc = roleColors[user.role] || roleColors.employee;
          const hasLoggedIn = !!user.auth0Id;
          return (
            <div
              key={user.id}
              className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-surface-800/30 transition-colors"
            >
              {/* User info */}
              <div className="col-span-4 flex items-center gap-3 min-w-0">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                    style={{ boxShadow: `0 0 0 2px ${rc.text}40` }}
                  />
                ) : (
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0"
                    style={{ background: rc.text }}
                  >
                    {user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-200 truncate">{user.name}</p>
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
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-surface-800 flex items-center justify-between">
        <p className="text-xs text-surface-500">
          Showing {users.length} user{users.length !== 1 ? 's' : ''}
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
                        alt={session.user.name}
                        className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white flex-shrink-0"
                        style={{ background: rc.text }}
                      >
                        {session.user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-200 truncate">
                        {session.user.name}
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
