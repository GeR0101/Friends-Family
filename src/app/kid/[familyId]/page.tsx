"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

type CallStatus = "idle" | "calling" | "in-call" | "ended" | "error";

export default function KidPage() {
  const params = useParams();
  const router = useRouter();
  const familyId = params.familyId as string;

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [roomUrl, setRoomUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(`kid-device-${familyId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      setDeviceId(parsed.id);
      setDeviceName(parsed.name);
    } else {
      router.push("/setup");
    }
  }, [familyId, router]);

  const startCall = useCallback(async () => {
    if (!deviceId) return;
    setCallStatus("calling");
    setError("");

    try {
      const res = await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId, kidDeviceId: deviceId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Fehler beim Anrufen");
        setCallStatus("error");
        return;
      }

      setRoomUrl(data.roomUrl);
      setCallStatus("in-call");
    } catch {
      setError("Verbindungsfehler");
      setCallStatus("error");
    }
  }, [deviceId, familyId]);

  const endCall = useCallback(() => {
    setCallStatus("ended");
    setRoomUrl("");
    setTimeout(() => setCallStatus("idle"), 2000);
  }, []);

  if (!deviceId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="text-white/50">Laden...</div>
      </div>
    );
  }

  // In-call view with Daily iframe
  if (callStatus === "in-call" && roomUrl) {
    return (
      <div className="flex flex-col min-h-screen bg-[#0A0A0A]">
        <div className="flex items-center justify-between p-4 bg-white/5 border-b border-white/10">
          <span className="text-white font-medium">Anruf läuft...</span>
          <button
            onClick={endCall}
            className="px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-xl transition-all text-sm font-medium"
          >
            Auflegen
          </button>
        </div>
        <iframe
          src={roomUrl}
          allow="camera; microphone; fullscreen; display-capture"
          className="flex-1 w-full border-0"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4">
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        {/* Name display */}
        <div className="text-center">
          <p className="text-white/40 text-sm mb-1">Hallo</p>
          <h1 className="text-3xl font-bold text-white">{deviceName}</h1>
        </div>

        {/* Big call button */}
        <button
          onClick={startCall}
          disabled={callStatus === "calling"}
          className={`
            relative w-48 h-48 rounded-full transition-all duration-300
            flex items-center justify-center
            ${
              callStatus === "calling"
                ? "bg-yellow-500/20 border-4 border-yellow-500/50 animate-pulse"
                : callStatus === "ended"
                ? "bg-green-500/20 border-4 border-green-500/50"
                : callStatus === "error"
                ? "bg-red-500/20 border-4 border-red-500/50"
                : "bg-green-500/20 border-4 border-green-500/50 hover:bg-green-500/30 hover:scale-105 active:scale-95"
            }
          `}
        >
          {callStatus === "calling" ? (
            <div className="flex flex-col items-center gap-2">
              <svg
                className="w-16 h-16 text-yellow-400 animate-bounce"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <span className="text-yellow-400 text-sm font-medium">
                Rufe an...
              </span>
            </div>
          ) : callStatus === "ended" ? (
            <div className="flex flex-col items-center gap-2">
              <svg
                className="w-16 h-16 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-green-400 text-sm font-medium">
                Beendet
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <svg
                className="w-20 h-20 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span className="text-green-400 text-lg font-bold">
                Anrufen
              </span>
            </div>
          )}
        </button>

        {/* Error message */}
        {error && (
          <div className="w-full p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
            {error}
            <button
              onClick={() => {
                setError("");
                setCallStatus("idle");
              }}
              className="block mx-auto mt-2 text-red-300 underline text-xs"
            >
              Nochmal versuchen
            </button>
          </div>
        )}

        {/* Subtle info */}
        <p className="text-white/30 text-xs text-center">
          Drücke den Knopf um Mama oder Papa anzurufen
        </p>
      </div>
    </div>
  );
}
