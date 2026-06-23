const CACHE_NAME = 'rotina-arthur-v6';

const ARQUIVOS = [
  './', './index.html', './style.css', './manifest.json',
  './js/app.js', './js/storage.js', './js/historico.js', './js/ui.js',
  './js/tarefas.js', './js/calendario.js', './js/exportar.js',
  './js/confetti.js', './js/grafico.js', './js/notificacoes.js',
  './icon.png', './icon-72.png', './icon-96.png',
  './icon-128.png', './icon-144.png', './icon-152.png', './icon-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(resp => {
        return caches.open(CACHE_NAME).then(c => {
          c.put(e.request, resp.clone());
          return resp;
        });
      }).catch(() => cached);
    })
  );
});
