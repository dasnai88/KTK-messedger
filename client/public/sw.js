self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

function normalizePushPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      title: 'New notification',
      body: '',
      url: '/',
      conversationId: null,
      messageId: null,
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
    tag: typeof payload.tag === 'string' ? payload.tag : 'default-notification',
    icon: typeof payload.icon === 'string' ? payload.icon : undefined,
    badge: typeof payload.badge === 'string' ? payload.badge : undefined,
    skipWhenVisible: payload.skipWhenVisible !== false
  }
}

self.addEventListener('push', (event) => {
  let payload = null
  try {
    payload = event.data ? event.data.json() : null
  } catch (err) {
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
        messageId: data.messageId
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
        conversationId: notificationData.conversationId || null,
        messageId: notificationData.messageId || null
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
