// Service worker: makes the app installable + usable offline.
// It caches only the app's own files — never your bill data.
//
// Strategy:
//   • The page/HTML uses NETWORK-FIRST, so you always get the latest version
//     when online, and fall back to the cached copy only when offline.
//   • Other assets (icons, OCR library) use CACHE-FIRST for speed/offline.
const CACHE = 'split-bill-v16';
const ASSETS = [
  '.',
  'index.html',
  'manifest.webmanifest',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const isPage = req.mode === 'navigate' || req.destination === 'document';

  if (isPage) {
    // Network-first: always try to get the freshest page, cache it, fall back offline.
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('index.html') || caches.match('.')))
    );
    return;
  }

  // Cache-first for everything else.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
