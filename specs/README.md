# ShipOS Test Specs

Test plans for Playwright Test Agents. The 🎭 Planner generates and refines
these specs; the 🎭 Generator turns them into executable `.spec.ts` files.

## Coverage Goals

### Public Pages (no auth required)
- Landing page, features, pricing, support
- Login/signup redirect behavior
- Terms of Service, Privacy Policy
- Auth error page

### Dashboard (authenticated)
- Dashboard loads with stats cards, KPIs, AI briefing
- Sidebar navigation to all sections
- Mobile responsive layout + sidebar toggle
- ⌘K search across packages and customers

### Package Management
- Package list with filtering and sorting
- Check-in flow (smart intake, manual entry, camera capture)
- Check-out flow (customer lookup, signature, receipt)
- Bulk check-out
- Package status transitions

### Customer Management
- Customer list with search and pagination
- New customer setup wizard (PMB assignment, ID verification)
- Customer profile (packages, mail, shipments tabs)
- 1583 form approval workflow

### Mail Management
- Mail list with filtering
- Mail scanning and forwarding

### Billing & Settings
- Billing plans and subscription
- Printer settings
- Branding/store settings
- Notification preferences

### Admin (superadmin role)
- User management
- Feature flags
- Tenant administration
- Login session tracking
