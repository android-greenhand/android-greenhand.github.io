const CACHE_NAME = "flutter-app-cache-v1";

self.addEventListener("install", function(event) {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log("Service Worker cache opened");
      return cache;
    })
  );
});

self.addEventListener("activate", function(event) {
  console.log("Service Worker activating...");
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", function(event) {
  // 跳过 chrome-extension 和其他不支持的协议
  if (event.request.url.startsWith("chrome-extension://") || 
      event.request.url.startsWith("chrome://") ||
      event.request.url.startsWith("moz-extension://") ||
      event.request.url.startsWith("safari-extension://")) {
    return;
  }
  
  // 跳过 CanvasKit 资源，让它们直接从 CDN 加载
  if (event.request.url.includes("gstatic.com/flutter-canvaskit") ||
      event.request.url.includes("canvaskit.js") ||
      event.request.url.includes("canvaskit.wasm")) {
    return;
  }
  
  // 只处理同源请求
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) {
        return response;
      }
      
      return fetch(event.request).then(function(response) {
        // 只缓存成功的响应
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      }).catch(function(error) {
        console.error("Fetch failed:", error);
        return new Response("Network error", { status: 503 });
      });
    })
  );
});
