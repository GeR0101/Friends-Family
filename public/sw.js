// Service worker for Hello Tropics — lock-screen push notifications.

// Activate immediately so the very first load is controlled — Chrome on Android
// only treats the site as an installable PWA once a service worker with a fetch
// handler is active.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Minimal pass-through fetch handler. Required for installability; we don't cache
// anything (the app needs the network), we just let requests go through.
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Hello Tropics", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Hello Tropics";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || undefined,
    renotify: !!data.tag,
    // Make it an actual "signal": play the device notification sound (not
    // silent) and vibrate on Android. A custom sound file isn't supported by
    // web push — the tone itself comes from the OS notification channel.
    silent: false,
    vibrate: [200, 100, 200],
    data: { url: data.url || "/dashboard" },
  };

  const tasks = [self.registration.showNotification(title, options)];
  // Reflect the unread total on the app icon (iOS 16.4+ / Android installed PWA).
  if (typeof data.badge === "number" && self.navigator && self.navigator.setAppBadge) {
    tasks.push(
      data.badge > 0
        ? self.navigator.setAppBadge(data.badge).catch(() => {})
        : self.navigator.clearAppBadge().catch(() => {})
    );
  }
  event.waitUntil(Promise.all(tasks));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus an existing tab if one is open, otherwise open a new one.
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
