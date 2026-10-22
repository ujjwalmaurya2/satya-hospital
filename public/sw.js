/**
 * Satya Hospital & Pathology — Service Worker
 * 
 * Strict Privacy & Security Rule:
 * Medical reports, handwritten prescriptions, patient profile data, and 
 * signed document URLs MUST NEVER be placed in offline browser/PWA caches.
 */

const CACHE_NAME = 'satya-static-v1';
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
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
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

  // Network-first strategy for dynamic page navigation, cache fallback for core shell
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache only valid static local assets
        if (
          networkResponse && 
          networkResponse.status === 200 && 
          networkResponse.type === 'basic' &&
          (url.includes('/assets/') || url.endsWith('.css') || url.endsWith('.js') || url.endsWith('.svg'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
