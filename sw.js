/* Service worker - Lector de Contadores. Guarda la app para abrirla sin conexión.
   Al publicar una versión nueva, cambiá el número de CACHE para forzar la actualización. */
var CACHE = "contadores-v2.7";
var ARCHIVOS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ARCHIVOS); }));
  self.skipWaiting();
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; })
        .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

/* Responde desde el caché (rápido y sin conexión) y actualiza en segundo plano */
self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if(url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, {ignoreSearch:true}).then(function(hit){
      var red = fetch(e.request).then(function(resp){
        if(resp && resp.status === 200){
          var copia = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copia); });
        }
        return resp;
      }).catch(function(){ return hit || caches.match("./index.html"); });
      return hit || red;
    })
  );
});
