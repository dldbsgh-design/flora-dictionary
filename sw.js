// Service worker: lets the dictionary open offline once it has been opened online.
// Pages, code and data: network first (new content shows up at once), the saved copy when offline.
// Photos and fonts: the saved copy first (they never change), fetched once and kept.
const CACHE = "dictionary-v1";
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "css/paper.css",
  "js/app.js", "js/logic.js", "js/parts.js", "js/render.js", "js/study.js",
  "data/vocab.json", "data/flowers.json", "data/scents.json", "data/italian.json",
  "data/lessons.json", "data/howto.json", "data/coding.json", "data/routine.json",
  "icons/icon-192.png", "icons/apple-touch-icon.png",
];
const WAIT_MS = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function keep(request, response) {
  if (response && (response.ok || response.type === "opaque")) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function savedFirst(request) {
  const saved = await caches.match(request);
  return saved || keep(request, await fetch(request));
}

async function networkFirst(request) {
  const saved = caches.match(request, { ignoreSearch: true });
  const fresh = fetch(request).then((res) => keep(request, res));
  const timeout = new Promise((resolve) => setTimeout(resolve, WAIT_MS));
  try {
    const first = await Promise.race([fresh, timeout.then(() => saved)]);
    if (first) return first;
    return await fresh;
  } catch {
    const fallback = (await saved) || (request.mode === "navigate" ? await caches.match("./") : null);
    if (fallback) return fallback;
    throw new Error(`offline and not saved: ${request.url}`);
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const font = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== self.location.origin && !font) return;
  const lasting = font || url.pathname.includes("/images/") || url.pathname.includes("/icons/");
  event.respondWith(lasting ? savedFirst(request) : networkFirst(request));
});

// The page sends every photo path; save the ones not saved yet, one at a time, in the background.
self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "keep") return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const url of event.data.urls || []) {
      if (await cache.match(url)) continue;
      try { await keep(url, await fetch(url)); } catch { /* try again next visit */ }
    }
  })());
});
