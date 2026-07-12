// Офлайн-режим: при установке кэшируем всё приложение,
// дальше — сеть в приоритете, кэш как запасной вариант.
// При изменении файлов увеличить VERSION, чтобы кэш обновился.
const VERSION = 'quest-v2';

const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/tokens.css',
  'css/app.css',
  'js/app.js',
  'js/state.js',
  'js/engine.js',
  'js/map.js',
  'js/character.js',
  'js/task.js',
  'js/draw.js',
  'js/profile.js',
  'js/parent.js',
  'content/subjects.json',
  'content/math.json',
  'content/russian.json',
  'content/reading.json',
  'content/world.json',
  'content/rewards.json',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/apple-touch-icon-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // обновляем кэш свежим ответом со своего домена
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
