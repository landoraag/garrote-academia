/* Service worker: abre o app na hora, a partir do cache, e atualiza em segundo plano.
   Não mexe nas chamadas do Firebase (login e banco de dados): só nos arquivos do app, fontes e SDK.
   Também mostra os avisos do treino (fim do descanso etc.), mesmo com o app em segundo plano. */
const CACHE = 'garrote-v19';
const SHELL = ['index.html', 'css/styles.css', 'js/main.js', 'js/api.js', 'js/aluno.js', 'js/painel.js', 'js/perfil.js', 'js/plano.js', 'js/ui.js', 'js/notif.js', 'js/firebase-config.js', 'assets/logo.png', 'assets/favicon.png', 'assets/icon-180.png', 'manifest.webmanifest'];
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
  if (same && url.pathname.endsWith('.mp4')) return;   // vídeo: o navegador pede em pedaços (Range); passar direto evita travar no iPhone
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

/* ---------- avisos do treino ---------- */
const timers = new Map();   // tag -> { t, done }
const visivel = async () => (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).some(c => c.visibilityState === 'visible');
const opts = (d, extra = {}) => ({ body: d.body || '', tag: 'garrote-treino',   // um aviso só, que vai sendo atualizado
  icon: 'assets/icon-192.png', badge: 'assets/icon-192.png', data: { url: d.url }, ...extra });
function cancelar(tag) { const x = timers.get(tag); if (x) { clearTimeout(x.t); timers.delete(tag); x.done(); } }

self.addEventListener('message', e => {
  const d = e.data; if (!d || typeof d !== 'object') return;
  if (d.type === 'agendar') {
    cancelar(d.tag);
    /* o waitUntil mantém o service worker acordado até a hora do aviso (descansos e séries duram poucos minutos) */
    e.waitUntil(new Promise(done => {
      const t = setTimeout(async () => {
        timers.delete(d.tag);
        try { if (!(await visivel())) await self.registration.showNotification(d.title, opts(d, { renotify: true, requireInteraction: false, vibrate: [300, 120, 300] })); } catch {}
        done();
      }, Math.max(0, d.at - Date.now()));
      timers.set(d.tag, { t, done });
    }));
  } else if (d.type === 'cancelar') cancelar(d.tag);
  else if (d.type === 'mostrar') e.waitUntil(self.registration.showNotification(d.title, opts(d, { silent: true, renotify: false })).catch(() => {}));
  else if (d.type === 'limpar') e.waitUntil(self.registration.getNotifications().then(ns => ns.forEach(n => n.close())).catch(() => {}));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const c = cs.find(x => x.url.startsWith(self.registration.scope)) || cs[0];
    if (c) { await c.focus(); try { await c.navigate(url); } catch {} return; }
    await self.clients.openWindow(url);
  })());
});
