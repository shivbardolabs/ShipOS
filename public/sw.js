/**
 * BAR-204: Service Worker for Offline Mode
 *
 * Strategy:
 * - Network-first for API calls (fall back to cache)
 * - Cache-first for static assets (JS, CSS, images)
 * - Offline queue for mutations (POST/PUT/DELETE) — replayed on reconnect
 */

const CACHE_NAME = 'shipos-v1';
const STATIC_CACHE = 'shipos-static-v1';
const API_CACHE = 'shipos-api-v1';
const OFFLINE_QUEUE_KEY = 'shipos-offline-queue';

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/dashboard',
  '/login',
  '/offline',
  '/manifest.json',
];

// ── Install — pre-cache shell ───────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Some URLs may fail in dev — that's OK
        console.log('[SW] Pre-cache partial failure (expected in dev)');
      });
    })
  );
  self.skipWaiting();
});

// ── Activate — clean old caches ─────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch — routing strategy ────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET for caching (queue mutations instead)
  if (request.method !== 'GET') {
    event.respondWith(
      fetch(request).catch(() => {
        // Queue failed mutation for replay
        return queueOfflineRequest(request).then(() =>
          new Response(JSON.stringify({ queued: true, offline: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 202,
          })
        );
      })
    );
    return;
  }

  // API calls: network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff2?|ico)$/) ||
    url.pathname.startsWith('/_next/')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Pages: network-first
  event.respondWith(networkFirst(request, CACHE_NAME));
});

// ── Cache strategies ────────────────────────────────────────────────────

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline');
      if (offlinePage) return offlinePage;
    }

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

// ── Offline mutation queue ──────────────────────────────────────────────

async function queueOfflineRequest(request) {
  try {
    const body = await request.clone().text();
    const entry = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
      timestamp: Date.now(),
    };

    // Use IndexedDB-like approach via cache API
    const cache = await caches.open('shipos-offline-queue');
    const queueResponse = await cache.match('queue');
    const queue = queueResponse ? await queueResponse.json() : [];
    queue.push(entry);
    await cache.put('queue', new Response(JSON.stringify(queue)));
  } catch (err) {
    console.error('[SW] Failed to queue offline request:', err);
  }
}

// ── Online event — replay queued mutations ──────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'REPLAY_OFFLINE_QUEUE') {
    replayOfflineQueue().then((results) => {
      event.ports?.[0]?.postMessage({ type: 'REPLAY_COMPLETE', results });
    });
  }

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function replayOfflineQueue() {
  const cache = await caches.open('shipos-offline-queue');
  const queueResponse = await cache.match('queue');
  if (!queueResponse) return [];

  const queue = await queueResponse.json();
  const results = [];

  for (const entry of queue) {
    try {
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: entry.headers,
        body: entry.body || undefined,
      });
      results.push({ url: entry.url, status: response.status, success: response.ok });
    } catch (err) {
      results.push({ url: entry.url, status: 0, success: false, error: err.message });
    }
  }

  // Clear queue
  await cache.put('queue', new Response('[]'));
  return results;
}
