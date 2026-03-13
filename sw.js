const CACHE_NAME = "vr-gallery-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/vr-gallery-icon.svg",
  "./assets/vr-gallery-icon-192.png",
  "./assets/vr-gallery-icon-512.png",
];

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: "reload" })));
}

async function putInCache(request, response) {
  if (!response || (!response.ok && response.type !== "opaque")) return response;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    cacheAppShell().then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Avoid interfering with audio playback requests, which can be sensitive to
  // caching/response corruption in some browsers (e.g. Quest Browser).
  if (request.destination === "audio" || request.url.endsWith(".m4a") || request.url.endsWith(".mp3") || request.url.endsWith(".ogg")) {
    return;
  }

  const url = new URL(request.url);
  const shouldHandle = request.mode === "navigate" || url.origin === self.location.origin || url.origin === "https://unpkg.com";
  if (!shouldHandle) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);

      if (request.mode === "navigate") {
        try {
          const fresh = await fetch(request);
          await putInCache("./index.html", fresh.clone());
          return fresh;
        } catch (error) {
          return cached || (await cache.match("./index.html"));
        }
      }

      if (cached) {
        fetch(request)
          .then((response) => putInCache(request, response))
          .catch(() => {});
        return cached;
      }

      try {
        const fresh = await fetch(request);
        return await putInCache(request, fresh);
      } catch (error) {
        return cached || Response.error();
      }
    })()
  );
});
