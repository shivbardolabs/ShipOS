'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import {
  getNotificationTargetUrl,
  getNotificationStatusLabel,
} from '@/lib/utils';
import {
  Bell,
  Package,
  CalendarClock,
  MailOpen,
  AlertTriangle,
  Clock,
  Truck,
  UserPlus,
  ExternalLink,
  CheckCheck,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Icon mapping                                                              */
/* -------------------------------------------------------------------------- */
const notifTypeIcon: Record<string, React.ReactNode> = {
  package_arrival: <Package className="h-4 w-4 text-blue-400" />,
  package_reminder: <CalendarClock className="h-4 w-4 text-amber-400" />,
  mail_received: <MailOpen className="h-4 w-4 text-indigo-400" />,
  id_expiring: <AlertTriangle className="h-4 w-4 text-red-400" />,
  renewal_reminder: <Clock className="h-4 w-4 text-yellow-400" />,
  shipment_update: <Truck className="h-4 w-4 text-emerald-400" />,
  welcome: <UserPlus className="h-4 w-4 text-primary-400" />,
};

/* -------------------------------------------------------------------------- */
/*  Relative time helper                                                      */
/* -------------------------------------------------------------------------- */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* -------------------------------------------------------------------------- */
/*  NotificationPanel                                                         */
/* -------------------------------------------------------------------------- */
export function NotificationPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/notifications?limit=20')
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications || []))
      .catch(() => {});
  }, []);

  // Show recent 8 notifications, sorted by createdAt (newest first)
  const recent = useMemo(() => {
    return [...notifications]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return recent.filter((n) => !readIds.has(n.id)).length;
  }, [recent, readIds]);

  // Close on click-outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const markAllRead = () => {
    setReadIds(new Set(recent.map((n) => n.id)));
  };

  /** Navigate to the correct page when a notification is clicked. */
  const handleNotifClick = (notif: (typeof recent)[0]) => {
    setReadIds((prev) => new Set([...prev, notif.id]));

    // Always navigate in-app to the related customer / entity page.
    // External tracking links are available via the notifications detail view.
    const target = getNotificationTargetUrl(notif.type, {
      customerId: notif.customerId,
      linkedEntityId: notif.linkedEntityId,
    });
    setOpen(false);
    router.push(target);
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/60 transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] rounded-xl border border-surface-700 bg-surface-900 shadow-2xl shadow-black/30 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-surface-200">Notifications</h3>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500/20 px-1.5 text-[11px] font-semibold text-primary-400">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11px] text-surface-500 hover:text-primary-400 transition-colors"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto">
            {recent.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 text-surface-700 mx-auto mb-2" />
                <p className="text-sm text-surface-500">No notifications yet</p>
              </div>
            ) : (
              recent.map((notif) => {
                const isRead = readIds.has(notif.id);
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-800/60 border-b border-surface-800/50 last:border-0 ${
                      !isRead ? 'bg-primary-500/[0.03]' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-800 mt-0.5">
                      {notifTypeIcon[notif.type] || <Bell className="h-4 w-4 text-surface-400" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-[13px] leading-snug ${!isRead ? 'text-surface-200 font-medium' : 'text-surface-400'}`}>
                          {notif.subject || notif.type.replace(/_/g, ' ')}
                        </p>
                        {!isRead && (
                          <span className="flex-shrink-0 mt-1.5 h-2 w-2 rounded-full bg-primary-500" />
                        )}
                      </div>

                      {/* Customer name + PMB number */}
                      <div className="flex items-center gap-2 mt-1">
                        {notif.customer && (
                          <span className="text-[11px] text-surface-500 truncate">
                            {notif.customer.firstName} {notif.customer.lastName}
                          </span>
                        )}
                        {notif.customer?.pmbNumber && (
                          <>
                            <span className="text-[10px] text-surface-600">•</span>
                            <span className="text-[11px] text-surface-500 font-mono flex-shrink-0">
                              {notif.customer.pmbNumber}
                            </span>
                          </>
                        )}
                        <span className="text-[10px] text-surface-600">•</span>
                        <span className="text-[11px] text-surface-600 flex-shrink-0">
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>

                      {/* Tracking number for shipment notifications */}
                      {notif.type === 'shipment_update' && notif.carrier && notif.trackingNumber && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Truck className="h-3 w-3 text-surface-500" />
                          <span className="text-[10px] text-surface-500 uppercase">{notif.carrier}</span>
                          <span className="text-[10px] text-primary-400 font-mono truncate">
                            {notif.trackingNumber}
                          </span>
                          <ExternalLink className="h-2.5 w-2.5 text-primary-400 flex-shrink-0" />
                        </div>
                      )}

                      <div className="mt-1">
                        <Badge status={notif.status} className="text-[10px] !py-0 !px-1.5">
                          {getNotificationStatusLabel(notif.status)}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer — link to full page */}
          <div className="border-t border-surface-800 px-4 py-2.5">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 text-[13px] font-medium text-primary-400 hover:text-primary-300 transition-colors"
            >
              View All Notifications
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
