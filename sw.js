/* Guarda el sitio para abrirlo sin conexión. Con conexión siempre usa la versión más reciente. */
const CACHE = "pandeo-v1";
const ARCHIVOS = ["./", "index.html", "simulador.html", "teoria.html", "css/styles.css", "js/calc.js", "js/site.js", "js/home.js", "js/sim.js", "js/plotly-basic.min.js",
  "fonts/archivo.woff2", "fonts/source-sans-3.woff2", "fonts/jetbrains-mono.woff2", "favicon.svg", "manifest.webmanifest"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("pandeo-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && !url.search) { const c = r.clone(); e.waitUntil(caches.open(CACHE).then(k => k.put(e.request, c))); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || Response.error())));
});
