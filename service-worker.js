async function cacheStaticAssets() {
  const cache = await caches.open("static_assets");
  return cache.addAll(["/index.html", "/favicon.svg", "/index.js"]);
}

async function matchCache(request) {
  const cache = await caches.open("static_assets");
  try {
    const networkResponse = await fetch(request);
    if (networkResponse) {
      return networkResponse;
    }
  } catch (err) {}
  return cache.match(request);
}

async function init() {
  await cacheStaticAssets();
}

self.addEventListener("install", function (event) {
  event.waitUntil(init());
});

self.addEventListener("fetch", function (event) {
  event.respondWith(matchCache(event.request));
});
