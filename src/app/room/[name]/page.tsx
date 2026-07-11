"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  use,
} from "react";
import DailyIframe, {
  DailyCall,
  DailyParticipant,
} from "@daily-co/daily-js";
import { useRouter, useSearchParams } from "next/navigation";

/* ───────────────────────── helpers ───────────────────────── */

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic warm/violet gradient per participant so tiles feel on-brand.
function tileGradient(seed: string) {
  const gradients = [
    "from-pink-400 to-violet-500",
    "from-amber-400 to-orange-500",
    "from-violet-400 to-purple-500",
    "from-rose-400 to-pink-500",
    "from-fuchsia-400 to-violet-500",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return gradients[h % gradients.length];
}

// "in 3 Std 20 Min" / "in 12 Min" / "in 2 Tg 4 Std"
function countdownLabel(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins} Min`;
  const h = Math.floor(mins / 60);
  const mm = mins % 60;
  if (h < 24) return mm ? `in ${h} Std ${mm} Min` : `in ${h} Std`;
  const days = Math.floor(h / 24);
  const rh = h % 24;
  const tg = days === 1 ? "Tag" : "Tg";
  return rh ? `in ${days} ${tg} ${rh} Std` : `in ${days} ${tg}`;
}

/* ───────────────────── single participant tile ───────────────────── */

type TileVariant = "grid" | "spotlight" | "pip";

function VideoTile({
  participant,
  isLocal,
  count = 1,
  variant = "grid",
}: {
  participant: DailyParticipant;
  isLocal: boolean;
  count?: number;
  variant?: TileVariant;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const videoTrack = participant.tracks?.video?.persistentTrack ?? null;
  const audioTrack = participant.tracks?.audio?.persistentTrack ?? null;
  const videoOn = participant.tracks?.video?.state === "playable" && !!videoTrack;
  const audioOff = participant.tracks?.audio?.state !== "playable";

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = videoTrack ? new MediaStream([videoTrack]) : null;
    // Re-trigger playback — needed when the camera is toggled back on or the
    // element remounts (mobile browsers don't always auto-resume).
    if (videoTrack) el.play().catch(() => {});
    return () => {
      try {
        el.pause();
        el.srcObject = null;
      } catch {}
    };
  }, [videoTrack]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || isLocal) return; // never play our own audio back (echo)
    el.srcObject = audioTrack ? new MediaStream([audioTrack]) : null;
    // Explicit play() so remote audio is heard on mobile (autoplay is flaky).
    if (audioTrack) el.play().catch(() => {});
    // Stop playback on unmount/leave so no audio keeps ringing.
    return () => {
      try {
        el.pause();
        el.srcObject = null;
      } catch {}
    };
  }, [audioTrack, isLocal]);

  const name = participant.user_name || (isLocal ? "Du" : "Gast");
  const isPip = variant === "pip";

  const containerCls =
    variant === "spotlight"
      ? "relative h-full w-full overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 ring-1 ring-white/10 shadow-lg"
      : isPip
      ? "relative h-36 w-24 sm:h-48 sm:w-32 overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 ring-2 ring-white/80 shadow-2xl"
      : "relative aspect-video w-full overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 ring-1 ring-white/10 shadow-lg";

  const avatarCls = isPip
    ? "h-12 w-12 text-base"
    : variant === "spotlight" || count <= 2
    ? "h-24 w-24 text-3xl"
    : "h-16 w-16 text-xl";

  return (
    <div className={containerCls}>
      {videoOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: isLocal ? "scaleX(-1)" : undefined }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-50/10 to-pink-50/5">
          <div
            className={`flex items-center justify-center rounded-full bg-gradient-to-br ${tileGradient(
              name
            )} text-white font-bold shadow-lg ${avatarCls}`}
          >
            {initials(name)}
          </div>
        </div>
      )}

      {/* always-mounted audio element for remote participants */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}

      {/* name + mic state */}
      {isPip ? (
        <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 backdrop-blur-sm">
          {audioOff && (
            <svg className="h-3 w-3 text-rose-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3.28 2.22a.75.75 0 00-1.06 1.06l18.5 18.5a.75.75 0 101.06-1.06l-3.6-3.6A7.46 7.46 0 0019.5 12a.75.75 0 00-1.5 0c0 .98-.25 1.9-.69 2.7l-1.06-1.06c.16-.51.25-1.06.25-1.64V6a3.75 3.75 0 00-7.31-1.18l5.06 5.06V6a2.25 2.25 0 00-4.5 0v.31L3.28 2.22zM6 10.5a.75.75 0 00-1.5 0V12a7.5 7.5 0 006.75 7.46V22.5a.75.75 0 001.5 0v-3.04a7.43 7.43 0 002.62-.77l-1.13-1.13c-.7.3-1.48.46-2.26.46A6 6 0 016 12v-1.5z" />
            </svg>
          )}
          <span className="text-[10px] font-medium text-white">{isLocal ? "Du" : name}</span>
        </div>
      ) : (
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur-sm">
          {audioOff ? (
            <svg className="h-3.5 w-3.5 text-rose-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3.28 2.22a.75.75 0 00-1.06 1.06l18.5 18.5a.75.75 0 101.06-1.06l-3.6-3.6A7.46 7.46 0 0019.5 12a.75.75 0 00-1.5 0c0 .98-.25 1.9-.69 2.7l-1.06-1.06c.16-.51.25-1.06.25-1.64V6a3.75 3.75 0 00-7.31-1.18l5.06 5.06V6a2.25 2.25 0 00-4.5 0v.31L3.28 2.22zM6 10.5a.75.75 0 00-1.5 0V12a7.5 7.5 0 006.75 7.46V22.5a.75.75 0 001.5 0v-3.04a7.43 7.43 0 002.62-.77l-1.13-1.13c-.7.3-1.48.46-2.26.46A6 6 0 016 12v-1.5z" />
            </svg>
          ) : (
            <span className="h-2 w-2 rounded-full bg-green-400" />
          )}
          <span className="text-xs font-medium text-white">
            {name}
            {isLocal && " (Du)"}
          </span>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── room ───────────────────────── */

function RoomContent({ name }: { name: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGuest = searchParams.get("guest") === "true";

  const callRef = useRef<DailyCall | null>(null);
  const [participants, setParticipants] = useState<DailyParticipant[]>([]);
  const [isJoining, setIsJoining] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  // Front/back camera switching — only shown when the device has >1 camera.
  const [canSwitchCam, setCanSwitchCam] = useState(false);
  const [switchingCam, setSwitchingCam] = useState(false);
  const [spotlightSwapped, setSpotlightSwapped] = useState(false);
  const [meetingStart, setMeetingStart] = useState<number | null>(null);
  const [, setNowTick] = useState(0);

  const userName = useMemo(() => {
    if (typeof window === "undefined") return "Gast";
    try {
      const saved = localStorage.getItem("ff_user");
      if (saved) return JSON.parse(saved).name || "Gast";
    } catch {}
    return "Gast";
  }, []);

  // If this room belongs to a planned meeting, learn its start time so we can
  // tell early arrivals how long until it begins.
  useEffect(() => {
    if (!name) return;
    let off = false;
    fetch(`/api/meetings?room=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!off && d?.meeting?.startsAt) setMeetingStart(d.meeting.startsAt);
      })
      .catch(() => {});
    const id = setInterval(() => setNowTick((t) => t + 1), 30000);
    return () => {
      off = true;
      clearInterval(id);
    };
  }, [name]);

  const leave = useCallback(async () => {
    const co = callRef.current;
    callRef.current = null;
    try {
      co?.setLocalAudio(false);
      co?.setLocalVideo(false);
      await co?.leave();
    } catch {}
    // Fully tear down so the mic/camera are released and no audio keeps ringing.
    try {
      await co?.destroy();
    } catch {}
    router.push(isGuest ? "/danke" : "/dashboard");
  }, [router, isGuest]);

  useEffect(() => {
    if (!name) return;
    let cancelled = false;

    const init = async () => {
      try {
        const res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Fehler beim Laden des Raums");
          setIsJoining(false);
          return;
        }

        // Tear down any lingering instance (StrictMode double-mount / remount).
        const existing = DailyIframe.getCallInstance();
        if (existing) await existing.destroy();
        if (cancelled) return;

        const co = DailyIframe.createCallObject({
          url: data.url,
          // Ask the camera for 720p so we have a sharp layer to send.
          dailyConfig: {
            userMediaVideoConstraints: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            },
          },
        });
        callRef.current = co;

        // Higher quality for small calls: raise the top simulcast layer to
        // full 720p ~1.5 Mbps and prefer the best layer on receive. Adaptive
        // layers stay on, so weak networks still scale down gracefully.
        const boostQuality = () => {
          co.updateSendSettings({
            video: {
              encodings: {
                low: { maxBitrate: 200000, scaleResolutionDownBy: 4, maxFramerate: 15 },
                medium: { maxBitrate: 600000, scaleResolutionDownBy: 2 },
                high: { maxBitrate: 1500000, scaleResolutionDownBy: 1, maxFramerate: 30 },
              },
            },
          }).catch(() => {});
          co.updateReceiveSettings({ "*": { video: { layer: 2 } } }).catch(() => {});
        };

        const sync = () => {
          if (cancelled) return;
          const all = Object.values(co.participants());
          // local first, then guests by join order
          all.sort((a, b) => (a.local === b.local ? 0 : a.local ? -1 : 1));
          setParticipants(all);
          // Keep the mic/cam buttons in sync with the real local track state.
          const local = all.find((p) => p.local);
          if (local) {
            setMicOn(local.audio);
            setCamOn(local.video);
          }
        };

        co.on("joined-meeting", () => {
          if (cancelled) return;
          setIsJoining(false);
          boostQuality();
          sync();
          // Show the flip button on touch devices (phones/tablets always have a
          // front + back camera) or on any device that reports >1 camera. iOS /
          // iPadOS often under-reports cameras via enumerateDevices, so the
          // coarse-pointer check is what makes the button appear there.
          const coarse =
            typeof window !== "undefined" &&
            typeof window.matchMedia === "function" &&
            window.matchMedia("(pointer: coarse)").matches;
          co.enumerateDevices()
            .then(({ devices }) => {
              if (cancelled) return;
              const cams = devices.filter((d) => d.kind === "videoinput");
              setCanSwitchCam(cams.length > 1 || coarse);
            })
            .catch(() => {
              if (!cancelled) setCanSwitchCam(coarse);
            });
        })
          .on("participant-joined", sync)
          .on("participant-updated", sync)
          .on("participant-left", sync)
          .on("error", () => {
            if (cancelled) return;
            setError("Verbindungsfehler beim Video-Call");
            setIsJoining(false);
          });

        await co.join({ userName });
      } catch {
        if (cancelled) return;
        setError("Fehler beim Starten des Video-Calls");
        setIsJoining(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      const live = callRef.current || DailyIframe.getCallInstance();
      if (live) live.destroy();
      callRef.current = null;
    };
  }, [name, userName]);

  const toggleMic = () => {
    const co = callRef.current;
    if (!co) return;
    const next = !co.localAudio(); // read real state to avoid desync
    co.setLocalAudio(next);
    setMicOn(next);
  };
  const toggleCam = () => {
    const co = callRef.current;
    if (!co) return;
    const next = !co.localVideo();
    co.setLocalVideo(next);
    setCamOn(next);
  };
  // Flip between front and back camera (e.g. to show something).
  const switchCam = async () => {
    const co = callRef.current;
    if (!co || switchingCam) return;
    setSwitchingCam(true);
    try {
      await co.cycleCamera();
    } catch {
      // ignore — some devices/browsers don't support cycling
    }
    setSwitchingCam(false);
  };

  const copyLink = async () => {
    const link = `${window.location.origin}/room/${name}?guest=true`;
    let ok = false;
    try {
      await navigator.clipboard.writeText(link);
      ok = true;
    } catch {
      // Fallback for contexts without the async clipboard API (no prompt()
      // here — it throws "not supported" in sandboxed/embedded browsers).
      try {
        const ta = document.createElement("textarea");
        ta.value = link;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /* ── error state ── */
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orange-50/40 via-rose-50/30 to-violet-50/40 p-4">
        <div className="max-w-sm rounded-3xl bg-white p-8 text-center shadow-lg shadow-violet-200/40 ring-1 ring-black/5">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100">
            <svg className="h-8 w-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-800">Hoppla!</h2>
          <p className="mb-5 text-gray-500">{error}</p>
          <button
            onClick={() => router.push(isGuest ? "/danke" : "/dashboard")}
            className="rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-6 py-2.5 font-semibold text-white shadow-md shadow-violet-200/50 transition-all hover:from-pink-600 hover:to-violet-600"
          >
            {isGuest ? "Schließen" : "Zurück zum Dashboard"}
          </button>
        </div>
      </div>
    );
  }

  const gridCols =
    participants.length <= 1
      ? "grid-cols-1 max-w-3xl"
      : participants.length === 2
      ? "grid-cols-1 sm:grid-cols-2 max-w-5xl"
      : participants.length <= 4
      ? "grid-cols-1 sm:grid-cols-2 max-w-5xl"
      : "grid-cols-2 lg:grid-cols-3 max-w-6xl";

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-orange-50/40 via-rose-50/30 to-violet-50/40">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-orange-100 opacity-30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-violet-100 opacity-30 blur-3xl" />
      </div>

      {/* header */}
      <header className="relative z-10 flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-violet-500 shadow-md shadow-violet-200">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold leading-tight text-gray-800">Video-Treffen</h1>
            <p className="text-xs text-gray-400">
              {participants.length} {participants.length === 1 ? "Person" : "Personen"} dabei
            </p>
          </div>
        </div>

        <button
          onClick={copyLink}
          className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-black/5 transition-all hover:ring-violet-200"
        >
          {copied ? (
            <>
              <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Kopiert!
            </>
          ) : (
            <>
              <svg className="h-4 w-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Einladen
            </>
          )}
        </button>
      </header>

      {/* stage */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-28 pt-2 sm:px-6">
        {isJoining ? (
          <div className="text-center">
            <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
            <p className="font-medium text-gray-600">Wir verbinden dich …</p>
            <p className="mt-1 text-sm text-gray-400">
              Bitte Kamera &amp; Mikrofon erlauben
            </p>
          </div>
        ) : participants.length === 2 ? (
          (() => {
            // 1:1 call → the other person fills the stage, you sit in a small
            // picture-in-picture you can tap to swap.
            const localP = participants.find((p) => p.local) ?? participants[0];
            const remoteP = participants.find((p) => !p.local) ?? participants[1];
            const big = spotlightSwapped ? localP : remoteP;
            const small = spotlightSwapped ? remoteP : localP;
            return (
              <div className="relative mx-auto h-[72vh] w-full max-w-5xl">
                <VideoTile
                  participant={big}
                  isLocal={!!big.local}
                  variant="spotlight"
                />
                <button
                  type="button"
                  onClick={() => setSpotlightSwapped((s) => !s)}
                  aria-label="Ansicht tauschen"
                  className="absolute bottom-3 right-3 z-10 transition-transform active:scale-95 sm:bottom-4 sm:right-4"
                >
                  <VideoTile participant={small} isLocal={!!small.local} variant="pip" />
                </button>
              </div>
            );
          })()
        ) : (
          <div className={`grid w-full gap-4 ${gridCols}`}>
            {participants.map((p) => (
              <VideoTile
                key={p.session_id}
                participant={p}
                isLocal={!!p.local}
                count={participants.length}
              />
            ))}
            {participants.length === 1 &&
              (meetingStart === null || Date.now() >= meetingStart - 15 * 60 * 1000) && (
                <div className="flex items-center justify-center rounded-3xl border-2 border-dashed border-violet-200 bg-white/40 p-8 text-center">
                  <div>
                    <p className="font-medium text-gray-500">Noch alleine hier</p>
                    <p className="mt-1 text-sm text-gray-400">
                      Gleich ist bestimmt jemand da 💕
                    </p>
                  </div>
                </div>
              )}

            {/* "You're early" notice — shown below the video until start time */}
            {meetingStart !== null && meetingStart - Date.now() > 0 && (
              <div className="col-span-full flex items-center justify-center gap-2.5 rounded-2xl bg-amber-50/90 px-4 py-3 text-center ring-1 ring-amber-100">
                <svg className="h-5 w-5 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-amber-700">
                  <span className="font-semibold">Du bist etwas zu früh.</span>{" "}
                  Das Treffen startet {countdownLabel(meetingStart - Date.now())}.
                </p>
              </div>
            )}

            {/* Invite friends outside of Hello Tropics */}
            <div className="col-span-full flex flex-col items-center gap-2.5 rounded-2xl bg-white/60 px-4 py-3 text-center ring-1 ring-black/5">
              <p className="text-sm text-gray-500">
                Freunde außerhalb von{" "}
                <span className="font-medium text-gray-700">Hello Tropics</span>?
                Teile den Einladungslink mit ihnen.
              </p>
              <button
                onClick={copyLink}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-pink-600 hover:to-violet-600"
              >
                {copied ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                )}
                {copied ? "Link kopiert!" : "Einladungslink teilen"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* control bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center pb-6">
        <div className="flex items-center gap-3 rounded-full bg-white/90 px-4 py-3 shadow-lg shadow-violet-200/40 ring-1 ring-black/5 backdrop-blur-sm">
          <button
            onClick={toggleMic}
            aria-label={micOn ? "Mikrofon aus" : "Mikrofon an"}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              micOn
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-rose-500 text-white hover:bg-rose-600"
            }`}
          >
            {micOn ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5V21m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 016 0v8.25a3 3 0 01-3 3z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 9v3.75a3 3 0 005.4 1.8M9.34 5.66A3 3 0 0115 6.75V9m3 3.75a6 6 0 01-.9 3.16M12 18.75a6 6 0 01-6-6v-1.5M12 18.75V21m-3.75 0h7.5M3.75 3.75l16.5 16.5" />
              </svg>
            )}
          </button>

          <button
            onClick={toggleCam}
            aria-label={camOn ? "Kamera aus" : "Kamera an"}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              camOn
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-rose-500 text-white hover:bg-rose-600"
            }`}
          >
            {camOn ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h6m4-8V8a2 2 0 00-2-2H8" />
              </svg>
            )}
          </button>

          {canSwitchCam && (
            <button
              onClick={switchCam}
              disabled={switchingCam || !camOn}
              aria-label="Kamera wechseln"
              title="Kamera wechseln (vorne/hinten)"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-all hover:bg-gray-200 disabled:opacity-40"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 4v5h-5M4 20v-5h5" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 9a7 7 0 00-13-2M5 15a7 7 0 0013 2" />
                <circle cx="12" cy="12" r="2.25" strokeWidth={1.8} />
              </svg>
            </button>
          )}

          <button
            onClick={leave}
            className="flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 px-5 font-semibold text-white shadow-md shadow-rose-200/50 transition-all hover:from-rose-600 hover:to-pink-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 12H9m9 0l-3-3m3 3l-3 3" />
            </svg>
            Verlassen
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RoomPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orange-50/40 via-rose-50/30 to-violet-50/40">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
        </div>
      }
    >
      <RoomContent name={name} />
    </Suspense>
  );
}
