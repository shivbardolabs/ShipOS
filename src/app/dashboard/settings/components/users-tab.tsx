'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { TenantUser, PendingInvitation } from './types';
import { Check, Eye, Mail, Plus, Shield, Trash2, Users, X } from 'lucide-react';

export interface UsersTabProps {
  localUser: { id: string; role: string; email: string } | null;
  teamUsers: TenantUser[];
  usersLoading: boolean;
  roleUpdating: string | null;
  showDeletedUsers: boolean;
  setShowDeletedUsers: (v: boolean) => void;
  statusUpdating: string | null;
  deletingUser: string | null;
  restoringUser: string | null;
  showInviteModal: boolean;
  setShowInviteModal: (v: boolean) => void;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteRole: string;
  setInviteRole: (v: string) => void;
  inviteSending: boolean;
  inviteError: string;
  setInviteError: (v: string) => void;
  inviteSuccess: boolean;
  setInviteSuccess: (v: boolean) => void;
  activePendingInvitations: PendingInvitation[];
  invitationsLoading: boolean;
  revokingInvite: string | null;
  handleRoleChange: (userId: string, newRole: string) => void;
  handleStatusToggle: (userId: string, newStatus: string) => void;
  handleSoftDelete: (userId: string) => void;
  handleRestoreUser: (userId: string) => void;
  handleInviteUser: () => void;
  handleRevokeInvite: (invitationId: string) => void;
}

export function UsersTab({ localUser, teamUsers, usersLoading, roleUpdating, showDeletedUsers, setShowDeletedUsers, statusUpdating, deletingUser, restoringUser, showInviteModal, setShowInviteModal, inviteEmail, setInviteEmail, inviteRole, setInviteRole, inviteSending, inviteError, setInviteError, inviteSuccess, setInviteSuccess, activePendingInvitations, invitationsLoading, revokingInvite, handleRoleChange, handleStatusToggle, handleSoftDelete, handleRestoreUser, handleInviteUser, handleRevokeInvite }: UsersTabProps) {
  return (
    <>
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-4">
      <h2 className="text-sm font-semibold text-surface-200">Team Members</h2>
      {/* Show deleted users toggle for audit view */}
      {(localUser?.role === 'admin' || localUser?.role === 'superadmin') && (
        <button
          type="button"
          onClick={() => setShowDeletedUsers(!showDeletedUsers)}
          className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-md border transition-all ${
            showDeletedUsers
              ? 'bg-surface-700/50 text-surface-300 border-surface-600'
              : 'text-surface-500 border-surface-700/50 hover:bg-surface-800'
          }`}
        >
          <Eye className="h-3 w-3" />
          {showDeletedUsers ? 'Showing deleted' : 'Show deleted'}
        </button>
      )}
    </div>
    <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => { setShowInviteModal(true); setInviteError(''); setInviteSuccess(false); }}>
      Invite User
    </Button>
  </div>

  {usersLoading ? (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <div className="flex items-center gap-4 animate-pulse">
            <div className="h-10 w-10 rounded-full bg-surface-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-surface-800 rounded" />
              <div className="h-3 w-48 bg-surface-800 rounded" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  ) : teamUsers.length === 0 ? (
    <Card>
      <div className="py-12 text-center">
        <Users className="h-10 w-10 text-surface-600 mx-auto mb-3" />
        <p className="text-surface-400 text-sm">No team members yet.</p>
        <p className="text-surface-500 text-xs mt-1">Users are automatically added when they sign in via Auth0.</p>
      </div>
    </Card>
  ) : (
    <div className="space-y-3">
      {teamUsers.map((member) => {
        const roleColor =
          member.role === 'admin'
            ? 'default'
            : member.role === 'manager'
            ? 'warning'
            : 'muted';
        const initials = member.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        const isMe = member.id === localUser?.id;

        return (
          <Card key={member.id} hover>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {member.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.avatar} alt={member.name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-accent-indigo text-xs font-bold text-white">
                    {initials}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium text-surface-200">
                    {member.name}
                    {isMe && (
                      <span className="ml-1.5 text-[10px] text-surface-500 font-normal">(you)</span>
                    )}
                  </h3>
                  <p className="text-xs text-surface-500">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* User status badge — green=active, yellow=suspended, red=inactive, gray=deleted */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    member.deletedAt
                      ? 'bg-surface-700/30 text-surface-500 border-surface-600/30'
                      : member.status === 'active'
                      ? 'bg-status-success-500/10 text-status-success-400 border-status-success-500/20'
                      : member.status === 'suspended'
                      ? 'bg-status-warning-500/10 text-status-warning-400 border-status-warning-500/20'
                      : 'bg-status-error-500/10 text-status-error-400 border-status-error-500/20'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    member.deletedAt
                      ? 'bg-surface-500'
                      : member.status === 'active'
                      ? 'bg-status-success-400'
                      : member.status === 'suspended'
                      ? 'bg-status-warning-400'
                      : 'bg-status-error-400'
                  }`} />
                  {member.deletedAt ? 'Deleted' : member.status === 'active' ? 'Active' : member.status === 'suspended' ? 'Suspended' : 'Inactive'}
                </span>
                {/* Role selector — disabled for deleted users */}
                {(localUser?.role === 'admin' || localUser?.role === 'superadmin') && !member.deletedAt ? (
                  <select
                    value={member.role}
                    disabled={roleUpdating === member.id}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    className="text-xs font-medium rounded-lg border border-surface-700 bg-surface-900 text-surface-200 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                  </select>
                ) : !member.deletedAt ? (
                  <Badge variant={roleColor as 'default' | 'warning' | 'muted'} dot>
                    {member.role}
                  </Badge>
                ) : (
                  <span className="text-[10px] text-surface-600 italic">{member.role}</span>
                )}
                {/* Status dropdown, soft-delete, or restore — admin only, cannot self-modify */}
                {(localUser?.role === 'admin' || localUser?.role === 'superadmin') && !isMe && (
                  <>
                    {member.deletedAt ? (
                      /* Restore button for deleted users */
                      <button type="button"
                        onClick={() => handleRestoreUser(member.id)}
                        disabled={restoringUser === member.id}
                        className="text-[10px] font-semibold px-2 py-1 rounded-md border text-status-success-400 border-status-success-500/20 hover:bg-status-success-500/10 transition-all disabled:opacity-50"
                      >
                        {restoringUser === member.id ? 'Restoring…' : 'Restore'}
                      </button>
                    ) : (
                      <>
                        {/* Status toggle dropdown — Activate / Suspend / Deactivate */}
                        <select
                          value={member.status}
                          disabled={statusUpdating === member.id}
                          onChange={(e) => handleStatusToggle(member.id, e.target.value)}
                          className={`text-[10px] font-semibold rounded-md border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 bg-surface-900 ${
                            member.status === 'active'
                              ? 'text-status-success-400 border-status-success-500/20'
                              : member.status === 'suspended'
                              ? 'text-status-warning-400 border-status-warning-500/20'
                              : 'text-status-error-400 border-status-error-500/20'
                          }`}
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="inactive">Inactive</option>
                        </select>
                        {/* Soft delete button */}
                        <button type="button"
                          onClick={() => handleSoftDelete(member.id)}
                          disabled={deletingUser === member.id}
                          className="text-[10px] font-semibold px-2 py-1 rounded-md border text-status-error-400 border-status-error-500/20 hover:bg-status-error-500/10 transition-all disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </>
                )}
                <span className="text-xs text-surface-500">
                  {member.deletedAt
                    ? `Removed ${new Date(member.deletedAt).toLocaleDateString()}`
                    : `Joined ${new Date(member.createdAt).toLocaleDateString()}`}
                </span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  )}

  {/* ── Invite User Modal ──────────────────────────── */}
  {showInviteModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600/20">
              <Mail className="h-4.5 w-4.5 text-primary-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-surface-100">Invite Team Member</h3>
              <p className="text-xs text-surface-500">They&apos;ll join your team when they sign in</p>
            </div>
          </div>
          <button type="button"
            onClick={() => setShowInviteModal(false)}
            className="rounded-lg p-1.5 text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 space-y-4">
          {inviteSuccess ? (
            <div className="flex flex-col items-center py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-success-600/20 mb-3">
                <Check className="h-6 w-6 text-status-success-400" />
              </div>
              <p className="text-sm font-medium text-surface-200">Invitation created!</p>
              <p className="text-xs text-surface-500 mt-1">They&apos;ll be added to your team on sign-in.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3.5 py-2.5 text-sm text-surface-200 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-colors"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inviteEmail.trim()) handleInviteUser();
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3.5 py-2.5 text-sm text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-colors"
                >
                  <option value="admin">Admin — Full access to all features</option>
                  <option value="manager">Manager — Operations & team oversight</option>
                  <option value="employee">Employee — Day-to-day operations</option>
                </select>
              </div>

              {inviteError && (
                <div className="flex items-center gap-2 rounded-lg bg-status-error-500/10 border border-status-error-500/20 px-3 py-2.5">
                  <X className="h-3.5 w-3.5 text-status-error-400 flex-shrink-0" />
                  <p className="text-xs text-status-error-400">{inviteError}</p>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-lg bg-surface-800/50 border border-surface-700/50 px-3 py-2.5">
                <Shield className="h-3.5 w-3.5 text-surface-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-surface-500">
                  The invited user will be automatically added to your team with the selected role when they sign in via Auth0 using this email.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!inviteSuccess && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-700 bg-surface-800/30">
            <Button variant="ghost" size="sm" onClick={() => setShowInviteModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              leftIcon={inviteSending ? undefined : <Mail className="h-3.5 w-3.5" />}
              onClick={handleInviteUser}
              disabled={!inviteEmail.trim() || inviteSending}
            >
              {inviteSending ? 'Sending…' : 'Send Invitation'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )}

  {/* ── Pending Invitations ──────────────────────── */}
  {!invitationsLoading && activePendingInvitations.length > 0 && (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Pending Invitations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {activePendingInvitations.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between p-3 rounded-lg border border-surface-700/30 hover:bg-surface-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-status-warning-500/10 border border-status-warning-500/20">
                  <Mail className="h-3.5 w-3.5 text-status-warning-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-200">{invite.email}</p>
                  <p className="text-xs text-surface-500">
                    Invited as <span className="capitalize font-medium text-surface-400">{invite.role}</span>
                    {' · '}
                    {new Date(invite.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRevokeInvite(invite.id)}
                disabled={revokingInvite === invite.id}
              >
                {revokingInvite === invite.id ? (
                  <span className="text-xs">Revoking…</span>
                ) : (
                  <Trash2 className="h-3.5 w-3.5 text-status-error-400" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )}

  {/* Role Descriptions */}
  <Card className="mt-6">
    <CardHeader>
      <CardTitle>Role Descriptions</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {[
          {
            role: 'Admin',
            description: 'Full access to all features including settings, user management, and financial data.',
            badge: 'default' as const },
          {
            role: 'Manager',
            description: 'Access to operations, reports, and team oversight. Cannot modify system settings.',
            badge: 'warning' as const },
          {
            role: 'Employee',
            description: 'Day-to-day operations: check-in/out packages, process shipments, handle customers.',
            badge: 'muted' as const },
        ].map((item) => (
          <div
            key={item.role}
            className="flex items-start gap-3 p-3 rounded-lg bg-surface-800/30 border border-surface-700/30"
          >
            <Badge variant={item.badge} dot>
              {item.role}
            </Badge>
            <p className="text-sm text-surface-400">{item.description}</p>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
    </>
  );
}
