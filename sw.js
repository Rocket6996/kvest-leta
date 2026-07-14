// Офлайн-режим: при установке кэшируем всё приложение,
// дальше — сеть в приоритете, кэш как запасной вариант.
// При изменении файлов увеличить VERSION, чтобы кэш обновился.
const VERSION = 'quest-v17';

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
  'js/room.js',
  'js/hero.js',
  'js/book.js',
  'content/subjects.json',
  'content/math.json',
  'content/russian.json',
  'content/reading.json',
  'content/world.json',
  'content/rewards.json',
  'content/books.json',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/apple-touch-icon-180.png',
];

self.addEventListener('install', (e) => {
  // каждый файл кэшируем отдельно: один сбойный не рушит всю установку
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(ASSETS.map((a) => c.add(a).catch(() => {})));
    await self.skipWaiting();
  })());
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
  e.respondWith((async () => {
    try {
      const res = await fetch(e.request);
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
      }
      return res;
    } catch {
      const cached = await caches.match(e.request, { ignoreSearch: true });
      if (cached) return cached;
      // навигация без сети и без своей копии страницы → отдаём стартовую
      if (e.request.mode === 'navigate') {
        return (await caches.match('index.html')) || (await caches.match('./')) || Response.error();
      }
      return Response.error();
    }
  })());
});
