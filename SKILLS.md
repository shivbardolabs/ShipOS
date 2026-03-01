# ShipOS Engineering Skills & Workflow Guide

> The practical, day-to-day guide for building and maintaining ShipOS.
> This document covers how to write code, review code, ship code, and operate ShipOS.

---

## Table of Contents

1. [Development Setup](#1-development-setup)
2. [Code Style & Standards](#2-code-style--standards)
3. [TypeScript Best Practices](#3-typescript-best-practices)
4. [React & Component Patterns](#4-react--component-patterns)
5. [API Development](#5-api-development)
6. [Database & Prisma Patterns](#6-database--prisma-patterns)
7. [Testing Strategy](#7-testing-strategy)
8. [Security Practices](#8-security-practices)
9. [Git & PR Workflow](#9-git--pr-workflow)
10. [Performance Optimization](#10-performance-optimization)
11. [Debugging & Troubleshooting](#11-debugging--troubleshooting)
12. [Monitoring & Operations](#12-monitoring--operations)

---

## 1. Development Setup

### Prerequisites
- Node.js 20+ / Bun
- PostgreSQL (or Neon connection string)
- Auth0 account & application configured
- Stripe account (test mode)

### Getting Started
```bash
git clone https://github.com/shivbardolabs/ShipOS.git
cd ShipOS
npm install            # Install dependencies
cp .env.example .env   # Configure environment variables
npx prisma generate    # Generate Prisma client
npx prisma db push     # Sync schema to database
npm run dev            # Start dev server at localhost:3000
```

### Required Environment Variables
See `.env.example` for the full list. At minimum for local dev:
```
AUTH0_SECRET, AUTH0_BASE_URL, AUTH0_ISSUER_BASE_URL, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET
POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING
ENCRYPTION_KEY (generate: openssl rand -hex 32)
```

---

## 2. Code Style & Standards

### File Naming
| Type          | Convention            | Example                      |
|---------------|-----------------------|------------------------------|
| Components    | kebab-case.tsx        | `customer-avatar.tsx`        |
| API routes    | route.ts (Next.js)    | `src/app/api/customers/route.ts` |
| Lib modules   | kebab-case.ts         | `charge-event-service.ts`    |
| Hooks         | use-kebab-case.ts     | `use-permission.ts`          |
| Types         | PascalCase (exported) | `export type UserRole = ...` |
| Constants     | UPPER_SNAKE_CASE      | `const MAX_PAGE_SIZE = 100`  |

### File Size Limits
- **Components:** Max 300 lines. Split into sub-components if larger.
- **API routes:** Max 200 lines per handler. Extract business logic to `lib/`.
- **Lib modules:** Max 400 lines. Split by subdomain if larger.

### Import Order
```typescript
// 1. Framework / Next.js
import { NextRequest, NextResponse } from 'next/server';

// 2. External libraries
import { z } from 'zod';

// 3. Internal absolute imports (@/)
import { getOrProvisionUser } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import prisma from '@/lib/prisma';

// 4. Relative imports
import { formatDate } from './utils';

// 5. Types (type-only imports)
import type { UserRole } from '@/lib/permissions';
```

### Comments & Documentation
```typescript
/**
 * Calculate storage fees for a package.
 *
 * Free days are tenant-configurable (default: 30).
 * After free period, charges tenant's storageRate per day.
 * Weekends are counted unless storageCountWeekends is false.
 *
 * @param pkg - The package to calculate fees for
 * @param tenant - The tenant's configuration
 * @returns The total storage fee in dollars
 */
export function calculateStorageFee(pkg: Package, tenant: Tenant): number {
  // ...
}
```

---

## 3. TypeScript Best Practices

### ✅ DO

```typescript
// Explicit return types on all exported functions
export function getUser(id: string): Promise<User | null> { ... }

// Use discriminated unions for state
type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

// Use `satisfies` for type-safe config objects
const config = {
  timeout: 5000,
  retries: 3,
} satisfies RetryConfig;

// Prefer `unknown` over `any` with type narrowing
function processInput(input: unknown): string {
  if (typeof input === 'string') return input;
  if (typeof input === 'number') return String(input);
  throw new Error('Unsupported input type');
}

// Use Zod for runtime validation (infer types from schemas)
const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'employee']),
});
type UserInput = z.infer<typeof UserSchema>;
```

### ❌ DON'T

```typescript
// Never use `any`
const data: any = await response.json();  // ❌

// Never ignore TypeScript errors
// @ts-ignore  // ❌
// @ts-expect-error  // ❌ unless truly unavoidable with explanation

// Never use non-null assertions without justification
const name = user!.name;  // ❌ — check for null instead

// Never use type assertions to lie to the compiler
const user = data as User;  // ❌ — validate instead
```

### Strict Configuration
```json
// tsconfig.json — these must stay enabled
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,  // arrays/objects may be undefined
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

## 4. React & Component Patterns

### Server vs. Client Components

```
Server Components (default)           Client Components ('use client')
─────────────────────────             ──────────────────────────────
✓ Data fetching                       ✓ Event handlers (onClick, etc.)
✓ Database access                     ✓ useState, useEffect
✓ Sensitive logic / secrets           ✓ Browser APIs (localStorage, etc.)
✓ Heavy dependencies (kept off bundle)✓ Interactive forms
```

### Component Template
```tsx
'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface CustomerCardProps {
  customer: {
    id: string;
    name: string;
    email: string;
    status: 'active' | 'inactive';
  };
  onEdit?: (id: string) => void;
}

/**
 * Displays a customer summary card with edit action.
 */
export function CustomerCard({ customer, onEdit }: CustomerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleEdit = useCallback(() => {
    onEdit?.(customer.id);
  }, [customer.id, onEdit]);

  return (
    <div className="rounded-lg border border-surface-700 p-4">
      <h3 className="text-lg font-semibold">{customer.name}</h3>
      <p className="text-sm text-surface-400">{customer.email}</p>
      {onEdit && (
        <Button variant="ghost" size="sm" onClick={handleEdit}>
          Edit
        </Button>
      )}
    </div>
  );
}
```

### Key Rules
1. **Props interface above the component.** Always export it if the component is exported.
2. **No inline styles.** Use Tailwind classes exclusively.
3. **Memoize callbacks.** Use `useCallback` for handlers passed as props.
4. **Loading states.** Every async operation shows a loading indicator.
5. **Error states.** Every component that fetches data handles errors gracefully.
6. **Empty states.** Show helpful messages when lists are empty, not blank space.

### Provider Pattern
```
RootLayout
  └── Auth0Provider
       └── TenantProvider        (user + tenant context)
            └── BrandingProvider  (white-label theming)
                 └── FeatureFlagProvider  (DB-backed flags)
                      └── PostHogProvider     (analytics)
                           └── {children}
```

---

## 5. API Development

### Creating a New API Route

1. **Create the file:** `src/app/api/{domain}/route.ts`
2. **Define Zod schemas** for all inputs (body, query, params)
3. **Implement handler** following the Auth → Permission → Validate → Execute pattern
4. **Add tests** in `tests/api/{domain}.test.ts`
5. **Document** the endpoint in this file or with JSDoc

### Input Validation Patterns

```typescript
// Query parameter validation
const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(200).optional(),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

function parseQueryParams(searchParams: URLSearchParams) {
  const raw = Object.fromEntries(searchParams.entries());
  return ListQuerySchema.safeParse(raw);
}

// Request body validation
const CreateCustomerSchema = z.object({
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  email: z.string().email().max(254).trim().toLowerCase(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  pmbNumber: z.string().max(20).optional(),
});
```

### Date Serialization
All dates returned from API routes must be ISO 8601 strings:
```typescript
const serialized = {
  ...record,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
};
```

---

## 6. Database & Prisma Patterns

### ✅ Safe Query Patterns

```typescript
// Parameterized queries when raw SQL is needed
const results = await prisma.$queryRaw`
  SELECT * FROM action_prices
  WHERE tenant_id = ${tenantId}
  AND is_active = true
  ORDER BY sort_order ASC
`;

// Use Prisma's query builder (preferred)
const customers = await prisma.customer.findMany({
  where: { tenantId, status: 'active' },
  select: { id: true, firstName: true, lastName: true, email: true },
  orderBy: { createdAt: 'desc' },
  take: limit,
  skip: offset,
});
```

### ❌ Dangerous Patterns (BANNED)

```typescript
// NEVER use $queryRawUnsafe or $executeRawUnsafe with user input
// These are SQL injection vectors
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE id = '${userId}'`);  // ❌

// ONLY acceptable use: DDL statements with no user input (table creation, etc.)
```

### Transaction Pattern
```typescript
const [user, session] = await prisma.$transaction([
  prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  }),
  prisma.loginSession.create({
    data: { userId },
  }),
]);
```

### Soft Delete Pattern
```typescript
// Delete = set deletedAt
await prisma.customer.update({
  where: { id: customerId },
  data: { deletedAt: new Date() },
});

// Always exclude deleted in queries
const customers = await prisma.customer.findMany({
  where: { tenantId, deletedAt: null },
});
```

---

## 7. Testing Strategy

### Test Pyramid
```
          E2E (Playwright)
         ╱ Critical paths only \
        ╱                       \
       ╱   API Integration       \
      ╱   (Jest + fetch)          \
     ╱                             \
    ╱      Unit Tests               \
   ╱      (Jest, pure functions)     \
  ╱─────────────────────────────────╱
```

### Running Tests
```bash
npm test              # Unit + API tests (Jest)
npm run test:api      # API integration tests only
npm run test:e2e      # E2E tests (Playwright, requires running server)
npm run test:load     # Load tests (k6)
```

### What to Test

| Category          | What to Test                                  | Tool       |
|-------------------|-----------------------------------------------|------------|
| Business logic    | Calculations, transforms, validators          | Jest       |
| API routes        | Auth, permissions, validation, CRUD           | Jest       |
| UI interactions   | Login, package check-in, customer create      | Playwright |
| Performance       | API response times under load                 | k6         |

### API Test Template
```typescript
describe('POST /api/customers', () => {
  it('creates a customer with valid data', async () => {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.firstName).toBe('Test');
  });

  it('returns 400 for invalid email', async () => {
    const res = await fetch('/api/customers', {
      method: 'POST',
      body: JSON.stringify({ firstName: 'Test', email: 'not-an-email' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    // ... test without session cookie
  });

  it('returns 403 for unauthorized role', async () => {
    // ... test with employee role trying to delete
  });
});
```

---

## 8. Security Practices

### Input Validation Checklist
- [ ] All request bodies validated with Zod
- [ ] All query params validated with Zod (coerce numbers, validate enums)
- [ ] All path params validated (UUID format, etc.)
- [ ] String inputs trimmed and length-limited
- [ ] Email inputs lowercased and format-validated
- [ ] Phone inputs validated against E.164 format
- [ ] File uploads: type-checked, size-limited, virus-scanned if possible
- [ ] Pagination: `limit` capped at 100, `page` >= 1

### Authentication Checklist
- [ ] Every API route starts with `getOrProvisionUser()`
- [ ] Null user returns 401 immediately
- [ ] Permission check follows auth check
- [ ] Cron routes verify `CRON_SECRET`
- [ ] Webhook routes verify signatures (e.g., Stripe webhook secret)

### Data Protection Checklist
- [ ] PII encrypted with `encryptField()` before storage
- [ ] Encrypted fields decrypted only when needed
- [ ] API responses exclude sensitive fields unless required
- [ ] Logs never contain PII, passwords, tokens, or full credit card numbers
- [ ] `.env` files are in `.gitignore`
- [ ] No secrets in client-side code (`NEXT_PUBLIC_` env vars only)

### SQL Injection Prevention
```typescript
// ✅ Safe: Prisma query builder
await prisma.user.findMany({ where: { email: userInput } });

// ✅ Safe: Parameterized raw query (tagged template)
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${userInput}`;

// ❌ DANGEROUS: String interpolation in raw query
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${userInput}'`);
```

### XSS Prevention
```tsx
// ✅ Safe: React auto-escapes
<p>{userProvidedContent}</p>

// ❌ Dangerous: Raw HTML injection
<div dangerouslySetInnerHTML={{ __html: userProvidedContent }} />

// ✅ If you MUST render HTML, sanitize first
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
```

---

## 9. Git & PR Workflow

### Branch Strategy
```bash
# Feature branch
git checkout -b feat/customer-search-filters

# Bug fix branch
git checkout -b fix/date-serialization-error

# Refactor branch
git checkout -b refactor/extract-billing-service
```

### Commit Message Format
```
<type>: <short description>

<optional body explaining why>

Types: feat, fix, refactor, docs, test, chore, perf, security
```

Examples:
```
feat: add Zod validation to customer API routes
fix: prevent tenant data leak in package query
security: add rate limiting to auth endpoints
refactor: extract billing calculation to service layer
test: add API integration tests for package CRUD
```

### PR Template
```markdown
## What
Brief description of the change.

## Why
Context on why this change is needed.

## How
Technical approach taken.

## Testing
- [ ] Unit tests added/updated
- [ ] API tests added/updated
- [ ] Manual testing completed

## Security
- [ ] Input validation added
- [ ] Auth/permission checks verified
- [ ] Tenant scoping confirmed
- [ ] No secrets exposed

## Screenshots (if UI change)
```

---

## 10. Performance Optimization

### Database Performance
```typescript
// ✅ Select only needed fields
await prisma.customer.findMany({
  select: { id: true, firstName: true, lastName: true },
});

// ❌ Fetching everything
await prisma.customer.findMany();  // Returns all columns

// ✅ Parallel independent queries
const [customers, total] = await Promise.all([
  prisma.customer.findMany({ where, skip, take }),
  prisma.customer.count({ where }),
]);

// ❌ Sequential queries
const customers = await prisma.customer.findMany({ where, skip, take });
const total = await prisma.customer.count({ where }); // Waits for first to finish
```

### Frontend Performance
- Lazy-load heavy components with `dynamic(() => import(...))`
- Use `Suspense` boundaries for streaming
- Optimize images with `next/image`
- Keep `'use client'` boundaries as low as possible in the tree

---

## 11. Debugging & Troubleshooting

### Common Issues

| Symptom                         | Likely Cause                    | Fix                              |
|---------------------------------|---------------------------------|----------------------------------|
| `Cannot read properties of undefined` | Missing null check on optional field | Add optional chaining (`?.`) and fallback |
| `Not authenticated` (401)       | Session expired or missing      | Re-login, check Auth0 config     |
| `Permission denied` (403)       | Role doesn't have action        | Check `permissions.ts` matrix    |
| Vercel build fails              | Type error or missing env var   | Check build logs, fix types      |
| Data missing for tenant         | Query not scoped to `tenantId`  | Add tenant filter to Prisma query|

### Logging Best Practices
```typescript
// ✅ Structured, actionable logging
console.error('[POST /api/customers]', {
  error: err instanceof Error ? err.message : 'Unknown error',
  userId: user?.id,
  tenantId: user?.tenantId,
  input: { firstName, lastName }, // Never log full PII
});

// ❌ Useless logging
console.log('error');
console.error(err);  // No context
```

---

## 12. Monitoring & Operations

### Health Checks
- `/api/health` — basic API health (returns 200)
- Vercel Cron Status — check Vercel dashboard for cron execution logs

### Key Metrics to Watch
- API response times (p50 < 200ms, p95 < 1000ms, p99 < 3000ms)
- Error rate (< 0.1% of requests)
- Database connection pool usage
- Cron job success rate (must be 100%)

### Incident Response
1. **Detect:** Vercel error logs, user report, or monitoring alert
2. **Assess:** Check error logs, identify affected tenants/users
3. **Mitigate:** Deploy hotfix or rollback via Vercel
4. **Resolve:** Root cause fix, add test, update this doc if needed
5. **Review:** Post-mortem for any production incident

---

## Versioning

| Version | Date       | Change                                |
|---------|------------|---------------------------------------|
| 1.0     | 2026-03-01 | Initial engineering skills guide      |
