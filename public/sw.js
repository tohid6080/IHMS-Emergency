// IHMS Emergency — Service Worker (PWA installability + basic offline shell)
const CACHE = 'ihms-v1'
const SHELL = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  // فقط GET و همان مبدا
  if (e.request.method !== 'GET' || url.origin !== location.origin) return
  // APIها همیشه از شبکه
  if (url.pathname.startsWith('/api/')) return
  // سایر منابع: cache-first با به‌روزرسانی پس‌زمینه
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(e.request, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || fetched
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(clients.matchAll({ type: 'window' }).then((list) => (list[0] ? list[0].focus() : clients.openWindow('/'))))
})
