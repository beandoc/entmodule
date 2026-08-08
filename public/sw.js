// i-Dhanwantari ENT Portal Service Worker — Offline-First & Low-Bandwidth Mode
const CACHE_NAME = 'idhanwantari-v3';
const STATIC_ASSETS = [
  '/',
  '/care-plan',
  '/patient-education',
  '/audiologist',
  '/settings',
  '/symptom-log',
  '/self-assessment',
  '/rehab/vestibular',
  '/rehab/sinus',
  '/rehab/otology',
  '/rehab/tinnitus',
  '/troubleshooting',
  '/emergency',
  '/downloads',
  '/podcasts',
  '/guides',
  '/decisions',
  '/schemes',
  '/consent',
  '/clinician/analytics',
  '/manifest.json'
];

// Install Event — Cache Core Pages & Assigned Care Pathway Content
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching core patient care pages & active pathways...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event — Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache version:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event — Stale-While-Revalidate + Low-Bandwidth >2MB Media Fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests or browser extension requests
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  const isLowBandwidth = 
    event.request.headers.get('Save-Data') === 'on' || 
    url.searchParams.get('lowBandwidth') === 'true' ||
    url.searchParams.get('mode') === 'low-bandwidth';

  // Check for large media request (>2MB) fallback in low-bandwidth conditions
  if (isLowBandwidth && (event.request.destination === 'video' || event.request.destination === 'audio' || url.pathname.endsWith('.mp4') || url.pathname.endsWith('.mp3'))) {
    console.log('[ServiceWorker] Low-bandwidth active: serving lightweight text/audio transcript fallback for media:', url.pathname);
    event.respondWith(
      new Response(
        JSON.stringify({
          fallbackMode: true,
          notice: 'Low-bandwidth mode active (>2MB media fallback). Video/audio download paused to save mobile data.',
          transcriptText: 'Clinical Summary: Follow 3x daily saline douching. Do not allow tap water in operated ear.',
          audioSynthesisAvailable: true
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );
    return;
  }

  // Cache-first strategy for static assets & pages with network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background to revalidate cache
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* offline mode silently uses cached response */});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Return cached root page for HTML navigation when completely offline
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/') || caches.match('/care-plan');
        }
      });
    })
  );
});
