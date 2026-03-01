# ShipOS System Design & Architecture

> Comprehensive architecture reference for ShipOS — the multi-tenant SaaS platform
> for mailbox store operations. This document defines how the system is structured,
> how components interact, and the patterns every engineer must follow.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Layers](#architecture-layers)
3. [Multi-Tenant Architecture](#multi-tenant-architecture)
4. [Authentication & Authorization](#authentication--authorization)
5. [API Design Patterns](#api-design-patterns)
6. [Database Design](#database-design)
7. [Frontend Architecture](#frontend-architecture)
8. [Security Architecture](#security-architecture)
9. [Infrastructure & Deployment](#infrastructure--deployment)
10. [Error Handling](#error-handling)
11. [Performance Patterns](#performance-patterns)
12. [Observability](#observability)

---

## 1. System Overview

```
┌──────────────────────────────────────────────────────────┐
│                    ShipOS Platform                        │
│                                                          │
│  Next.js 15 (App Router) + React 19 + TypeScript         │
│  Prisma ORM + PostgreSQL (Neon) + Auth0 + Stripe         │
│  Deployed on Vercel (Edge + Serverless)                   │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐ │
│  │ Dashboard │  │ API Layer│  │ Cron Jobs  │  │ Emails │ │
│  │ (React)   │  │ (Routes) │  │ (Vercel)   │  │(Resend)│ │
│  └─────┬─────┘  └─────┬────┘  └─────┬─────┘  └────┬───┘ │
│        │              │              │              │     │
│        └──────────────┼──────────────┘              │     │
│                       │                             │     │
│              ┌────────┴────────┐                    │     │
│              │   Service Layer  │────────────────────┘     │
│              │   (lib/*.ts)     │                          │
│              └────────┬────────┘                          │
│                       │                                   │
│              ┌────────┴────────┐                          │
│              │  Data Layer      │                          │
│              │  Prisma + Neon   │                          │
│              └─────────────────┘                          │
└──────────────────────────────────────────────────────────┘
```

**Tech Stack:**
| Layer          | Technology                           |
|----------------|--------------------------------------|
| Framework      | Next.js 15 (App Router)              |
| UI             | React 19, Tailwind CSS, Lucide Icons |
| Language       | TypeScript (strict mode)             |
| ORM            | Prisma 6.x                           |
| Database       | PostgreSQL via Neon (serverless)      |
| Auth           | Auth0 (`@auth0/nextjs-auth0`)        |
| Payments       | Stripe                               |
| Email          | Resend + React Email                 |
| SMS            | Twilio                               |
| Analytics      | PostHog                              |
| Hosting        | Vercel (serverless + edge)           |
| Charts         | Recharts                             |
| Forms          | react-hook-form + Zod                |

---

## 2. Architecture Layers

ShipOS follows a strict 4-layer architecture. Dependencies flow downward only.

```
  Presentation Layer    → src/app/**, src/components/**
       ↓
  API Layer             → src/app/api/**/route.ts
       ↓
  Service / Business    → src/lib/**
       ↓
  Data Access           → Prisma client (src/lib/prisma.ts)
```

### Rules:
- **Presentation** never imports Prisma directly. Always go through API routes.
- **API routes** are thin orchestrators: validate → auth → call service → respond.
- **Service layer** contains all business logic, calculations, and integrations.
- **Data layer** is Prisma only. No raw SQL in service code.

---

## 3. Multi-Tenant Architecture

ShipOS uses **shared database, row-level isolation** — every table with tenant-scoped
data includes a `tenantId` foreign key.

### Tenant Scoping Rules

```typescript
// ✅ CORRECT — always scope by tenant
const packages = await prisma.package.findMany({
  where: {
    customer: { tenantId: user.tenantId },
    status: 'pending',
  },
});

// ❌ WRONG — no tenant scoping = data leak
const packages = await prisma.package.findMany({
  where: { status: 'pending' },
});
```

### Superadmin Bypass
Only `superadmin` role can query across tenants (for the admin panel):

```typescript
const tenantScope = user.role !== 'superadmin' && user.tenantId
  ? { tenantId: user.tenantId }
  : {};
```

### Tenant Lifecycle
```
Trial → Active → Paused → Disabled
         ↓
      Billing (Stripe subscription)
```

---

## 4. Authentication & Authorization

### Authentication Flow (Auth0)
```
User → /api/auth/login → Auth0 → Callback → Session Cookie
                                              ↓
                                    getOrProvisionUser()
                                              ↓
                                    Local User + Tenant row
```

- **First login:** Auto-provisions User + Tenant (or accepts invitation).
- **Session:** Managed by Auth0 SDK with secure, httpOnly cookies.
- **Middleware:** `/dashboard/*` routes are protected by `withMiddlewareAuthRequired()`.

### Authorization (RBAC)

```
superadmin → admin → manager → employee
   (all)      (tenant)  (ops)    (basic)
```

**Server-side pattern (required on every API route):**
```typescript
import { getOrProvisionUser } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  const user = await getOrProvisionUser();
  if (!user) return unauthorized();
  
  checkPermission(user.role, 'manage_users');  // Throws 403 if denied
  // ... proceed with business logic
}
```

**Client-side pattern (UX only, never security):**
```typescript
const canManage = usePermission('manage_users');
if (canManage) { /* show the button */ }
```

---

## 5. API Design Patterns

### Standard Route Handler Structure

Every API route must follow this exact pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrProvisionUser } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import prisma from '@/lib/prisma';

// 1. Define the schema
const CreateItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

// 2. Implement the handler
export async function POST(request: NextRequest) {
  try {
    // Step 1: Authenticate
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Step 2: Authorize
    checkPermission(user.role, 'create_items');

    // Step 3: Validate input
    const body = await request.json();
    const parsed = CreateItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Step 4: Execute (tenant-scoped)
    const item = await prisma.item.create({
      data: {
        ...parsed.data,
        tenantId: user.tenantId!,
      },
    });

    // Step 5: Return
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    // Step 6: Handle errors
    if ((err as any).statusCode === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[POST /api/items]', {
      error: err,
      userId: user?.id,
      tenantId: user?.tenantId,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### API Response Conventions

| Status | Meaning            | Response Shape                              |
|--------|--------------------|---------------------------------------------|
| 200    | Success            | `{ data }` or `{ items, total, page }`      |
| 201    | Created            | `{ data }` (the created entity)             |
| 400    | Validation error   | `{ error: string, details?: ZodError }`     |
| 401    | Not authenticated  | `{ error: 'Not authenticated' }`            |
| 403    | Not authorized     | `{ error: 'Forbidden' }`                    |
| 404    | Not found          | `{ error: 'Not found' }`                    |
| 500    | Server error       | `{ error: 'Internal server error' }`        |

### Pagination Standard
```typescript
// Query params: ?page=1&limit=50&search=term
// Response: { items: [...], total: 150, page: 1, limit: 50 }
const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
```

### Cron Endpoint Pattern
```typescript
export async function POST(request: Request) {
  // REQUIRED: Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... cron logic
}
```

---

## 6. Database Design

### Schema Principles
- **Every model has `createdAt` + `updatedAt`** with `@default(now())` and `@updatedAt`.
- **Soft delete** via `deletedAt DateTime?` field — never hard-delete customer data.
- **Tenant FK** on every business entity.
- **Indexes** on all foreign keys and commonly filtered fields.
- **Enums as strings** for Prisma compatibility and readability.

### Key Models
```
Tenant ──┬── User (auth, roles)
         ├── Customer (PMB holders)
         │    ├── Package (inbound parcels)
         │    ├── MailPiece (letters)
         │    └── Shipment (outbound)
         ├── Store (physical locations)
         ├── Subscription (billing plans)
         ├── PaymentRecord (transactions)
         ├── Alert (system notifications)
         └── CarrierProgramEnrollment
```

### Migration Strategy
- Prisma Migrate for schema changes (`prisma db push` for dev, `prisma migrate deploy` for prod).
- **Never** use `--accept-data-loss` in production.
- All migrations are reviewed before deployment.

---

## 7. Frontend Architecture

### Component Hierarchy
```
src/
├── app/                     # Next.js App Router pages
│   ├── layout.tsx           # Root layout (theme, providers)
│   ├── dashboard/           # Authenticated area
│   │   ├── layout.tsx       # Dashboard shell (sidebar, nav)
│   │   ├── page.tsx         # Dashboard home
│   │   ├── customers/       # Customer management
│   │   ├── packages/        # Package operations
│   │   ├── mail/            # Mail management
│   │   ├── shipping/        # Shipment management
│   │   ├── settings/        # Tenant settings
│   │   └── admin/           # Superadmin panel
│   └── api/                 # API route handlers
├── components/
│   ├── ui/                  # Base UI kit (button, input, card, modal)
│   ├── layout/              # Shell, sidebar, navigation
│   ├── customer/            # Customer-specific components
│   ├── packages/            # Package-specific components
│   └── dashboard/           # Dashboard widgets
├── hooks/                   # Custom React hooks
├── lib/                     # Server utilities & business logic
└── emails/                  # React Email templates
```

### Component Rules
1. **Server Components by default.** Only add `'use client'` when you need interactivity.
2. **UI components are generic.** `src/components/ui/` has no business logic — pure presentation.
3. **Feature components are domain-specific.** `src/components/customer/` knows about customers.
4. **Pages are thin.** Fetch data, pass to components. No complex logic in page files.

### State Management
- **Server state:** Fetch in server components or via `fetch()` from API routes.
- **Client state:** React `useState` / `useReducer` for local UI state.
- **URL state:** Use `useUrlState()` hook for filter/pagination state (shareable URLs).
- **Global context:** `TenantProvider`, `BrandingProvider`, `FeatureFlagProvider` for app-wide state.
- **No Redux.** The codebase uses React's built-in state management patterns.

### Form Pattern
```typescript
// Always use react-hook-form + Zod
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

type FormData = z.infer<typeof schema>;

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  // ...
}
```

---

## 8. Security Architecture

### Defense Layers

```
┌─────────────────────────────────────────────┐
│  Layer 1: Network (Vercel Edge, HTTPS/TLS)  │
├─────────────────────────────────────────────┤
│  Layer 2: Security Headers (CSP, HSTS, etc) │
├─────────────────────────────────────────────┤
│  Layer 3: Auth Middleware (Auth0 session)    │
├─────────────────────────────────────────────┤
│  Layer 4: Route-level Auth + RBAC           │
├─────────────────────────────────────────────┤
│  Layer 5: Input Validation (Zod)            │
├─────────────────────────────────────────────┤
│  Layer 6: Tenant Isolation (row-level)      │
├─────────────────────────────────────────────┤
│  Layer 7: Encryption at Rest (AES-256-GCM)  │
├─────────────────────────────────────────────┤
│  Layer 8: Audit Logging                     │
└─────────────────────────────────────────────┘
```

### Encryption
- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key management:** 32-byte hex key via `ENCRYPTION_KEY` env var
- **Scope:** SSN, government ID numbers, sensitive PII
- **Format:** `iv:authTag:ciphertext` (hex-encoded)

### Session Security
- **Timeout:** Warn at 15 min, logout at 20 min of inactivity
- **Cookies:** Secure, HttpOnly, SameSite=Lax (managed by Auth0)
- **Login tracking:** Every login creates a `LoginSession` record

### Security Headers (via `next.config.ts`)
```typescript
headers: [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; ..." },
]
```

### Rate Limiting Strategy
| Endpoint Category     | Limit              |
|-----------------------|--------------------|
| Auth endpoints        | 10 req/min per IP  |
| API mutations (POST)  | 60 req/min per user|
| API reads (GET)       | 120 req/min per user|
| File uploads          | 10 req/min per user|
| Cron endpoints        | CRON_SECRET only   |

---

## 9. Infrastructure & Deployment

### Vercel Configuration
- **Framework:** Next.js (auto-detected)
- **Build:** `prisma generate && prisma db push && next build`
- **Regions:** US East 1 (primary)
- **Crons:** Defined in `vercel.json`

### Environment Variables (Required)
```bash
# Auth
AUTH0_SECRET=
AUTH0_BASE_URL=
AUTH0_ISSUER_BASE_URL=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=

# Database
POSTGRES_PRISMA_URL=       # Pooled connection
POSTGRES_URL_NON_POOLING=  # Direct connection for migrations

# Security
ENCRYPTION_KEY=            # 64-char hex string (32 bytes)
CRON_SECRET=               # Bearer token for cron endpoints

# Payments
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Communications
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

### Branch Strategy
```
main (production) ← PR ← feat/feature-name
                  ← PR ← fix/bug-description
                  ← PR ← refactor/improvement
```

---

## 10. Error Handling

### Server-Side Pattern
```typescript
// All API routes should use structured error handling
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
  }
}

// Handler wrapper that catches ApiError and returns proper responses
function withApiHandler(handler: Function) {
  return async (request: NextRequest, context: any) => {
    try {
      return await handler(request, context);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          { error: err.message, details: err.details },
          { status: err.statusCode }
        );
      }
      console.error(`[${request.method} ${request.url}]`, err);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
```

### Client-Side Pattern
- Use `error.tsx` boundaries in each route segment.
- Use `not-found.tsx` for 404 pages.
- Show toast notifications for recoverable errors.
- Full-page error states for unrecoverable errors.

---

## 11. Performance Patterns

- **Database:** Use `select` to limit fields returned. Avoid N+1 with `include`.
- **Pagination:** Always paginate list endpoints. Max 100 items per page.
- **Caching:** Leverage Next.js ISR/caching for static-ish content.
- **Bundle:** Keep client bundles lean. Heavy libs in server components only.
- **Images:** Use `next/image` for optimization. Store in Vercel Blob or CDN.

---

## 12. Observability

- **Error tracking:** Console errors → Vercel logs (future: Sentry)
- **Analytics:** PostHog for product analytics and feature flags
- **Audit logs:** `AuditLog` model for security-relevant events
- **Performance:** Vercel Analytics for Web Vitals

---

## Versioning

| Version | Date       | Change                                |
|---------|------------|---------------------------------------|
| 1.0     | 2026-03-01 | Initial architecture documentation    |
