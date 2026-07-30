const CACHE_VERSION = "vitals-v1";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/tokens.css",
  "./css/base.css",
  "./css/components.css",
  "./js/main.js",
  "./js/db.js",
  "./js/ui.js",
  "./js/nav.js",
  "./js/icons.js",
  "./js/utils.js",
  "./js/charts.js",
  "./js/views/home.js",
  "./js/views/goals.js",
  "./js/views/calorieMacro.js",
  "./js/views/foodLogging.js",
  "./js/views/weightTracking.js",
  "./js/views/progressViz.js",
  "./js/views/activity.js",
  "./js/views/water.js",
  "./js/views/micronutrients.js",
  "./js/views/reminders.js",
  "./js/views/dataExport.js",
  "./js/views/settings.js",
  "./js/views/profile.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/icon-32.png",
  "./icons/icon-16.png",
];

self.addEventListener("install", (event)=>{
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event)=>{
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event)=>{
  const req = event.request;
  if(req.method !== "GET") return;

  // Navigation requests: try network first, fall back to cached shell.
  if(req.mode === "navigate"){
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Static assets: cache-first, update cache in background.
  event.respondWith(
    caches.match(req).then(cached=>{
      const network = fetch(req).then(res=>{
        if(res && res.status === 200 && res.type === "basic"){
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(req, clone));
        }
        return res;
      }).catch(()=>cached);
      return cached || network;
    })
  );
});
