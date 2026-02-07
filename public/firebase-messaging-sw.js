// Firebase Cloud Messaging Service Worker
// This runs in the background to receive push notifications

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: self.__FIREBASE_API_KEY || '',
  authDomain: self.__FIREBASE_AUTH_DOMAIN || '',
  projectId: self.__FIREBASE_PROJECT_ID || '',
  storageBucket: self.__FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID || '',
  appId: self.__FIREBASE_APP_ID || '',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = payload.notification?.title || 'Eingehender Anruf';
  const body = payload.notification?.body || 'Jemand möchte dich anrufen!';

  const notificationOptions = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'family-call',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      callId: data.callId || '',
      roomUrl: data.roomUrl || '',
      kidName: data.kidName || '',
    },
    actions: [
      { action: 'accept', title: 'Annehmen' },
      { action: 'decline', title: 'Ablehnen' },
    ],
  };

  return self.registration.showNotification(title, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};

  if (event.action === 'decline') {
    // Decline: just close
    if (data.callId) {
      fetch('/api/call', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: data.callId, status: 'DECLINED' }),
      }).catch(() => {});
    }
    return;
  }

  // Accept or click: open parent page
  const urlToOpen = '/parent';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if available
      for (const client of windowClients) {
        if (client.url.includes('/parent') && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(urlToOpen);
    })
  );
});
