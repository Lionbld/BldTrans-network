self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Le service worker est actif mais laisse passer toutes les requêtes.
  // Cela satisfait les critères des PWA pour autoriser l'installation (A2HS).
});
