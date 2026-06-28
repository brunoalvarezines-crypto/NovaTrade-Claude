// Service worker deliberadamente mínimo: solo existe para que el navegador
// permita "Instalar app" / añadir a pantalla de inicio. No cachea nada,
// para no servir nunca precios, noticias o respuestas del agente obsoletos.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
