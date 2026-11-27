/* service worker do app JARVIS: guarda a "casca" do app para abrir rÃ¡pido; dados (clima, cotaÃ§Ãµes, notÃ­cias) vÃªm sempre da rede */
const CACHE = 'jarvis-v5';
const CASCA = ['jarvis.html', 'css/jarvis.css', 'js/jarvis-core.js', 'js/jarvis-ui.js', 'manifest.webmanifest', 'img/jarvis-192.png', 'img/jarvis-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CASCA)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // APIs externas: sempre rede
  // rede primeiro (versÃ£o nova quando houver), cache se estiver offline
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
