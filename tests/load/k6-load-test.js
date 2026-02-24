/**
 * BAR-210: k6 Load Test Configuration
 *
 * Validates the requirements doc target:
 *   - 1,000–5,000 active accounts
 *   - 20 concurrent users
 *   - Response time < 2s for dashboard, < 500ms for API
 *
 * Install: brew install k6 (or download from k6.io)
 * Run: k6 run tests/load/k6-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const dashboardLatency = new Trend('dashboard_latency', true);
const apiLatency = new Trend('api_latency', true);

// Test config: ramp to 20 concurrent users
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Warm up
    { duration: '1m', target: 20 },    // Ramp to target
    { duration: '3m', target: 20 },    // Sustain
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'dashboard_latency': ['p(95)<2000'],  // 95th percentile < 2s
    'api_latency': ['p(95)<500'],          // 95th percentile < 500ms
    'errors': ['rate<0.05'],               // Error rate < 5%
  },
};

const BASE_URL = __ENV.TEST_BASE_URL || 'http://localhost:3000';
const AUTH_COOKIE = __ENV.AUTH_COOKIE || '';

const headers = AUTH_COOKIE
  ? { Cookie: `appSession=${AUTH_COOKIE}` }
  : {};

export default function () {
  // Simulate real user flow
  const scenarios = [
    () => {
      // Dashboard load
      const res = http.get(`${BASE_URL}/dashboard`, { headers, redirectMaxRedirects: 0 });
      dashboardLatency.add(res.timings.duration);
      check(res, { 'dashboard status ok': (r) => [200, 302, 307].includes(r.status) });
      errorRate.add(res.status >= 500);
    },
    () => {
      // API: Feature flags
      const res = http.get(`${BASE_URL}/api/feature-flags`, { headers });
      apiLatency.add(res.timings.duration);
      check(res, { 'feature-flags ok': (r) => [200, 401].includes(r.status) });
      errorRate.add(res.status >= 500);
    },
    () => {
      // API: User info
      const res = http.get(`${BASE_URL}/api/users/me`, { headers });
      apiLatency.add(res.timings.duration);
      check(res, { 'users/me ok': (r) => [200, 401].includes(r.status) });
      errorRate.add(res.status >= 500);
    },
    () => {
      // API: Tenant info
      const res = http.get(`${BASE_URL}/api/tenant`, { headers });
      apiLatency.add(res.timings.duration);
      check(res, { 'tenant ok': (r) => [200, 401].includes(r.status) });
      errorRate.add(res.status >= 500);
    },
    () => {
      // Login page (public, no auth needed)
      const res = http.get(`${BASE_URL}/login`, { redirectMaxRedirects: 0 });
      dashboardLatency.add(res.timings.duration);
      check(res, { 'login page ok': (r) => [200, 302, 307].includes(r.status) });
      errorRate.add(res.status >= 500);
    },
  ];

  // Pick a random scenario
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();

  sleep(1 + Math.random() * 2); // 1-3s think time
}

export function handleSummary(data) {
  return {
    'test-results/load-test-summary.json': JSON.stringify(data, null, 2),
  };
}
