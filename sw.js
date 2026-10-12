/* Service worker - Lector de Contadores. Guarda la app para abrirla sin conexión.
   La página principal se pide primero al servidor (así cada versión nueva se ve enseguida)
   y, si no hay conexión, se abre la copia guardada. */
var CACHE = "contadores-v4.0.1";
var ARCHIVOS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ARCHIVOS); }));
  self.skipWaiting();
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

function guardar(req, resp){
  if(resp && resp.status === 200){ var copia = resp.clone(); caches.open(CACHE).then(function(c){ c.put(req, copia); }); }
  return resp;
}

self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if(url.origin !== location.origin) return;
  if(/admin\.html$/.test(url.pathname)) return;   // el panel siempre se carga del servidor
  var esPagina = e.request.mode === "navigate" || /\/(index\.html)?$/.test(url.pathname);
  if(esPagina){
    // primero el servidor (hasta 5 s); sin conexión, la copia guardada
    e.respondWith(new Promise(function(ok){
      var listo = false;
      var tm = setTimeout(function(){ caches.match("./index.html").then(function(h){ if(h && !listo){ listo = true; ok(h); } }); }, 5000);
      fetch(e.request, {cache: "no-store"}).then(function(resp){ clearTimeout(tm); guardar(new Request("./index.html"), resp.clone()); if(!listo){ listo = true; ok(resp); } })
        .catch(function(){ clearTimeout(tm); caches.match("./index.html").then(function(h){ if(!listo){ listo = true; ok(h || Response.error()); } }); });
    }));
    return;
  }
  // resto de archivos: copia guardada y actualización en segundo plano
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(function(hit){
    var red = fetch(e.request).then(function(resp){ return guardar(e.request, resp); }).catch(function(){ return hit; });
    return hit || red;
  }));
});
