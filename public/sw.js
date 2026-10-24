/**
 * Satya Hospital & Pathology — Service Worker
 * 
 * Strict Privacy & Security Rule:
 * Medical reports, handwritten prescriptions, patient profile data, and 
 * signed document URLs MUST NEVER be placed in offline browser/PWA caches.
 * 
 * Cache Strategy:
 * - HTML & Navigation: Network-First (ensures visitors always get latest deployed version)
 * - Static Assets (CSS, JS, Fonts): Stale-While-Revalidate with network update
 * - Sensitive Medical Data / APIs / Auth: Network-Only (NEVER CACHED)
 */

const CACHE_NAME = 'satya-static-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// Sensitive patterns that must NEVER be cached
const SENSITIVE_PATTERNS = [
  /\/reports\//i,
  /\/prescriptions\//i,
  /\/medical-documents\//i,
  /\/patient\//i,
  /\/api\//i,
  /supabase\.co/i,
  /r2\.cloudflarestorage\.com/i,
  /token=/i,
  /signature=/i,
  /X-Amz-/i,
  /\.pdf($|\?)/i,
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Never intercept non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Strictly exclude private medical records, PDFs, and signed URLs from caching
  const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(url));
  if (isSensitive) {
    // Network-only, bypass cache completely
    return;
  }

  const isNavigation = event.request.mode === 'navigate' || 
                       event.request.destination === 'document' ||
                       (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'));

  // 1. Navigation / HTML pages: Network-First
  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  // 2. Static Assets: Network-first for fresh builds, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          (url.includes('/assets/') || url.endsWith('.css') || url.endsWith('.js') || url.endsWith('.svg') || url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.webp'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
