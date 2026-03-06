## Summary

Implements BAR-399 — Tenant Status Field & Lifecycle States. Adds the full tenant lifecycle state machine with enforcement at both the UI and API layers.

## Changes

### Data Model
- **Prisma schema**: Added `statusChangedAt`, `statusChangedBy`, `statusReason` fields to Tenant
- **Status values**: Expanded from `active|paused|disabled|trial` to `pending_approval|active|trial|paused|suspended|disabled|closed`
- **Migration**: Renames existing `pending` to `pending_approval`, adds index on `status`

### Status Definitions

| Status | Meaning |
|--------|---------|
| `pending_approval` | Sign-up submitted, awaiting activation |
| `active` | Fully operational, billing current |
| `trial` | In free trial period |
| `paused` | Temporarily suspended (voluntary or payment) |
| `suspended` | STAFF-initiated hold (compliance, investigation) |
| `disabled` | Payment failed, grace period expired |
| `closed` | Account permanently closed |

### UI Layer — TenantStatusGate
- Full-screen blocking pages for each non-operational status
- Contextual messages: "Under Review" for pending, "Suspended" with contact info, "Closed" permanent, etc.
- Superadmin bypasses all gates

### API Layer — withApiHandler
- Tenant status check integrated into the shared API handler wrapper
- Non-operational tenants receive 403 with error "Account not active"
- Superadmins bypass; routes can opt out with `skipTenantCheck: true`
- Billing cron updated to recognize `trial` as operational

### Other
- Signup route: creates tenants with `pending_approval` status + `statusChangedAt`
- Super admin dashboard: added `pendingApproval` and `trialClients` counts
- Clients page: updated badge variants and labels for all new statuses
- Centralized `src/lib/tenant-status.ts` with constants, metadata, and helpers

## Testing
- New signup → tenant gets `pending_approval` status
- Dashboard access blocked for pending/paused/suspended/disabled/closed tenants
- API routes return 403 for non-active tenants (except superadmin)
- Super admin dashboard shows pending approval count
