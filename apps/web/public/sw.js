/**
 * Velluma Service Worker — Web Push handler
 *
 * Responsibilities:
 *  1. Receive push events and show browser notifications.
 *  2. Handle notification clicks — focus an existing tab or open a new one.
 *
 * This worker intentionally has no caching logic (Next.js handles that).
 */

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Velluma', body: event.data ? event.data.text() : '' };
  }

  const {
    title = 'Velluma',
    body = 'You have a new notification',
    icon = '/icons/icon-192.png',
    badge = '/icons/badge-72.png',
    url = '/dashboard',
    data = {},
  } = payload;

  const options = {
    body,
    icon,
    badge,
    data: { url, ...data },
    // Group notifications from the same origin so they stack neatly on Android
    tag: 'velluma-notification',
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? '/dashboard';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If the app is already open somewhere, focus that tab
        for (const client of windowClients) {
          if ('focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});
