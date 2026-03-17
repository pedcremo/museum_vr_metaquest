// Bump cache name when changing service worker logic to force clients to update.
const CACHE_NAME = "vr-gallery-shell-v4";
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

  // Avoid interfering with audio and video playback requests, and any
  // requests using `Range` headers (partial content). Range requests are
  // commonly used by media players and can break if intercepted by the
  // service worker. Let the browser handle them directly.
  if (
    request.destination === "audio" ||
    request.destination === "video" ||
    request.url.endsWith(".m4a") ||
    request.url.endsWith(".mp3") ||
    request.url.endsWith(".ogg") ||
    request.url.endsWith(".mp4") ||
    request.url.endsWith(".webm")
  ) {
    return;
  }

  // Bypass the service worker for requests that include a Range header.
  // Range requests are used to stream or resume media and should go to network.
  if (request.headers && request.headers.get && request.headers.get("range")) {
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
