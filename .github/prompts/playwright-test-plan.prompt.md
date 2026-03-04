---
agent: playwright-test-planner
description: Create test plan for ShipOS
---

Create a comprehensive test plan for ShipOS — a package receiving and shipping management platform for retail shipping stores (USPS CMRA-compliant).

Key areas to cover:
1. **Public pages** — Landing, features, pricing, support, terms, privacy
2. **Authentication** — Login redirect, Auth0 flow, error handling, session persistence
3. **Dashboard** — Stats cards, KPI metrics, AI briefing, sidebar navigation, ⌘K search
4. **Package Check-in** — Smart intake (camera/AI), manual entry, carrier detection, label printing
5. **Package Check-out** — Customer lookup, signature capture, receipt generation, delegate pickup
6. **Customer Management** — List/search, new customer wizard, PMB assignment, 1583 form approval
7. **Mail Management** — Mail list, scanning, forwarding
8. **Billing** — Plans, subscriptions, pricing dashboard
9. **Settings** — Branding, printer, notifications
10. **Admin** — User management, feature flags, tenant admin (superadmin only)
11. **Mobile responsive** — All flows at 375px viewport

- Seed file: `tests/e2e/seed.spec.ts`
- Test plan: `specs/shipos-coverage.plan.md`
