"use client";

import { useEffect, useState } from "react";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// VAPID public key (base64url) → Uint8Array for PushManager.subscribe.
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State =
  | "loading"
  | "unsupported"
  | "ios-needs-install"
  | "default"
  | "granted"
  | "denied"
  | "working";

function BellIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

export default function NotificationButton() {
  const [state, setState] = useState<State>("loading");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supported =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (!supported) {
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        // iOS only exposes Web Push once the app is installed to the Home Screen.
        setState(isIOS ? "ios-needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      setState(sub && Notification.permission === "granted" ? "granted" : "default");
    })();
  }, []);

  const getName = (): string | null => {
    try {
      return JSON.parse(localStorage.getItem("ff_user") || "{}").name ?? null;
    } catch {
      return null;
    }
  };

  const enable = async () => {
    setErr(null);
    if (!PUBLIC_KEY) {
      setErr("Benachrichtigungen sind serverseitig noch nicht eingerichtet (VAPID-Schlüssel fehlt).");
      return;
    }
    setState("working");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "default");
        if (perm !== "denied") setErr("Du hast die Berechtigung nicht erteilt.");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: getName(), subscription: sub }),
      });
      setState("granted");
    } catch (e) {
      setState("default");
      setErr("Hat nicht geklappt: " + (e instanceof Error ? e.message : "unbekannt"));
    }
  };

  const disable = async () => {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
          method: "DELETE",
        });
        await sub.unsubscribe();
      }
      setState("default");
    } catch {
      setState("granted");
    }
  };

  if (state === "loading" || state === "unsupported") return null;

  if (state === "ios-needs-install") {
    return (
      <div className="mb-5 flex items-start gap-3 rounded-3xl border border-violet-100 bg-violet-50 p-4">
        <span className="text-violet-500">
          <BellIcon />
        </span>
        <div>
          <p className="text-sm font-semibold text-violet-800">Benachrichtigungen am iPhone</p>
          <p className="mt-0.5 text-xs text-violet-700/80">
            Tippe unten auf „Teilen" und dann „Zum Home-Bildschirm". Danach kannst du hier
            Benachrichtigungen aktivieren.
          </p>
        </div>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="mb-5 flex items-start gap-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-black/5">
        <span className="text-gray-400">
          <BellIcon />
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-700">Benachrichtigungen blockiert</p>
          <p className="mt-0.5 text-xs text-gray-400">
            Du hast Benachrichtigungen im Browser abgelehnt. Erlaube sie in den
            Browser-Einstellungen, um sie zu nutzen.
          </p>
        </div>
      </div>
    );
  }

  if (state === "granted") {
    return (
      <div className="mb-5 flex items-center gap-3 rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
        <span className="text-emerald-500">
          <BellIcon />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-emerald-800">Benachrichtigungen sind an</p>
          <p className="mt-0.5 text-xs text-emerald-700/80">
            Du bekommst neue Nachrichten auch auf den Sperrbildschirm.
          </p>
        </div>
        <button
          onClick={disable}
          className="flex-shrink-0 text-xs font-medium text-emerald-700/70 hover:text-emerald-800"
        >
          ausschalten
        </button>
      </div>
    );
  }

  // default / working
  return (
    <div className="mb-5">
      <button
        onClick={enable}
        disabled={state === "working"}
        className="flex w-full items-center gap-3 rounded-3xl border border-gray-100 bg-white p-4 text-left shadow-sm ring-1 ring-black/5 transition-all hover:bg-gray-50 disabled:opacity-60"
      >
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-violet-500 text-white">
          <BellIcon />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">Benachrichtigungen aktivieren</p>
          <p className="mt-0.5 text-xs text-gray-400">
            Neue Nachrichten direkt auf den Sperrbildschirm.
          </p>
        </div>
        {state === "working" && (
          <span className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" />
        )}
      </button>
      {err && <p className="mt-1.5 px-1 text-xs text-rose-500">{err}</p>}
    </div>
  );
}
