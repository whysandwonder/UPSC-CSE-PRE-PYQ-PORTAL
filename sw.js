/* UPSC PYQ portal service worker: keeps a full offline copy; built 202610221826 */
const CACHE = 'upsc-pyq-202610221826';
const ASSETS = [
 "./",
 "./index.html",
 "./manifest.webmanifest",
 "./icon-192.png",
 "./icon-512.png",
 "./icon-maskable-512.png",
 "./apple-touch-icon.png",
 "./style.css?v=20261022h",
 "./app.js?v=20261022g",
 "./data/pyq-1.js?v=202610221826",
 "./data/pyq-2.js?v=202610221826",
 "./data/pyq-3.js?v=202610221826",
 "./data/pyq-4.js?v=202610221826"
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('upsc-pyq-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* The page: network first, so a new upload shows on the next open; the saved copy when offline.
   Scripts, styles and icons: their names carry the build number, so the saved copy is always right. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { if (res.ok) caches.open(CACHE).then(c => c.put('./index.html', res.clone())); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
