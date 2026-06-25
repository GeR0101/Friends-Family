"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { timeAtEpoch } from "../lib/timezone";
import { type Location, normalizeStoredUser } from "../lib/cities";
import WorldMap, { type MapPerson } from "../lib/worldmap";
import NotificationButton from "../components/NotificationButton";
import ChatPanel from "../components/ChatPanel";

interface User {
  name: string;
  location: Location;
  avatar?: string;
  hasSecurityQuestion?: boolean;
}

interface Account {
  name: string;
  location: Location;
  avatar?: string;
  hasSecurityQuestion?: boolean;
  online: boolean;
}

const SECURITY_QUESTIONS = [
  "Wie hieß dein erstes Haustier?",
  "In welcher Stadt bist du geboren?",
  "Wie lautet der Mädchenname deiner Mutter?",
  "Wie hieß deine erste Schule?",
  "Dein Spitzname als Kind?",
];
const CUSTOM_Q = "__custom__";

// Read a file to a data URL (the raw image to feed the cropper).
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

// Interactive avatar cropper: drag to move, slider to zoom, circular preview.
// Exports the framed area as a 256px square JPEG (shown round via object-cover).
function AvatarCropper({
  src,
  saving,
  onCancel,
  onSave,
}: {
  src: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const VIEW = 280;
  const OUT = 256;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [minScale, setMinScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const clamp = (o: { x: number; y: number }, s: number, n: { w: number; h: number }) => {
    const dw = n.w * s;
    const dh = n.h * s;
    return {
      x: Math.min(0, Math.max(VIEW - dw, o.x)),
      y: Math.min(0, Math.max(VIEW - dh, o.y)),
    };
  };

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const ms = Math.max(VIEW / img.width, VIEW / img.height);
      imgRef.current = img;
      setNat({ w: img.width, h: img.height });
      setMinScale(ms);
      setScale(ms);
      setOff({ x: (VIEW - img.width * ms) / 2, y: (VIEW - img.height * ms) / 2 });
    };
    img.src = src;
  }, [src]);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !nat) return;
    const nx = drag.current.ox + (e.clientX - drag.current.x);
    const ny = drag.current.oy + (e.clientY - drag.current.y);
    setOff(clamp({ x: nx, y: ny }, scale, nat));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const changeScale = (s: number) => {
    if (!nat) return;
    const c = VIEW / 2;
    setOff((prev) => clamp({ x: c - (c - prev.x) * (s / scale), y: c - (c - prev.y) * (s / scale) }, s, nat));
    setScale(s);
  };

  const save = () => {
    if (!nat || !imgRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sSize = VIEW / scale;
    ctx.drawImage(imgRef.current, -off.x / scale, -off.y / scale, sSize, sSize, 0, 0, OUT, OUT);
    onSave(canvas.toDataURL("image/jpeg", 0.85));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
        <h3 className="mb-1 text-center font-display text-lg font-semibold text-gray-800">
          Foto anpassen
        </h3>
        <p className="mb-4 text-center text-xs text-gray-400">Ziehen zum Verschieben, Regler zum Zoomen</p>

        <div
          className="relative mx-auto touch-none select-none overflow-hidden rounded-2xl bg-gray-900"
          style={{ width: VIEW, height: VIEW, maxWidth: "100%" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {nat && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: off.x,
                top: off.y,
                width: nat.w * scale,
                height: nat.h * scale,
                maxWidth: "none",
              }}
            />
          )}
          {/* darken outside the circular safe area */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }}
          />
          <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/80" />
        </div>

        <input
          type="range"
          min={minScale}
          max={minScale * 3}
          step={0.001}
          value={scale}
          onChange={(e) => changeScale(parseFloat(e.target.value))}
          className="mt-4 w-full accent-violet-500"
        />

        <div className="mt-4 flex gap-2">
          <button
            onClick={save}
            disabled={saving || !nat}
            className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 py-2.5 font-semibold text-white shadow-sm transition-all hover:from-pink-600 hover:to-violet-600 disabled:opacity-50"
          >
            {saving ? "Speichern…" : "Speichern"}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl px-4 py-2.5 font-medium text-gray-500 hover:bg-gray-100"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

// Live webcam capture (desktop + mobile) — activates the camera via
// getUserMedia, shows a mirrored preview, and hands a snapshot to the cropper.
function CameraCapture({
  onCapture,
  onCancel,
}: {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        if (!cancelled) setError("Kamera nicht verfügbar oder Zugriff verweigert.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const w = v.videoWidth;
    const h = v.videoHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror so the snapshot matches the selfie preview.
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0, w, h);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(canvas.toDataURL("image/jpeg", 0.9));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
        <h3 className="mb-4 text-center font-display text-lg font-semibold text-gray-800">
          Foto aufnehmen
        </h3>

        {error ? (
          <div className="rounded-2xl bg-rose-50 p-4 text-center text-sm text-rose-600">{error}</div>
        ) : (
          <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-gray-900">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {!error && (
            <button
              onClick={snap}
              disabled={!ready}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 py-2.5 font-semibold text-white shadow-sm transition-all hover:from-pink-600 hover:to-violet-600 disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Aufnehmen
            </button>
          )}
          <button
            onClick={onCancel}
            className="rounded-xl px-4 py-2.5 font-medium text-gray-500 hover:bg-gray-100"
          >
            {error ? "Schließen" : "Abbrechen"}
          </button>
        </div>
      </div>
    </div>
  );
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
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [deletingMeeting, setDeletingMeeting] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // "Set a security question" prompt (for accounts created before the feature)
  const [secOpen, setSecOpen] = useState(false);
  const [secChoice, setSecChoice] = useState(SECURITY_QUESTIONS[0]);
  const [secCustom, setSecCustom] = useState("");
  const [secAnswer, setSecAnswer] = useState("");
  const [secPassword, setSecPassword] = useState("");
  const [secSaving, setSecSaving] = useState(false);
  const [secError, setSecError] = useState("");

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
        // Keep our own presence fresh on every tick so we don't flicker out.
        beat(true);
        const [pres, cres] = await Promise.all([
          fetch("/api/chat/users").then((r) => r.json()),
          fetch(`/api/contacts?user=${encodeURIComponent(u.name)}`).then((r) => r.json()),
        ]);
        setOnlineUsers(pres.users.filter((x: any) => x.online).map((x: any) => x.name));
        // Only the user's own contacts populate the map (not every account).
        const list: Account[] = cres.contacts || [];
        setAccounts(list);
        // Keep my own avatar in sync if it was changed elsewhere.
        const me = list.find((a) => a.name.toLowerCase() === u.name.toLowerCase());
        if (me)
          setUser((prev) =>
            prev && (prev.avatar !== me.avatar || prev.hasSecurityQuestion !== me.hasSecurityQuestion)
              ? { ...prev, avatar: me.avatar, hasSecurityQuestion: me.hasSecurityQuestion }
              : prev
          );
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
    if (!file) return;
    try {
      setCropSrc(await fileToDataUrl(file)); // open the cropper
    } catch {
      /* ignore unreadable files */
    }
  };

  const uploadAvatar = async (dataUrl: string) => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
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
          JSON.stringify({
            name: stored.name,
            location: stored.location,
            avatar: dataUrl,
            hasSecurityQuestion: stored.hasSecurityQuestion,
          })
        );
      }
      setCropSrc(null);
    } catch {
      // Silent: keep the old avatar on failure.
    }
    setUploadingAvatar(false);
  };

  const saveSecurityQuestion = async () => {
    if (!user) return;
    setSecError("");
    const question = secChoice === CUSTOM_Q ? secCustom.trim() : secChoice;
    if (!question) return setSecError("Bitte eine Frage angeben");
    if (secAnswer.trim().length < 2) return setSecError("Bitte eine Antwort angeben");
    if (secPassword.length < 4) return setSecError("Bitte dein aktuelles Passwort eingeben");
    setSecSaving(true);
    try {
      const res = await fetch("/api/auth/security-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name, password: secPassword, question, answer: secAnswer.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSecError(data.error || "Etwas ist schiefgelaufen");
        setSecSaving(false);
        return;
      }
      setUser((prev) => (prev ? { ...prev, hasSecurityQuestion: true } : prev));
      const stored = normalizeStoredUser(localStorage.getItem("ff_user"));
      if (stored)
        localStorage.setItem(
          "ff_user",
          JSON.stringify({
            name: stored.name,
            location: stored.location,
            avatar: stored.avatar,
            hasSecurityQuestion: true,
          })
        );
      setSecOpen(false);
      setSecPassword("");
      setSecAnswer("");
    } catch {
      setSecError("Verbindungsfehler – bitte nochmal versuchen");
    }
    setSecSaving(false);
  };

  // Cancel a planned meeting (deletes the underlying proposal everywhere).
  const deleteMeeting = async (id: string) => {
    setDeletingMeeting(id);
    try {
      await fetch(`/api/chat?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setMeetings((m) => m.filter((x) => x.id !== id));
    } catch {
      /* ignore */
    }
    setDeletingMeeting(null);
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
    if (!user) return [];
    const onlineSet = new Set(onlineUsers.map((n) => n.toLowerCase()));
    // Me first, then my contacts (deduped) — never every account.
    const others = accounts.filter((a) => a.name.toLowerCase() !== user.name.toLowerCase());
    const src = [{ name: user.name, location: user.location }, ...others];
    return src.map((a) => ({
      name: a.name,
      lat: a.location.lat,
      lon: a.location.lon,
      tz: a.location.tz,
      flag: a.location.flag,
      // I'm always "here"; contacts come from presence.
      online:
        a.name.toLowerCase() === user.name.toLowerCase() ||
        onlineSet.has(a.name.toLowerCase()),
    }));
  }, [accounts, user, onlineUsers]);

  if (!user) return null;

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-b from-orange-50/40 via-rose-50/30 to-violet-50/40">
      {cameraOpen && (
        <CameraCapture
          onCancel={() => setCameraOpen(false)}
          onCapture={(dataUrl) => {
            setCameraOpen(false);
            setCropSrc(dataUrl); // hand the snapshot to the cropper
          }}
        />
      )}

      {cropSrc && (
        <AvatarCropper
          src={cropSrc}
          saving={uploadingAvatar}
          onCancel={() => setCropSrc(null)}
          onSave={uploadAvatar}
        />
      )}

      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-orange-100 rounded-full opacity-30 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-100 rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto">
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
                      onClick={() => {
                        setAvatarMenuOpen(false);
                        setCameraOpen(true);
                      }}
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
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFile}
              />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-gray-800 tracking-tight">
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

        {/* Prompt to add a security question (accounts created before the feature) */}
        {user.hasSecurityQuestion === false && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 mb-5">
            {!secOpen ? (
              <div className="flex items-start gap-3">
                <span className="text-xl leading-none">🔐</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">
                    Sicherheitsfrage hinterlegen
                  </p>
                  <p className="text-xs text-amber-700/80 mt-0.5">
                    Damit kannst du dein Passwort selbst zurücksetzen, falls du es mal vergisst.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSecOpen(true);
                    setSecError("");
                  }}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
                >
                  Einrichten
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-sm font-semibold text-amber-800">🔐 Sicherheitsfrage einrichten</p>
                <select
                  value={secChoice}
                  onChange={(e) => setSecChoice(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg bg-white text-sm text-gray-800 appearance-none focus:ring-2 focus:ring-amber-300"
                >
                  {SECURITY_QUESTIONS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                  <option value={CUSTOM_Q}>Eigene Frage…</option>
                </select>
                {secChoice === CUSTOM_Q && (
                  <input
                    type="text"
                    value={secCustom}
                    onChange={(e) => setSecCustom(e.target.value)}
                    placeholder="Deine eigene Frage"
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg bg-white text-sm text-gray-800 focus:ring-2 focus:ring-amber-300"
                  />
                )}
                <input
                  type="text"
                  value={secAnswer}
                  onChange={(e) => setSecAnswer(e.target.value)}
                  placeholder="Deine Antwort"
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg bg-white text-sm text-gray-800 focus:ring-2 focus:ring-amber-300"
                />
                <input
                  type="password"
                  value={secPassword}
                  onChange={(e) => setSecPassword(e.target.value)}
                  placeholder="Dein aktuelles Passwort (zur Bestätigung)"
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg bg-white text-sm text-gray-800 focus:ring-2 focus:ring-amber-300"
                />
                {secError && <p className="text-xs text-rose-500">{secError}</p>}
                <div className="flex gap-2 pt-0.5">
                  <button
                    onClick={saveSecurityQuestion}
                    disabled={secSaving}
                    className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                  >
                    {secSaving ? "Speichern…" : "Speichern"}
                  </button>
                  <button
                    onClick={() => {
                      setSecOpen(false);
                      setSecError("");
                    }}
                    className="px-4 py-2 rounded-lg text-amber-700 hover:bg-amber-100 text-sm font-medium"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lock-screen notifications opt-in */}
        <NotificationButton />

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
                    <button
                      onClick={() => deleteMeeting(mt.id)}
                      disabled={deletingMeeting === mt.id}
                      aria-label="Treffen löschen"
                      title="Treffen löschen"
                      className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-50"
                    >
                      {deletingMeeting === mt.id ? (
                        <span className="w-4 h-4 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-1 0v12a1 1 0 01-1 1H10a1 1 0 01-1-1V7h6z" />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Chat lives right here on the home page */}
        <ChatPanel />

      </div>
    </div>
  );
}