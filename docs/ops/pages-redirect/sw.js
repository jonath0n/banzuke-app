// Replaces the app's service worker on the old github.io address. Browsers that
// installed the old one fetch this on their next visit; it clears the old caches,
// unregisters itself and reloads its pages, which then meet the redirect.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key)
      await self.registration.unregister()
      for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url)
    })()
  )
})
