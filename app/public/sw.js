self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {}
  const title = payload.title || 'ACOES'
  const options = {
    body: payload.body || 'Tienes una nueva notificación.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data || {},
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/#/dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client) {
            client.navigate(targetUrl)
          }
          return
        }
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})
