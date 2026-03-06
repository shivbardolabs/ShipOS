'use client';

/**
 * Sign-Up Approval Queue — BAR-398
 *
 * STAFF review queue showing pending sign-up applications.
 * Superadmins can approve (→ trial) or reject (→ closed) each application.
 */

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Clock,
  AlertTriangle,
  Loader2,
  Inbox,
  CreditCard,
  Store,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface PendingApplication {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string;
  status: string;
  statusReason: string | null;
  affiliationType: string;
  franchiseType: string | null;
  storeCount: number;
  subscriptionTier: string;
  planId: string | null;
  createdAt: string;
  statusChangedAt: string | null;
  owner: {
    id: string;
    name: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    title: string | null;
  } | null;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Less than 1 hour ago';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

const tierLabel: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const affiliationLabel: Record<string, string> = {
  independent: 'Independent',
  franchise: 'Franchise',
  association: 'Association',
  other: 'Other',
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function ApprovalQueuePage() {
  const [applications, setApplications] = useState<PendingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Review modal
  const [reviewApp, setReviewApp] = useState<PendingApplication | null>(null);
  // Reject modal
  const [rejectApp, setRejectApp] = useState<PendingApplication | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/super-admin/approvals?status=pending_approval');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setApplications(data.queue);
    } catch (err) {
      console.error('[ApprovalQueue] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  /* ── Actions ──────────────────────────────────────────────────────────── */

  const handleApprove = async (tenantId: string) => {
    setActionLoading(tenantId);
    try {
      const res = await fetch('/api/super-admin/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, action: 'approve' }),
      });
      if (!res.ok) throw new Error('Approve failed');
      // Remove from queue
      setApplications((prev) => prev.filter((a) => a.id !== tenantId));
      setReviewApp(null);
    } catch (err) {
      console.error('[ApprovalQueue] Approve error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectApp) return;
    setActionLoading(rejectApp.id);
    try {
      const res = await fetch('/api/super-admin/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: rejectApp.id,
          action: 'reject',
          reason: rejectReason || undefined,
        }),
      });
      if (!res.ok) throw new Error('Reject failed');
      setApplications((prev) => prev.filter((a) => a.id !== rejectApp.id));
      setRejectApp(null);
      setRejectReason('');
    } catch (err) {
      console.error('[ApprovalQueue] Reject error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Render ───────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sign-Up Approval Queue"
        description="Review and approve pending client registrations"
        icon={<ClipboardCheck className="h-6 w-6" />}
      />

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-warning-500/10">
              <Clock className="h-5 w-5 text-status-warning-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-100">{applications.length}</p>
              <p className="text-xs text-surface-500">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-success-500/10">
              <CheckCircle2 className="h-5 w-5 text-status-success-400" />
            </div>
            <div>
              <p className="text-xs text-surface-500 mt-1">Approve to start their trial period</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-error-500/10">
              <XCircle className="h-5 w-5 text-status-error-400" />
            </div>
            <div>
              <p className="text-xs text-surface-500 mt-1">Reject with a reason for the applicant</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-primary-500 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && applications.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Inbox className="h-12 w-12 text-surface-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-surface-300 mb-1">No pending applications</h3>
            <p className="text-sm text-surface-500">All sign-up requests have been reviewed.</p>
          </CardContent>
        </Card>
      )}

      {/* Application cards */}
      {!loading && applications.length > 0 && (
        <div className="space-y-3">
          {applications.map((app) => (
            <Card key={app.id} className="hover:border-surface-700 transition-colors">
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Business info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-primary-400 shrink-0" />
                      <h3 className="text-sm font-semibold text-surface-100 truncate">{app.name}</h3>
                      <Badge variant="warning" dot>Pending Approval</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-surface-400">
                      {app.owner && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">{app.owner.name}</span>
                          {app.owner.title && (
                            <span className="text-surface-600">({app.owner.title})</span>
                          )}
                        </div>
                      )}
                      {app.owner?.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{app.owner.email}</span>
                        </div>
                      )}
                      {app.address && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{app.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{timeAgo(app.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="info" dot={false}>
                        {tierLabel[app.subscriptionTier] ?? app.subscriptionTier}
                      </Badge>
                      <Badge variant="muted" dot={false}>
                        {affiliationLabel[app.affiliationType] ?? app.affiliationType}
                        {app.franchiseType ? ` — ${app.franchiseType}` : ''}
                      </Badge>
                      {app.storeCount > 1 && (
                        <Badge variant="muted" dot={false}>
                          <Store className="h-3 w-3 mr-1 inline" />
                          {app.storeCount} stores
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setReviewApp(app)}
                    >
                      Review
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApprove(app.id)}
                      disabled={actionLoading === app.id}
                    >
                      {actionLoading === app.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => { setRejectApp(app); setRejectReason(''); }}
                      disabled={actionLoading === app.id}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Review Detail Modal ─────────────────────────────────────────── */}
      {reviewApp && (
        <Modal
          isOpen
          onClose={() => setReviewApp(null)}
          title="Review Application"
        >
          <div className="space-y-4">
            {/* Business details */}
            <div>
              <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
                Business Details
              </h4>
              <div className="rounded-lg border border-surface-800 bg-surface-900/50 p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-surface-400">Business Name</span>
                  <span className="text-xs text-surface-200 font-medium">{reviewApp.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-surface-400">Type</span>
                  <span className="text-xs text-surface-200">
                    {affiliationLabel[reviewApp.affiliationType] ?? reviewApp.affiliationType}
                    {reviewApp.franchiseType ? ` — ${reviewApp.franchiseType}` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-surface-400">Store Count</span>
                  <span className="text-xs text-surface-200">{reviewApp.storeCount}</span>
                </div>
                {reviewApp.address && (
                  <div className="flex justify-between">
                    <span className="text-xs text-surface-400">Address</span>
                    <span className="text-xs text-surface-200 text-right max-w-[200px]">{reviewApp.address}</span>
                  </div>
                )}
                {reviewApp.email && (
                  <div className="flex justify-between">
                    <span className="text-xs text-surface-400">Store Email</span>
                    <span className="text-xs text-surface-200">{reviewApp.email}</span>
                  </div>
                )}
                {reviewApp.phone && (
                  <div className="flex justify-between">
                    <span className="text-xs text-surface-400">Store Phone</span>
                    <span className="text-xs text-surface-200">{reviewApp.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Owner details */}
            {reviewApp.owner && (
              <div>
                <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
                  Owner / Contact
                </h4>
                <div className="rounded-lg border border-surface-800 bg-surface-900/50 p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-surface-400">Name</span>
                    <span className="text-xs text-surface-200 font-medium">{reviewApp.owner.name}</span>
                  </div>
                  {reviewApp.owner.title && (
                    <div className="flex justify-between">
                      <span className="text-xs text-surface-400">Title</span>
                      <span className="text-xs text-surface-200">{reviewApp.owner.title}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-xs text-surface-400">Email</span>
                    <span className="text-xs text-surface-200">{reviewApp.owner.email}</span>
                  </div>
                  {reviewApp.owner.phone && (
                    <div className="flex justify-between">
                      <span className="text-xs text-surface-400">Phone</span>
                      <span className="text-xs text-surface-200">{reviewApp.owner.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Plan & timeline */}
            <div>
              <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
                Plan & Timeline
              </h4>
              <div className="rounded-lg border border-surface-800 bg-surface-900/50 p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-surface-400">Selected Plan</span>
                  <Badge variant="info" dot={false}>
                    {tierLabel[reviewApp.subscriptionTier] ?? reviewApp.subscriptionTier}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-surface-400">Applied</span>
                  <span className="text-xs text-surface-200">{formatDate(reviewApp.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-surface-400">Waiting</span>
                  <span className="text-xs text-status-warning-400">{timeAgo(reviewApp.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => handleApprove(reviewApp.id)}
                disabled={actionLoading === reviewApp.id}
              >
                {actionLoading === reviewApp.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Approve &amp; Start Trial
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setReviewApp(null);
                  setRejectApp(reviewApp);
                  setRejectReason('');
                }}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reject Modal ────────────────────────────────────────────────── */}
      {rejectApp && (
        <Modal
          isOpen
          onClose={() => setRejectApp(null)}
          title="Reject Application"
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-status-error-500/20 bg-status-error-500/5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-status-error-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-surface-200 font-medium">
                    Reject {rejectApp.name}&apos;s application?
                  </p>
                  <p className="text-xs text-surface-400 mt-1">
                    This will close the account and notify the applicant. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="reject-reason" className="block text-xs font-medium text-surface-400 mb-1.5">
                Reason (optional — sent to applicant)
              </label>
              <textarea
                id="reject-reason"
                className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 placeholder:text-surface-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
                rows={3}
                placeholder="e.g., Unable to verify business information..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setRejectApp(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleReject}
                disabled={actionLoading === rejectApp.id}
              >
                {actionLoading === rejectApp.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Reject Application
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
