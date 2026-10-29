importScripts('data.js', 'tables.js');
const CACHE = 'irpg-' + self.DATA_VERSION + '-v11';
const IMAGES = [...new Set([...self.SECTIONS.flatMap(s => s.images || []), ...Object.values(self.TABLES).flat().flatMap(b => b.images || [])])];
const ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'medform.js', 'data.js', 'tables.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/logo.png', ...IMAGES];
// 'reload' / 'no-cache' bypass the browser's HTTP cache, so a new release never mixes with stale copies of other files.
self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE).then(c => Promise.all(ASSETS.map(u => c.add(new Request(u, { cache: 'reload' }))))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request.url, { cache: 'no-cache' }).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request).then(m => m || caches.match('index.html'))));
});
