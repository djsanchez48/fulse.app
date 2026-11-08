const CACHE_NAME = "fulse-v2";

const PRECACHE_URLS = [
  "/",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  // Una por una y tolerando fallos: addAll rechaza entero si alguna URL redirige
  // —"/" lo hace cuando no hay sesion— y eso aborta la instalacion del SW,
  // dejando el cache vacio.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(PRECACHE_URLS.map((url) => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (request.destination === "font" || request.destination === "image") {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return res;
          }),
      ),
    );
    return;
  }

  if (request.destination === "document") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }
});
