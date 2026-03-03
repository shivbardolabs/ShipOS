/**
 * API Route Utilities — standardized error handling, validation, and response helpers.
 *
 * Provides:
 *   - `ApiError` class for structured errors
 *   - `withApiHandler()` wrapper for consistent error handling
 *   - `validateBody()` / `validateQuery()` for Zod-powered input validation
 *   - Response helper functions
 *
 * @example
 * ```ts
 * import { withApiHandler, validateBody, ApiError } from '@/lib/api-utils';
 * import { z } from 'zod';
 *
 * const CreateSchema = z.object({ name: z.string().min(1) });
 *
 * export const POST = withApiHandler(async (request, { user }) => {
 *   const data = await validateBody(request, CreateSchema);
 *   const item = await prisma.item.create({ data: { ...data, tenantId: user.tenantId! } });
 *   return created(item);
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';
import { getOrProvisionUser, type LocalUser } from './auth';

/* ── ApiError ──────────────────────────────────────────────────────────────── */

/**
 * Structured API error. Thrown inside handlers and caught by `withApiHandler`.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function badRequest(message: string, details?: unknown): never {
  throw new ApiError(message, 400, details);
}

export function unauthorized(message = 'Not authenticated'): never {
  throw new ApiError(message, 401);
}

export function forbidden(message = 'Forbidden'): never {
  throw new ApiError(message, 403);
}

export function notFound(message = 'Not found'): never {
  throw new ApiError(message, 404);
}

/* ── Validation ────────────────────────────────────────────────────────────── */

/**
 * Parse and validate a JSON request body against a Zod schema.
 * Throws ApiError(400) on validation failure with structured details.
 */
export async function validateBody<T extends ZodSchema>(
  request: NextRequest,
  schema: T,
): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError('Invalid JSON body', 400);
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError('Validation failed', 400, result.error.flatten());
  }
  return result.data;
}

/**
 * Parse and validate URL search params against a Zod schema.
 * Throws ApiError(400) on validation failure.
 */
export function validateQuery<T extends ZodSchema>(
  request: NextRequest,
  schema: T,
): z.infer<T> {
  const raw = Object.fromEntries(new URL(request.url).searchParams.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ApiError('Invalid query parameters', 400, result.error.flatten());
  }
  return result.data;
}

/* ── Response Helpers ──────────────────────────────────────────────────────── */

export function ok<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 200 });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function paginated<T>(items: T[], total: number, page: number, limit: number): NextResponse {
  return NextResponse.json({ items, total, page, limit }, { status: 200 });
}

/* ── Handler Wrapper ───────────────────────────────────────────────────────── */

interface HandlerContext {
  user: LocalUser;
  params?: Record<string, string>;
}

type ApiHandler = (
  request: NextRequest,
  context: HandlerContext,
) => Promise<NextResponse>;

interface WithApiHandlerOptions {
  /** If true, skip authentication (for public endpoints). Default: false */
  public?: boolean;
}

/**
 * Wraps an API route handler with standardized auth + error handling.
 *
 * - Authenticates the user (unless `public: true`)
 * - Catches `ApiError` and returns structured JSON responses
 * - Catches unexpected errors and returns 500 with no internal details
 * - Logs errors with context for debugging
 */
export function withApiHandler(handler: ApiHandler, options?: WithApiHandlerOptions) {
  return async (
    request: NextRequest,
    routeContext?: { params?: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    let user: LocalUser | null = null;

    try {
      // Resolve dynamic route params
      const params = routeContext?.params ? await routeContext.params : undefined;

      // Authenticate unless public
      if (!options?.public) {
        user = await getOrProvisionUser();
        if (!user) {
          return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
      }

      return await handler(request, { user: user!, params });
    } catch (err) {
      // Handle structured API errors
      if (err instanceof ApiError) {
        return NextResponse.json(
          {
            error: err.message,
            ...(err.details ? { details: err.details } : {}),
          },
          { status: err.statusCode },
        );
      }

      // Handle permission errors from checkPermission()
      if (err instanceof Error && 'statusCode' in err) {
        const statusCode = (err as Error & { statusCode: number }).statusCode;
        return NextResponse.json({ error: err.message }, { status: statusCode });
      }

      // Unexpected error — log and return generic 500
      const method = request.method;
      const url = new URL(request.url).pathname;
      console.error(`[${method} ${url}]`, {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        userId: user?.id,
        tenantId: user?.tenantId,
      });

      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

/* ── Pagination Helpers ────────────────────────────────────────────────────── */

/** Standard pagination query schema */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(200).optional(),
});

export type PaginationParams = z.infer<typeof PaginationSchema>;

/** Convert page/limit to skip/take for Prisma */
export function paginationToSkipTake(params: PaginationParams) {
  return {
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  };
}
