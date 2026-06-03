const CACHE_NAME = 'freelancehub-v5';
const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.webmanifest',
  '/app-icon.svg',
  '/js/utils.js',
  '/js/store.js',
  '/js/config.js',
  '/js/cloud.js',
  '/js/notifications.js',
  '/js/pwa.js',
  '/js/audio.js',
  '/js/dnd.js',
  '/js/pages/dashboard.js',
  '/js/pages/calendar.js',
  '/js/pages/tasks.js',
  '/js/pages/projects.js',
  '/js/pages/time.js',
  '/js/pages/habits.js',
  '/js/pages/journal.js',
  '/js/pages/stats.js',
  '/js/pages/finance.js',
  '/js/pages/settings.js',
  '/js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache =>
    cache.addAll(APP_SHELL)
      .then(() => cache.add('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.106.2').catch(() => {}))
  ));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(response || caches.match('/index.html')))
  );
});
