"use client";

import { useEffect } from "react";

// Registers the service worker on first load so the app is an installable PWA on
// Android (Chrome requires an active SW with a fetch handler at install time).
// Notification opt-in re-uses the same /sw.js registration later.
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration is best-effort; the app still works without it.
    });
  }, []);
  return null;
}
