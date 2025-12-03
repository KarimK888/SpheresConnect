self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open("spheraconnect-shell-v1")
      .then((cache) => cache.addAll(["/"]).catch(() => undefined))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !["spheraconnect-shell-v1", "spheraconnect-api-v1"].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

const cacheFirst = async (request) => {
  const cache = await caches.open("spheraconnect-shell-v1");
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
};

const networkFirst = async (request) => {
  const cache = await caches.open("spheraconnect-api-v1");
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname === "/") {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
  }
});
