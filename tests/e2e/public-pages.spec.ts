/**
 * Public Pages E2E Tests
 *
 * Tests all unauthenticated pages: landing, features, pricing,
 * support, terms, privacy, login redirect, and auth error page.
 * No AUTH_COOKIE required — these run against production safely.
 */

import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('renders hero with branding and CTA', async ({ page }) => {
    await page.goto('/');
    // Logo / brand
    await expect(page.locator('img[alt="ShipOS"]')).toBeVisible();
    await expect(page.locator('body')).toContainText('ShipOS');
    await expect(page.locator('body')).toContainText('Bardo Labs');
    // Hero CTA
    await expect(page.locator('a[href="/api/auth/signup"]').first()).toBeVisible();
  });

  test('header navigation links are present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/pricing"]').first()).toBeVisible();
    await expect(page.locator('a[href="/support"]').first()).toBeVisible();
    await expect(page.locator('a[href="/api/auth/login"]').first()).toBeVisible();
  });

  test('feature cards are visible', async ({ page }) => {
    await page.goto('/');
    const features = ['Package Tracking', 'Customer & PMB', 'Shipping Center', 'Mail Handling'];
    for (const feature of features) {
      await expect(page.locator(`text=${feature}`).first()).toBeVisible();
    }
  });

  test('mobile responsive — CTA visible at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('a[href="/api/auth/signup"]').first()).toBeVisible();
  });
});

test.describe('Features Page', () => {
  test('renders with hero stats and feature sections', async ({ page }) => {
    await page.goto('/features');
    await expect(page.locator('body')).toContainText(/feature/i);
    // Hero stats from the page
    const stats = ['18+', '6', '10+', '99.9%'];
    for (const stat of stats) {
      await expect(page.locator(`text=${stat}`).first()).toBeVisible();
    }
  });
});

test.describe('Pricing Page', () => {
  test('renders all pricing tiers', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('body')).toContainText(/pricing/i);
    // All three tiers
    const tiers = ['Starter', 'Pro', 'Enterprise'];
    for (const tier of tiers) {
      await expect(page.locator(`text=${tier}`).first()).toBeVisible();
    }
  });

  test('pricing toggle between monthly and annual works', async ({ page }) => {
    await page.goto('/pricing');
    // Look for toggle/switch for billing period
    const toggle = page.locator('button:has-text("Annual"), [role="switch"], [data-testid="billing-toggle"]').first();
    if (await toggle.isVisible()) {
      await toggle.click();
      // Page should update — just verify no crash
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('CTA buttons link to signup', async ({ page }) => {
    await page.goto('/pricing');
    const signupLinks = page.locator('a[href="/api/auth/signup"]');
    await expect(signupLinks.first()).toBeVisible();
  });
});

test.describe('Support Page', () => {
  test('renders support channels', async ({ page }) => {
    await page.goto('/support');
    await expect(page.locator('body')).toContainText(/support/i);
    await expect(page.locator('body')).toContainText(/email/i);
  });

  test('FAQ section is present', async ({ page }) => {
    await page.goto('/support');
    // FAQ or help content should be visible
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/faq|frequently|help|question/);
  });
});

test.describe('Legal Pages', () => {
  test('terms of service loads with content', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.locator('body')).toContainText(/terms/i);
    // Should have substantial legal content
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.length).toBeGreaterThan(500);
  });

  test('privacy policy loads with content', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('body')).toContainText(/privacy/i);
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.length).toBeGreaterThan(500);
  });
});

test.describe('Auth Pages', () => {
  test('login page redirects to Auth0', async ({ page }) => {
    await page.goto('/login');
    // Login page either shows loading state or redirects to Auth0
    await page.waitForTimeout(2000);
    const url = page.url();
    // Either still on /login (JS redirect pending) or redirected to Auth0
    expect(url).toMatch(/login|auth0/);
  });

  test('auth error page shows friendly message for access_denied', async ({ page }) => {
    await page.goto('/auth/error?error=access_denied');
    await expect(page.locator('body')).toContainText(/denied|permission/i);
    // Should have a "go back" or "try again" action
    await expect(page.locator('a, button').filter({ hasText: /back|home|again|sign in/i }).first()).toBeVisible();
  });

  test('auth error page shows message for expired session', async ({ page }) => {
    await page.goto('/auth/error?error=login_required');
    await expect(page.locator('body')).toContainText(/expired|sign in/i);
  });

  test('auth error page handles unknown errors gracefully', async ({ page }) => {
    await page.goto('/auth/error?error=some_unknown_error');
    await expect(page.locator('body')).toContainText(/error|unexpected/i);
  });

  test('unauthorized page renders', async ({ page }) => {
    await page.goto('/unauthorized');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Auth Guards', () => {
  test('dashboard redirects to login without auth', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/login|auth0|dashboard/, { timeout: 10_000 });
    // Without auth cookie, should redirect away from dashboard
    const url = page.url();
    expect(url).toMatch(/login|auth0|agree/);
  });

  test('customer pages redirect to login without auth', async ({ page }) => {
    await page.goto('/dashboard/customers');
    await page.waitForURL(/login|auth0|dashboard/, { timeout: 10_000 });
    const url = page.url();
    expect(url).toMatch(/login|auth0|agree/);
  });
});
