/**
 * Billing, Reports & Operations E2E Tests
 *
 * Tests billing dashboard, report hub, reconciliation, end-of-day,
 * and other operational pages. Requires AUTH_COOKIE.
 */

import { test, expect } from '@playwright/test';

test.describe('Billing & Finance', () => {
  test.skip(!process.env.AUTH_COOKIE, 'Requires AUTH_COOKIE env var');

  test.beforeEach(async ({ context }) => {
    const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
    await context.addCookies([{
      name: 'appSession',
      value: process.env.AUTH_COOKIE!,
      domain: new URL(baseURL).hostname,
      path: '/',
    }]);
  });

  test('billing dashboard loads', async ({ page }) => {
    await page.goto('/dashboard/billing');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/billing|plan|subscription/i, { timeout: 15_000 });
  });

  test('charge events page loads', async ({ page }) => {
    await page.goto('/dashboard/charge-events');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/charge|event|transaction/i, { timeout: 15_000 });
  });

  test('invoicing page loads', async ({ page }) => {
    await page.goto('/dashboard/invoicing');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/invoice/i, { timeout: 15_000 });
  });

  test('TOS billing page loads', async ({ page }) => {
    await page.goto('/dashboard/tos-billing');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/billing|tos|payment/i, { timeout: 15_000 });
  });

  test('payment methods page loads', async ({ page }) => {
    await page.goto('/dashboard/tos-billing/payment-methods');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/payment|method|card/i, { timeout: 15_000 });
  });

  test('pricing settings page loads', async ({ page }) => {
    await page.goto('/dashboard/pricing');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/pricing|plan|rate/i, { timeout: 15_000 });
  });
});

test.describe('Reports Hub', () => {
  test.skip(!process.env.AUTH_COOKIE, 'Requires AUTH_COOKIE env var');

  test.beforeEach(async ({ context }) => {
    const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
    await context.addCookies([{
      name: 'appSession',
      value: process.env.AUTH_COOKIE!,
      domain: new URL(baseURL).hostname,
      path: '/',
    }]);
  });

  test('reports hub index page loads', async ({ page }) => {
    await page.goto('/dashboard/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/report/i, { timeout: 15_000 });
  });

  const reportPages = [
    { path: '/dashboard/reports/packages', name: 'Package Reports', match: /package|report/i },
    { path: '/dashboard/reports/customers', name: 'Customer Reports', match: /customer|report/i },
    { path: '/dashboard/reports/revenue', name: 'Revenue Reports', match: /revenue|report/i },
    { path: '/dashboard/reports/kpi', name: 'KPI Dashboard', match: /kpi|metric|report/i },
    { path: '/dashboard/reports/analytics', name: 'Analytics', match: /analytic|report/i },
    { path: '/dashboard/reports/carrier', name: 'Carrier Reports', match: /carrier|report/i },
    { path: '/dashboard/reports/mail', name: 'Mail Reports', match: /mail|report/i },
  ];

  for (const report of reportPages) {
    test(`${report.name} page loads`, async ({ page }) => {
      await page.goto(report.path);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toContainText(report.match, { timeout: 15_000 });
    });
  }
});

test.describe('Operations', () => {
  test.skip(!process.env.AUTH_COOKIE, 'Requires AUTH_COOKIE env var');

  test.beforeEach(async ({ context }) => {
    const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
    await context.addCookies([{
      name: 'appSession',
      value: process.env.AUTH_COOKIE!,
      domain: new URL(baseURL).hostname,
      path: '/',
    }]);
  });

  test('reconciliation page loads', async ({ page }) => {
    await page.goto('/dashboard/reconciliation');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/reconcil/i, { timeout: 15_000 });
  });

  test('AI bill audit page loads', async ({ page }) => {
    await page.goto('/dashboard/reconciliation/ai-audit');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/audit|reconcil|ai/i, { timeout: 15_000 });
  });

  test('end of day page loads', async ({ page }) => {
    await page.goto('/dashboard/end-of-day');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/end.?of.?day|close|summary/i, { timeout: 15_000 });
  });

  test('compliance page loads', async ({ page }) => {
    await page.goto('/dashboard/compliance');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/compliance|cmra/i, { timeout: 15_000 });
  });

  test('compliance closures page loads', async ({ page }) => {
    await page.goto('/dashboard/compliance/closures');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/closure|compliance/i, { timeout: 15_000 });
  });

  test('renewals page loads', async ({ page }) => {
    await page.goto('/dashboard/renewals');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/renewal/i, { timeout: 15_000 });
  });

  test('loyalty program page loads', async ({ page }) => {
    await page.goto('/dashboard/loyalty');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/loyalty|reward|program/i, { timeout: 15_000 });
  });

  test('carrier program page loads', async ({ page }) => {
    await page.goto('/dashboard/carrier-program');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/carrier|program/i, { timeout: 15_000 });
  });
});
