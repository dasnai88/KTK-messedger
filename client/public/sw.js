const APP_SHELL_CACHE = 'ktk-app-shell-v4'
const APP_SHELL_URLS = [
  '/manifest.webmanifest',
  '/pwa-icon.svg',
  '/pwa-maskable.svg',
  '/pwa-badge.svg'
]

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_SHELL_CACHE)
    await Promise.all(APP_SHELL_URLS.map(async (url) => {
      try {
        await cache.add(new Request(url, { cache: 'reload' }))
      } catch (_err) {
        // ignore cache priming errors
      }
    }))
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => {
      if (key !== APP_SHELL_CACHE) {
        return caches.delete(key)
      }
      return Promise.resolve(false)
    }))
    await self.clients.claim()
  })())
})

function normalizePushPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      title: 'New notification',
      body: '',
      url: '/',
      conversationId: null,
      messageId: null,
      postId: null,
      username: null,
      settingsSection: null,
      openComments: false,
      tag: 'default-notification',
      skipWhenVisible: true
    }
  }
  return {
    title: typeof payload.title === 'string' ? payload.title : 'New notification',
    body: typeof payload.body === 'string' ? payload.body : '',
    url: typeof payload.url === 'string' && payload.url.trim() ? payload.url.trim() : '/',
    conversationId: typeof payload.conversationId === 'string' ? payload.conversationId : null,
    messageId: typeof payload.messageId === 'string' ? payload.messageId : null,
    postId: typeof payload.postId === 'string' ? payload.postId : null,
    username: typeof payload.username === 'string' ? payload.username : null,
    settingsSection: typeof payload.settingsSection === 'string' ? payload.settingsSection : null,
    openComments: payload.openComments === true,
    tag: typeof payload.tag === 'string' ? payload.tag : 'default-notification',
    icon: typeof payload.icon === 'string' ? payload.icon : undefined,
    badge: typeof payload.badge === 'string' ? payload.badge : undefined,
    skipWhenVisible: payload.skipWhenVisible !== false
  }
}

async function cacheShellAsset(request) {
  const cache = await caches.open(APP_SHELL_CACHE)
  const cached = await cache.match(request)
  if (cached) {
    void fetch(request).then((response) => {
      if (response && response.ok) {
        return cache.put(request, response.clone())
      }
      return null
    }).catch(() => {})
    return cached
  }
  const response = await fetch(request)
  if (response && response.ok) {
    await cache.put(request, response.clone())
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (!request || request.method !== 'GET') return

  const url = new URL(request.url)
  const isShellAsset = url.origin === self.location.origin && APP_SHELL_URLS.includes(url.pathname)

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(APP_SHELL_CACHE)
      try {
        const response = await fetch(request)
        if (response && response.ok) {
          await cache.put('/', response.clone())
        }
        return response
      } catch (_err) {
        return cache.match('/') || Response.error()
      }
    })())
    return
  }

  if (isShellAsset) {
    event.respondWith(cacheShellAsset(request))
  }
})

self.addEventListener('push', (event) => {
  let payload = null
  try {
    payload = event.data ? event.data.json() : null
  } catch (_err) {
    payload = null
  }

  const data = normalizePushPayload(payload)

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const hasVisibleClient = clients.some((client) => client.visibilityState === 'visible')
    if (hasVisibleClient && data.skipWhenVisible) return

    await self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      renotify: true,
      data: {
        url: data.url,
        conversationId: data.conversationId,
        messageId: data.messageId,
        postId: data.postId,
        username: data.username,
        settingsSection: data.settingsSection,
        openComments: data.openComments
      },
      vibrate: [120, 40, 120]
    })
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const notificationData = event.notification.data || {}
  const url = notificationData.url || '/'

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clients) {
      client.postMessage({
        type: 'push-open',
        url,
        conversationId: notificationData.conversationId || null,
        messageId: notificationData.messageId || null,
        postId: notificationData.postId || null,
        username: notificationData.username || null,
        settingsSection: notificationData.settingsSection || null,
        openComments: notificationData.openComments === true
      })
      if ('focus' in client) {
        await client.focus()
        return
      }
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(url)
    }
  })())
})
