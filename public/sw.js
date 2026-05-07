/**
 * SecureChat Service Worker
 * Handles push notifications and background sync
 * No message content stored - only notification triggers
 */

const CACHE_NAME = 'securechat-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/assets/index.js'
]

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  
  // Never show message content in notification
  // Only show that there is a new message
  const title = 'SecureChat'
  const options = {
    body: data.fromUsername 
      ? `Новое сообщение от ${data.fromUsername}`
      : 'Новое зашифрованное сообщение',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.chatId || 'new-message',
    requireInteraction: false,
    silent: false,
    data: {
      chatId: data.chatId,
      from: data.from,
      // No message content stored here
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const chatId = event.notification.data?.chatId
  const url = chatId 
    ? `/?connect=${chatId}`
    : '/'
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Background sync for offline message sending
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-message') {
    event.waitUntil(
      // Client will handle actual sending when online
      clients.matchAll().then((clients) => {
        clients.forEach(client => {
          client.postMessage({ type: 'SYNC_PENDING_MESSAGES' })
        })
      })
    )
  }
})

// Fetch handler for offline support
self.addEventListener('fetch', (event) => {
  // Only cache GET requests for static assets
  if (event.request.method !== 'GET') return
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request).then((fetchResponse) => {
        // Don't cache API calls or dynamic content
        if (!event.request.url.includes('/api/') && !event.request.url.includes('socket.io')) {
          const cacheCopy = fetchResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy)
          })
        }
        return fetchResponse
      })
    }).catch(() => {
      // Offline fallback
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html')
      }
    })
  )
})
