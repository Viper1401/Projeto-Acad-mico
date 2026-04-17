/* =====================================================
   Finanças Fácil — Service Worker (Cache Offline)
   Versão: 2.0
   Descrição: Permite uso offline e instalação como PWA.
   ===================================================== */

const NOME_CACHE   = 'financas-facil-v2';
const ARQUIVOS     = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './particulas.js',
  './manifest.json',
];

/* Instalação: armazena os arquivos principais em cache */
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(NOME_CACHE)
      .then((cache) => cache.addAll(ARQUIVOS))
      .then(() => self.skipWaiting())
      .catch((erro) => console.warn('[SW] Erro ao criar cache:', erro))
  );
});

/* Ativação: remove caches antigos de versões anteriores */
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(
        chaves
          .filter((chave) => chave !== NOME_CACHE)
          .map((chave) => caches.delete(chave))
      )
    ).then(() => self.clients.claim())
  );
});

/* Requisições: retorna do cache se disponível, senão busca na rede */
self.addEventListener('fetch', (evento) => {
  /* Ignora requisições não-GET e de extensões do browser */
  if (evento.request.method !== 'GET') return;

  evento.respondWith(
    caches.match(evento.request).then((respostaCacheid) => {
      if (respostaCacheid) return respostaCacheid;

      return fetch(evento.request)
        .then((respostaRede) => {
          /* Armazena novas respostas bem-sucedidas no cache */
          if (respostaRede && respostaRede.status === 200 && respostaRede.type === 'basic') {
            const copiaResposta = respostaRede.clone();
            caches.open(NOME_CACHE).then((cache) => {
              cache.put(evento.request, copiaResposta);
            });
          }
          return respostaRede;
        })
        .catch(() => {
          /* Offline: retorna o index.html como fallback */
          return caches.match('./index.html');
        });
    })
  );
});
