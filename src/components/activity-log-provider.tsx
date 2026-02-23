'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useTenant } from '@/components/tenant-provider';
import {
  logAction as _logAction,
  readLog,
  getLastActionForEntity,
  getLastActionByVerb,
  getRecentActions as _getRecentActions,
  getActionsByCategory as _getActionsByCategory,
  getActionsByUser as _getActionsByUser,
  type LogActionParams,
  type ActivityLogEntry,
  type ActionVerb,
  type ActionCategory,
} from '@/lib/activity-log';

/* -------------------------------------------------------------------------- */
/*  Seed data — pre-populate log with realistic history                       */
/* -------------------------------------------------------------------------- */
const SEED_KEY = 'shipos_activity_log_seeded_v2';

interface SeedEntry {
  action: ActionVerb;
  entityType: string;
  entityId: string;
  entityLabel: string;
  description: string;
  userName: string;
  userRole: string;
  minutesAgo: number;
}

const SEED_DATA: SeedEntry[] = [
  { action: 'package.check_in', entityType: 'package', entityId: 'pkg_001', entityLabel: 'TBA000000017', description: 'Checked in Amazon package for PMB-0003', userName: 'Sarah Chen', userRole: 'admin', minutesAgo: 15 },
  { action: 'notification.send', entityType: 'notification', entityId: 'notif_001', entityLabel: 'Linda Nakamura', description: 'Sent arrival notification to Linda Nakamura (PMB-0002)', userName: 'Sarah Chen', userRole: 'admin', minutesAgo: 30 },
  { action: 'package.release', entityType: 'package', entityId: 'pkg_010', entityLabel: 'PKG pkg_010', description: 'Released 2 packages to David Kim (PMB-0005)', userName: 'Mike Torres', userRole: 'employee', minutesAgo: 55 },
  { action: 'shipment.create', entityType: 'shipment', entityId: 'ship_001', entityLabel: 'FedEx Express', description: 'Created FedEx Express shipment for PMB-0010', userName: 'Sarah Chen', userRole: 'admin', minutesAgo: 80 },
  { action: 'mail.scan', entityType: 'mail', entityId: 'mail_001', entityLabel: 'Letter', description: 'Scanned and filed mail for PMB-0014', userName: 'Alex Rivera', userRole: 'employee', minutesAgo: 110 },
  { action: 'customer.create', entityType: 'customer', entityId: 'cust_030', entityLabel: 'PMB-0030', description: 'Registered new customer Rachel Green (PMB-0030)', userName: 'Sarah Chen', userRole: 'admin', minutesAgo: 140 },
  { action: 'package.check_in', entityType: 'package', entityId: 'pkg_004', entityLabel: '1Z999AA100000041', description: 'Checked in oversized UPS package for PMB-0001', userName: 'Mike Torres', userRole: 'employee', minutesAgo: 170 },
  { action: 'customer.update', entityType: 'customer', entityId: 'cust_005', entityLabel: 'PMB-0005', description: 'Updated ID expiration for David Kim (PMB-0005)', userName: 'Sarah Chen', userRole: 'admin', minutesAgo: 200 },
  { action: 'shipment.ship', entityType: 'shipment', entityId: 'ship_002', entityLabel: 'DHL International', description: 'DHL International shipment shipped for PMB-0019', userName: 'Alex Rivera', userRole: 'employee', minutesAgo: 240 },
  { action: 'notification.send', entityType: 'notification', entityId: 'notif_002', entityLabel: 'Patricia Williams', description: 'Sent renewal reminder to Patricia Williams (PMB-0006)', userName: 'Sarah Chen', userRole: 'admin', minutesAgo: 300 },
  { action: 'mail.forward', entityType: 'mail', entityId: 'mail_002', entityLabel: 'Legal document', description: 'Forwarded legal mail to customer PMB-0026', userName: 'Mike Torres', userRole: 'employee', minutesAgo: 350 },
  { action: 'settings.update', entityType: 'settings', entityId: 'general', entityLabel: 'Store Info', description: 'Updated store business hours', userName: 'Sarah Chen', userRole: 'admin', minutesAgo: 420 },
  { action: 'package.check_in', entityType: 'package', entityId: 'pkg_015', entityLabel: '74890000001511', description: 'Checked in FedEx package for PMB-0012', userName: 'Alex Rivera', userRole: 'employee', minutesAgo: 460 },
  { action: 'invoice.create', entityType: 'invoice', entityId: 'inv_001', entityLabel: 'INV-2026-042', description: 'Created invoice for PMB-0010 storage fees', userName: 'Sarah Chen', userRole: 'admin', minutesAgo: 500 },
  { action: 'compliance.form1583_update', entityType: 'customer', entityId: 'cust_017', entityLabel: 'PMB-0017', description: 'Updated Form 1583 status to submitted for PMB-0017', userName: 'Sarah Chen', userRole: 'admin', minutesAgo: 560 },
  { action: 'user.invite', entityType: 'user', entityId: 'invite_001', entityLabel: 'jsmith@store.com', description: 'Invited new employee jsmith@store.com', userName: 'Sarah Chen', userRole: 'admin', minutesAgo: 720 },
  { action: 'package.release', entityType: 'package', entityId: 'pkg_020', entityLabel: 'PKG pkg_020', description: 'Released package to Elizabeth Martinez (PMB-0010)', userName: 'Alex Rivera', userRole: 'employee', minutesAgo: 780 },
  { action: 'settings.carrier_rate_update', entityType: 'settings', entityId: 'carrier_rates', entityLabel: 'UPS Rates', description: 'Updated UPS Ground retail rate to $13.49', userName: 'Sarah Chen', userRole: 'admin', minutesAgo: 900 },
  { action: 'loyalty.configure', entityType: 'loyalty', entityId: 'program_001', entityLabel: 'ShipOS Rewards', description: 'Updated points-per-dollar from 1 to 1.5', userName: 'Sarah Chen', userRole: 'admin', minutesAgo: 1080 },
  { action: 'customer.update', entityType: 'customer', entityId: 'cust_003', entityLabel: 'PMB-0003', description: 'Updated notification preferences for Robert Singh', userName: 'Mike Torres', userRole: 'employee', minutesAgo: 1200 },
];

function seedActivityLog() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(SEED_KEY)) return;

  const users: Record<string, { id: string; avatar?: string }> = {
    'Sarah Chen': { id: 'usr_001' },
    'Mike Torres': { id: 'usr_002' },
    'Alex Rivera': { id: 'usr_003' },
  };

  const now = Date.now();
  const entries: ActivityLogEntry[] = SEED_DATA.map((s, i) => ({
    id: `seed_${String(i + 1).padStart(3, '0')}`,
    action: s.action,
    category: s.action.split('.')[0] as ActionCategory,
    entityType: s.entityType,
    entityId: s.entityId,
    entityLabel: s.entityLabel,
    description: s.description,
    userId: users[s.userName]?.id ?? 'usr_001',
    userName: s.userName,
    userRole: s.userRole,
    userAvatar: users[s.userName]?.avatar,
    timestamp: new Date(now - s.minutesAgo * 60_000).toISOString(),
  }));

  localStorage.setItem('shipos_activity_log', JSON.stringify(entries));
  localStorage.setItem(SEED_KEY, 'true');
}

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

interface ActivityLogContextValue {
  /** Log a new action — auto-fills user info from the current session */
  log: (params: Omit<LogActionParams, 'userId' | 'userName' | 'userRole' | 'userAvatar'>) => ActivityLogEntry | null;
  /** Get the most recent action for a given entity */
  lastActionFor: (entityType: string, entityId: string) => ActivityLogEntry | null;
  /** Get the most recent action of a given verb */
  lastActionByVerb: (action: ActionVerb) => ActivityLogEntry | null;
  /** Get recent actions */
  recentActions: (limit?: number) => ActivityLogEntry[];
  /** Get actions by category */
  actionsByCategory: (category: ActionCategory, limit?: number) => ActivityLogEntry[];
  /** Get actions by user */
  actionsByUser: (userId: string, limit?: number) => ActivityLogEntry[];
  /** All log entries (reactive — updated after each log call) */
  entries: ActivityLogEntry[];
  /** Force a re-read from localStorage */
  refresh: () => void;
}

const ActivityLogContext = createContext<ActivityLogContextValue>({
  log: () => null,
  lastActionFor: () => null,
  lastActionByVerb: () => null,
  recentActions: () => [],
  actionsByCategory: () => [],
  actionsByUser: () => [],
  entries: [],
  refresh: () => {},
});

/* -------------------------------------------------------------------------- */
/*  Provider                                                                  */
/* -------------------------------------------------------------------------- */

export function ActivityLogProvider({ children }: { children: ReactNode }) {
  const { localUser } = useTenant();
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);

  // Seed on first mount + load existing entries
  useEffect(() => {
    seedActivityLog();
    setEntries(readLog());
  }, []);

  const refresh = useCallback(() => {
    setEntries(readLog());
  }, []);

  const log = useCallback(
    (params: Omit<LogActionParams, 'userId' | 'userName' | 'userRole' | 'userAvatar'>) => {
      if (!localUser) return null;
      const entry = _logAction({
        ...params,
        userId: localUser.id,
        userName: localUser.name,
        userRole: localUser.role,
        userAvatar: localUser.avatar ?? undefined,
      });
      // Update reactive state
      setEntries(readLog());
      return entry;
    },
    [localUser]
  );

  const lastActionFor = useCallback(
    (entityType: string, entityId: string) => getLastActionForEntity(entityType, entityId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries] // re-evaluate when entries change
  );

  const lastActionByVerb = useCallback(
    (action: ActionVerb) => getLastActionByVerb(action),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries]
  );

  const recentActions = useCallback(
    (limit?: number) => _getRecentActions(limit),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries]
  );

  const actionsByCategory = useCallback(
    (category: ActionCategory, limit?: number) => _getActionsByCategory(category, limit),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries]
  );

  const actionsByUser = useCallback(
    (userId: string, limit?: number) => _getActionsByUser(userId, limit),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries]
  );

  return (
    <ActivityLogContext.Provider
      value={{
        log,
        lastActionFor,
        lastActionByVerb,
        recentActions,
        actionsByCategory,
        actionsByUser,
        entries,
        refresh,
      }}
    >
      {children}
    </ActivityLogContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

export function useActivityLog() {
  return useContext(ActivityLogContext);
}
