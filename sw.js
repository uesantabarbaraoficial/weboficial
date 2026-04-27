/**
 * SIGAE - SERVICE WORKER (PWA)
 * Gestiona la instalación de la app y el caché básico.
 */

const CACHE_NAME = 'sigae-cache-v1';

// Archivos básicos que la app guardará en la memoria del teléfono/PC para arrancar rápido
const urlsToCache = [
  './',
  './index.html',
  './css/principal.css',
  './assets/img/logo.png',
  './assets/img/logoMPPE.png'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caché abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Estrategia: Red primero, Caché como respaldo (Network First).
// Esto asegura que siempre veas los últimos cambios que programamos si tienes internet.
self.addEventListener('fetch', event => {
  // Ignorar las peticiones al servidor de Google Apps Script para no interferir con la BD
  if (event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si hay internet, devolvemos el archivo fresco
        return response;
      })
      .catch(() => {
        // Si falla (no hay internet o tarda mucho), buscamos en el caché
        return caches.match(event.request);
      })
  );
});

// Limpieza de cachés antiguos si actualizamos la versión
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});