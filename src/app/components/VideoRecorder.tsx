"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_MS = 20000; // 20 s cap for a short video message

// Pick a recording format the browser actually supports. iOS records mp4,
// Android/desktop Chrome records webm.
function pickMime(): string {
  const candidates = [
    "video/mp4",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9,opus",
    "video/webm",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

export default function VideoRecorder({
  onClose,
  onSend,
}: {
  onClose: () => void;
  onSend: (blob: Blob, durationMs: number, mime: string) => void;
}) {
  const liveRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [phase, setPhase] = useState<"idle" | "recording" | "review">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; blob: Blob; mime: string; ms: number } | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // (Re)acquire the camera for the live preview.
  const startCamera = useCallback(
    async (facingMode: "user" | "environment") => {
      setError(null);
      try {
        stopStream();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: true,
        });
        streamRef.current = stream;
        if (liveRef.current) {
          liveRef.current.srcObject = stream;
          await liveRef.current.play().catch(() => {});
        }
      } catch {
        setError("Kamera/Mikrofon nicht verfügbar. Bitte Zugriff erlauben.");
      }
    },
    [stopStream]
  );

  useEffect(() => {
    startCamera(facing);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flip = () => {
    if (phase === "recording") return;
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    startCamera(next);
  };

  const startRec = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const mime = pickMime();
    let rec: MediaRecorder;
    try {
      rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch {
      setError("Aufnahme wird auf diesem Gerät nicht unterstützt.");
      return;
    }
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const type = rec.mimeType || mime || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const ms = Date.now() - startedRef.current;
      setPreview({ url: URL.createObjectURL(blob), blob, mime: type, ms });
      setPhase("review");
      stopStream();
    };
    recorderRef.current = rec;
    startedRef.current = Date.now();
    rec.start();
    setPhase("recording");
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(Date.now() - startedRef.current), 100);
    stopTimeoutRef.current = setTimeout(stopRec, MAX_MS);
  };

  const stopRec = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
  };

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setPhase("idle");
    startCamera(facing);
  };

  const send = () => {
    if (!preview) return;
    onSend(preview.blob, preview.ms, preview.mime);
  };

  const secs = (ms: number) => `${Math.floor(ms / 1000)}s`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* top bar */}
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 text-white">
        <button onClick={onClose} aria-label="Schließen" className="p-1.5 text-white/80 hover:text-white">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="text-sm font-medium">Videobotschaft</span>
        {phase === "idle" ? (
          <button onClick={flip} aria-label="Kamera wechseln" className="p-1.5 text-white/80 hover:text-white">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 4v5h-5M4 20v-5h5" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 9a7 7 0 00-13-2M5 15a7 7 0 0013 2" />
            </svg>
          </button>
        ) : (
          <span className="w-9" />
        )}
      </div>

      {/* stage */}
      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <div className="flex h-full items-center justify-center px-8 text-center text-sm text-white/80">
            {error}
          </div>
        ) : phase === "review" && preview ? (
          <video src={preview.url} controls playsInline className="h-full w-full object-contain" />
        ) : (
          <video
            ref={liveRef}
            muted
            autoPlay
            playsInline
            className={`h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`}
          />
        )}

        {phase === "recording" && (
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-sm font-semibold text-white">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
            {secs(elapsed)} / {secs(MAX_MS)}
          </div>
        )}
      </div>

      {/* controls */}
      <div className="flex items-center justify-center gap-8 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
        {phase === "review" && preview ? (
          <>
            <button onClick={retake} className="rounded-full px-5 py-3 text-sm font-semibold text-white/90 hover:bg-white/10">
              Neu aufnehmen
            </button>
            <button
              onClick={send}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-6 py-3 font-semibold text-white shadow-md"
            >
              Senden
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </>
        ) : (
          <button
            onClick={phase === "recording" ? stopRec : startRec}
            disabled={!!error}
            aria-label={phase === "recording" ? "Stopp" : "Aufnehmen"}
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full ring-4 ring-white/70 disabled:opacity-40"
          >
            <span
              className={`bg-rose-500 transition-all ${
                phase === "recording" ? "h-7 w-7 rounded-md" : "h-14 w-14 rounded-full"
              }`}
            />
          </button>
        )}
      </div>
    </div>
  );
}
