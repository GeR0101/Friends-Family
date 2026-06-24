"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { timeAtEpoch } from "../lib/timezone";
import { type Location, normalizeStoredUser } from "../lib/cities";
import WorldMap, { type MapPerson } from "../lib/worldmap";

interface User {
  name: string;
  location: Location;
  avatar?: string;
}

interface Account {
  name: string;
  location: Location;
  avatar?: string;
  online: boolean;
}

// Read an image file, crop to a centered square and downscale to 256px, then
// return a compact JPEG data URL suitable for storing on the account.
function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const SIZE = 256;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface Meeting {
  id: string;
  roomName: string;
  startsAt: number;
  proposer: string;
  acceptedBy?: string;
  invitees: string[];
}

// "in 3 Std 20 Min" / "in 12 Min" / "in 2 Tg 4 Std" / "Läuft gerade"
function countdownLabel(startsAt: number): string {
  const diff = startsAt - Date.now();
  if (diff <= 0) return "Läuft gerade";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins} Min`;
  const h = Math.floor(mins / 60);
  const mm = mins % 60;
  if (h < 24) return mm ? `in ${h} Std ${mm} Min` : `in ${h} Std`;
  const days = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `in ${days} ${days === 1 ? "Tag" : "Tg"} ${rh} Std` : `in ${days} ${days === 1 ? "Tag" : "Tg"}`;
}

// Day label ("Heute" / "Morgen" / "Mi, 18.06.") in the viewer's own timezone.
function dayLabel(startsAt: number, iana: string): string {
  const ymd = (ms: number) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: iana }).format(new Date(ms));
  const target = ymd(startsAt);
  if (target === ymd(Date.now())) return "Heute";
  if (target === ymd(Date.now() + 86400000)) return "Morgen";
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: iana,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(startsAt));
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [, setNowTick] = useState(0);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = normalizeStoredUser(localStorage.getItem("ff_user"));
    if (!u) {
      router.push("/");
      return;
    }
    setUser(u);

    const beat = (online: boolean) =>
      fetch("/api/chat/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: u.name, timezone: u.location.tz, online }),
      }).catch(() => {});
    beat(true);

    const interval = setInterval(async () => {
      try {
        const [pres, accs] = await Promise.all([
          fetch("/api/chat/users").then((r) => r.json()),
          fetch("/api/accounts").then((r) => r.json()),
        ]);
        setOnlineUsers(pres.users.filter((x: any) => x.online).map((x: any) => x.name));
        const list: Account[] = accs.users || [];
        setAccounts(list);
        // Keep my own avatar in sync if it was changed elsewhere.
        const me = list.find((a) => a.name.toLowerCase() === u.name.toLowerCase());
        if (me) setUser((prev) => (prev && prev.avatar !== me.avatar ? { ...prev, avatar: me.avatar } : prev));
      } catch {}
    }, 3000);

    return () => {
      clearInterval(interval);
      beat(false);
    };
  }, [router]);

  // Upcoming (accepted) meetings + a ticker so the countdown stays fresh.
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/meetings?user=${encodeURIComponent(user.name)}`);
        const data = await res.json();
        setMeetings(data.meetings || []);
      } catch {}
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [user]);

  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    setAvatarMenuOpen(false);
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name, avatar: dataUrl }),
      });
      if (!res.ok) throw new Error("upload failed");
      // Reflect immediately + persist for next load.
      setUser((prev) => (prev ? { ...prev, avatar: dataUrl } : prev));
      const stored = normalizeStoredUser(localStorage.getItem("ff_user"));
      if (stored) {
        localStorage.setItem(
          "ff_user",
          JSON.stringify({ name: stored.name, location: stored.location, avatar: dataUrl })
        );
      }
    } catch {
      // Silent: keep the old avatar on failure.
    }
    setUploadingAvatar(false);
  };

  const handleLogout = () => {
    if (user) {
      fetch("/api/chat/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name, timezone: user.location.tz, online: false }),
      });
    }
    localStorage.removeItem("ff_user");
    router.push("/");
  };

  // Everyone (incl. me) shown on the map at their real location.
  const mapPeople: MapPerson[] = useMemo(() => {
    const src = accounts.length
      ? accounts
      : user
      ? [{ name: user.name, location: user.location, online: true }]
      : [];
    return src.map((a) => ({
      name: a.name,
      lat: a.location.lat,
      lon: a.location.lon,
      tz: a.location.tz,
      flag: a.location.flag,
    }));
  }, [accounts, user]);

  if (!user) return null;

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-b from-orange-50/40 via-rose-50/30 to-violet-50/40">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-orange-100 rounded-full opacity-30 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-100 rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setAvatarMenuOpen((o) => !o)}
                className="group relative w-14 h-14 rounded-full overflow-hidden shadow-lg shadow-violet-200 ring-2 ring-white focus:outline-none focus:ring-violet-300"
                aria-label="Profilfoto ändern"
              >
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="flex w-full h-full items-center justify-center bg-gradient-to-br from-violet-400 to-purple-500 text-white font-bold text-xl">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/35 transition-colors">
                  {uploadingAvatar ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg
                      className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </span>
              </button>

              {avatarMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAvatarMenuOpen(false)} />
                  <div className="absolute left-0 top-16 z-20 w-48 rounded-2xl border border-gray-100 bg-white py-1.5 shadow-lg">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-violet-50"
                    >
                      <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Foto aufnehmen
                    </button>
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-violet-50"
                    >
                      <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Foto hochladen
                    </button>
                    {user.avatar && (
                      <button
                        type="button"
                        onClick={async () => {
                          setAvatarMenuOpen(false);
                          await fetch("/api/profile", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: user.name, avatar: null }),
                          });
                          setUser((prev) => (prev ? { ...prev, avatar: undefined } : prev));
                          const stored = normalizeStoredUser(localStorage.getItem("ff_user"));
                          if (stored)
                            localStorage.setItem(
                              "ff_user",
                              JSON.stringify({ name: stored.name, location: stored.location })
                            );
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-rose-500 hover:bg-rose-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Foto entfernen
                      </button>
                    )}
                  </div>
                </>
              )}

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handleAvatarFile}
              />
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFile}
              />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 tracking-tight">
                Hallo, {user.name}!
              </h1>
              <p className="text-base text-gray-400">
                Schön, dass du da bist.
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Abmelden"
            className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-50 rounded-full shadow-sm ring-1 ring-black/5 transition-all"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>

        {/* World map with day/night */}
        <WorldMap people={mapPeople} />

        {/* Upcoming meetings */}
        {meetings.length > 0 && (
          <div className="bg-white rounded-3xl p-5 mb-5 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">Anstehende Treffen</h2>
            </div>
            <div className="space-y-2.5">
              {meetings.map((mt) => {
                const myTime = timeAtEpoch(mt.startsAt, user.location.tz);
                const soon = mt.startsAt - Date.now() < 60 * 60 * 1000;
                const live = mt.startsAt - Date.now() <= 0;
                return (
                  <div
                    key={mt.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-violet-50/70 to-pink-50/70 ring-1 ring-violet-100"
                  >
                    <div className="flex flex-col items-center justify-center w-16 flex-shrink-0 rounded-xl bg-white py-2 shadow-sm ring-1 ring-black/5">
                      <span className="text-lg font-bold leading-none text-gray-800">{myTime}</span>
                      <span className="mt-0.5 text-[10px] text-gray-400">{user.location.flag} Uhr</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800">{dayLabel(mt.startsAt, user.location.tz)}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            live
                              ? "bg-green-100 text-green-700"
                              : soon
                              ? "bg-amber-100 text-amber-700"
                              : "bg-violet-100 text-violet-700"
                          }`}
                        >
                          {countdownLabel(mt.startsAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-400">
                        mit {mt.invitees.length ? mt.invitees.join(", ") : "der ganzen Familie"}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/room/${mt.roomName}`)}
                      className="flex-shrink-0 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-pink-600 hover:to-violet-600"
                    >
                      {live ? "Beitreten" : "Eintreten"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Online users */}
        <div className="bg-white rounded-3xl p-5 mb-5 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              <h2 className="text-lg font-bold text-gray-800">Online</h2>
            </div>
            <div className="w-10 h-10 flex items-center justify-center rounded-full ring-1 ring-black/5 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a3 3 0 10-1.5-5.6"
                />
              </svg>
            </div>
          </div>
          {onlineUsers.length === 0 ? (
            <p className="text-gray-400">Niemand ist online...</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {onlineUsers.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-sm text-green-700"
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main action cards */}
        <div className="grid gap-5 mb-5">
          {/* Chat Card */}
          <button
            onClick={() => router.push("/chat")}
            className="bg-white rounded-3xl p-6 text-left shadow-sm ring-1 ring-black/5 hover:shadow-md hover:ring-violet-200 transition-all group"
          >
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center transition-all">
                <svg
                  className="w-8 h-8 text-violet-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-800 mb-1">
                  Chat & Zeiten planen
                </h2>
                <p className="text-gray-400">
                  Schnacken und gemeinsame Zeiten finden – mit Zeitumrechnung!
                </p>
              </div>
              <svg
                className="w-6 h-6 text-gray-300 group-hover:text-violet-400 group-hover:translate-x-1 transition-all"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}