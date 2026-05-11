// NoteFlow previously shipped a cache-first service worker that could keep serving
// an old index.html forever during local development. This file intentionally
// unregisters that service worker and clears all NoteFlow caches.

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((name) => caches.delete(name))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then((clients) => {
        clients.forEach((client) => {
          client.navigate(client.url);
        });
      })
  );
});

self.addEventListener('fetch', () => {
  // Do not intercept requests. The browser should load files directly from disk
  // or from the local Python server.
});
