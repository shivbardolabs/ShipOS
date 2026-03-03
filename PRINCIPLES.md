# ShipOS Engineering & Security Principles

> The non-negotiable standards that govern every line of code in ShipOS.
> Every PR, every commit, every feature must align with these principles.

---

## Core Engineering Principles

### 1. Type Safety Is Non-Negotiable

- **Zero `any` types in production code.** Every variable, parameter, return value, and API response must be explicitly typed. Use `unknown` + type guards when the type truly isn't known.
- **Strict mode stays on.** `tsconfig.json` must have `"strict": true` and it must be enforced at build time (`ignoreBuildErrors: false`).
- **No `eslint-disable` without justification.** If you must disable a rule, add a comment explaining _why_. Blanket disables are rejected in review.

### 2. Validate at the Boundary

- **Every API route validates input with Zod.** Parse query params, request bodies, and path params through Zod schemas before touching business logic. Never trust client data.
- **Fail fast, fail clearly.** Return structured `{ error: string, details?: ZodError }` on validation failure with a 400 status.
- **Schema-first development.** Define the Zod schema first, then implement the handler. The schema _is_ the API contract.

### 3. Defense in Depth

- **Auth → Permission → Tenant → Validate → Execute.** Every API handler follows this exact order. No shortcuts.
- **Multi-tenant isolation is sacred.** Every database query must scope to `tenantId`. A tenant must never see another tenant's data. Test this explicitly.
- **Principle of least privilege.** Default to denying access. Grant permissions explicitly via the RBAC matrix.

### 4. Fail Gracefully, Log Everything

- **Structured error handling.** Use the standardized `ApiError` class and `withApiHandler()` wrapper. No bare `try/catch` with `console.error`.
- **Every error is actionable.** Log context: user ID, tenant ID, route, parameters. A log line that doesn't help you debug is wasted.
- **Never expose internals.** Return user-friendly messages to clients. Stack traces, SQL errors, and system details stay server-side.

### 5. Simplicity Over Cleverness

- **One file, one responsibility.** If a file exceeds 300 lines, it's doing too much. Split it.
- **Extract, don't duplicate.** Shared logic goes into `lib/`. If you copy-paste, you're creating a future bug.
- **Readable > short.** Explicit variable names, clear function signatures, JSDoc on public APIs. Code is read 10x more than it's written.

### 6. Test What Matters

- **API routes need integration tests.** Every route handler must have tests covering: success path, auth failure, validation failure, permission denial, and edge cases.
- **Business logic needs unit tests.** Billing calculations, permission checks, encryption, pricing logic — these must have exhaustive unit tests.
- **E2E tests for critical paths.** Auth flow, package check-in/check-out, billing, customer creation — these are smoke-tested with Playwright.

---

## Core Security Principles

### 7. Zero Trust Architecture

- **Authenticate every request.** No API route is public unless explicitly documented as such. Use `getOrProvisionUser()` as the first line.
- **Authorize every action.** After authentication, check permissions with `checkPermission(role, action)`. Auth ≠ Authz.
- **Verify at the server.** Client-side permission checks are UX conveniences, not security controls. The server is the authority.

### 8. Data Protection by Default

- **Encrypt PII at rest.** SSN, government IDs, and sensitive fields use AES-256-GCM encryption via `encryptField()` / `decryptField()`.
- **Minimize data exposure.** API responses return only the fields the client needs. Never return the full database row with `select *` semantics.
- **Secrets in environment only.** No hardcoded API keys, passwords, or tokens. All secrets flow through `process.env`. Document every required variable in `.env.example`.

### 9. Input Is Hostile

- **Sanitize everything.** Every user input — form fields, query params, file uploads, headers — is assumed malicious until validated.
- **Parameterize all queries.** Use Prisma's query builder exclusively. When raw SQL is unavoidable, use `$queryRaw` with tagged templates (parameterized), **never** `$queryRawUnsafe` with string interpolation.
- **Prevent XSS.** Never use `dangerouslySetInnerHTML` with user-supplied content. When displaying rich text, sanitize through DOMPurify or equivalent.

### 10. Secure the Infrastructure

- **Security headers on every response.** CSP, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Referrer-Policy.
- **Rate limit sensitive endpoints.** Auth, password reset, payment, and data export endpoints must be rate-limited.
- **CRON_SECRET on all cron endpoints.** Every cron handler verifies the `Authorization: Bearer <CRON_SECRET>` header. Skip = open backdoor.
- **Session management.** Enforce session timeouts, secure cookie flags, and token rotation.

### 11. Audit Everything

- **Log security-relevant actions.** Login, permission changes, data access, data modification, failed auth attempts — all go to the audit log.
- **Immutable audit trail.** Audit logs are append-only. Never delete or modify an audit entry.
- **Retention policy.** Audit logs are retained for a minimum of 12 months.

---

## Code Review Checklist

Every PR is checked against this list before merge:

- [ ] **Types:** No `any` types. All functions have explicit return types.
- [ ] **Validation:** All inputs validated with Zod schemas.
- [ ] **Auth:** Route checks authentication AND authorization.
- [ ] **Tenant scoping:** All queries filter by `tenantId`.
- [ ] **Error handling:** Uses `withApiHandler()` wrapper, no bare `try/catch`.
- [ ] **Tests:** New logic has corresponding tests. No decrease in coverage.
- [ ] **No secrets:** No hardcoded credentials, tokens, or keys.
- [ ] **No raw SQL:** Prisma query builder or parameterized `$queryRaw` only.
- [ ] **No unsafe HTML:** No `dangerouslySetInnerHTML` with user content.
- [ ] **Logging:** Errors include context (userId, tenantId, route).
- [ ] **Documentation:** Public functions have JSDoc. Complex logic has comments.

---

## Versioning

| Version | Date       | Change                              |
|---------|------------|-------------------------------------|
| 1.0     | 2026-03-01 | Initial principles established      |
