const CACHE_NAME = 'rotina-arthur-v3';

const ARQUIVOS_PARA_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/app.js',
  './js/storage.js',
  './js/historico.js',
  './js/ui.js',
  './icon.png',
  './icon-72.png',
  './icon-96.png',
  './icon-128.png',
  './icon-144.png',
  './icon-152.png',
  './icon-192.png'
];

// Instala o service worker e guarda os arquivos no cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ARQUIVOS_PARA_CACHE);
    })
  );
  self.skipWaiting();
});

// Remove caches antigos quando uma nova versão é ativada
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) => {
      return Promise.all(
        nomes
          .filter((nome) => nome !== CACHE_NAME)
          .map((nome) => caches.delete(nome))
      );
    })
  );
  self.clients.claim();
});

// Serve do cache primeiro, e busca na rede como reserva
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((respostaCache) => {
      return respostaCache || fetch(event.request).then((respostaRede) => {
        // Atualiza o cache com a versão mais recente, se a rede responder
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, respostaRede.clone());
          return respostaRede;
        });
      }).catch(() => respostaCache);
    })
  );
});
