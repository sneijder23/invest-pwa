// Офлайн-кэш «Аналитики инвестиций».
// Страница — сначала из сети (чтобы обновления приходили сразу), без сети — из кэша.
// Иконки и шрифты — из кэша. Запросы к Мосбирже, брокерам и ИИ не кэшируются.
const CACHE = "pf-shell-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png", "./favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("pf-") && k !== CACHE && k !== "pf-fonts").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin){
    if (req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html")){
      e.respondWith((async () => {
        try {
          const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 5000);
          const r = await fetch(req, { signal: ctl.signal, cache: "no-cache" }); clearTimeout(t);
          if (r.ok){ const c = await caches.open(CACHE); c.put("./index.html", r.clone()); }
          return r;
        } catch { return (await caches.match("./index.html")) || (await caches.match("./")) || Response.error(); }
      })());
      return;
    }
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok){ const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; })));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith(caches.open("pf-fonts").then(async c => { const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net; }));
  }
});
