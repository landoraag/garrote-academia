/* Service worker: abre o app na hora, a partir do cache, e atualiza em segundo plano.
   Não mexe nas chamadas do Firebase (login e banco de dados): só nos arquivos do app, fontes e SDK. */
const CACHE = 'garrote-v1';
const SHELL = ['index.html', 'css/styles.css', 'js/main.js', 'js/api.js', 'js/aluno.js', 'js/painel.js', 'js/perfil.js', 'js/plano.js', 'js/ui.js', 'js/firebase-config.js', 'assets/logo.png', 'assets/favicon.png', 'assets/icon-180.png', 'manifest.webmanifest'];
const FIXED = h => h === 'www.gstatic.com' || h === 'fonts.googleapis.com' || h === 'fonts.gstatic.com';   // versões fixas: cache primeiro

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function avisar() { (await self.clients.matchAll()).forEach(c => c.postMessage('update')); }

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url), same = url.origin === location.origin;
  if (!same && !(FIXED(url.hostname) && (url.hostname !== 'www.gstatic.com' || url.pathname.startsWith('/firebasejs/')))) return;
  const key = req.mode === 'navigate' ? new Request(new URL('index.html', self.registration.scope).href) : req;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE), hit = await cache.match(key, { ignoreSearch: same });
    if (hit && !same) return hit;
    const net = fetch(req.mode === 'navigate' ? key : req).then(async r => {
      if (r && (r.ok || r.type === 'opaque')) {
        const old = hit && hit.headers.get('etag'), now = r.headers.get('etag');
        await cache.put(key, r.clone());
        if (hit && old && now && old !== now) avisar();
      }
      return r;
    });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  })());
});
