# Route Migration Patterns

## Pattern 1: Standard authenticated GET endpoint
```typescript
// BEFORE:
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    // ... logic ...
  } catch (err) {
    console.error('[GET /api/xxx]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// AFTER:
import { withApiHandler, validateQuery, ok, paginated } from '@/lib/api-utils';
import { z } from 'zod';

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(200).optional(),
});

export const GET = withApiHandler(async (request, { user }) => {
  const query = validateQuery(request, QuerySchema);
  // ... logic using query.page, query.limit, etc. ...
  return paginated(items, total, query.page, query.limit);
});
```

## Pattern 2: Standard authenticated POST endpoint
```typescript
// AFTER:
import { withApiHandler, validateBody, created, badRequest } from '@/lib/api-utils';
import { z } from 'zod';

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  // ...
});

export const POST = withApiHandler(async (request, { user }) => {
  const data = await validateBody(request, CreateSchema);
  const item = await prisma.item.create({
    data: { ...data, tenantId: user.tenantId! },
  });
  return created(item);
});
```

## Pattern 3: Dynamic route with params
```typescript
export const GET = withApiHandler(async (request, { user, params }) => {
  const id = params?.id;
  if (!id) badRequest('Missing id');
  const item = await prisma.item.findFirst({
    where: { id, tenantId: user.tenantId! },
  });
  if (!item) notFound('Item not found');
  return ok(item);
});
```

## Pattern 4: Cron endpoint (CRON_SECRET auth)
```typescript
// Cron routes use their own auth pattern (Bearer CRON_SECRET)
// Keep existing CRON_SECRET check, but wrap in error handling
export const POST = withApiHandler(async (request) => {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    unauthorized('Invalid cron secret');
  }
  // ... logic ...
  return ok(result);
}, { public: true });
```

## Pattern 5: Webhook endpoint (external auth)
```typescript
// Stripe webhooks, Twilio webhooks have their own signature verification
// Use { public: true } and keep their existing auth
export const POST = withApiHandler(async (request) => {
  // ... existing signature verification ...
  return ok({ received: true });
}, { public: true });
```

## Replacing `any` types
```typescript
// BEFORE:
const where: Record<string, any> = {};

// AFTER:
import { Prisma } from '@prisma/client';
const where: Prisma.CustomerWhereInput = {};
```

## Key Rules
1. Always scope queries to `tenantId: user.tenantId!`
2. Superadmin routes can skip tenant scoping but should still authenticate
3. Replace manual validation with Zod schemas
4. Remove all eslint-disable comments for any types
5. Use Prisma generated types instead of `any`
