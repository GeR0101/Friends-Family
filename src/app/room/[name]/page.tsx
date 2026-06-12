"use client";

import { Suspense, useEffect, useRef, useState, use } from "react";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";
import { useRouter, useSearchParams } from "next/navigation";

function RoomContent({ name }: { name: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGuest = searchParams.get("guest") === "true";
  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<DailyCall | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [roomUrl, setRoomUrl] = useState("");

  useEffect(() => {
    if (!name || callFrameRef.current) return;

    const initCall = async () => {
      setIsJoining(true);
      try {
        const res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Fehler beim Laden des Raums");
          setIsJoining(false);
          return;
        }

        setRoomUrl(data.url);

        if (!containerRef.current) return;

        const frame = DailyIframe.createFrame(containerRef.current, {
          url: data.url,
          showLeaveButton: true,
          showFullscreenButton: true,
          iframeStyle: {
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            border: "none",
            borderRadius: "0",
          },
        });

        callFrameRef.current = frame;

        frame.on("left-meeting", () => {
          if (isGuest) {
            router.push("/danke");
          } else {
            router.push("/dashboard");
          }
        });

        frame.on("loaded", () => {
          setIsJoining(false);
        });

        frame.on("error", () => {
          setError("Verbindungsfehler beim Video-Call");
          setIsJoining(false);
        });

        await frame.join();
      } catch {
        setError("Fehler beim Starten des Video-Calls");
        setIsJoining(false);
      }
    };

    initCall();

    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    };
  }, [name, router, isGuest]);

  const copyLink = async () => {
    const link = `${window.location.origin}/room/${name}?guest=true`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = link;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
      } catch {
        window.prompt("Link kopieren:", link);
      }
      document.body.removeChild(textArea);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF8F0] p-4">
        <div className="bg-white border-2 border-pink-100 rounded-2xl shadow-lg shadow-pink-200/50 p-8 text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Fehler aufgetreten
          </h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => router.push(isGuest ? "/danke" : "/dashboard")}
            className="px-6 py-2 bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl transition-all"
          >
            {isGuest ? "Schließen" : "Zurück zum Dashboard"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#FFF8F0]">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-pink-100 rounded-full opacity-20 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-100 rounded-full opacity-20 blur-3xl" />
      </div>

      {/* Header with room info */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-white to-transparent p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {!isGuest && (
              <button
                onClick={() => router.push("/dashboard")}
                className="p-2 hover:bg-pink-50 rounded-xl transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-gray-800 font-medium">{name}</h1>
              <p className="text-gray-500 text-sm">Video Meeting</p>
            </div>
          </div>

          {!isGuest && (
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-pink-100 hover:border-pink-300 text-gray-700 rounded-xl transition-all shadow-sm"
            >
              {copied ? (
                <>
                  <svg
                    className="w-4 h-4 text-green-500"
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
                  Gast-Link kopiert!
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  Gast-Link teilen
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isJoining && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#FFF8F0] z-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-pink-300 border-t-pink-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-800 text-lg">Verbinde mit {name}...</p>
            <p className="text-gray-500 text-sm mt-2">
              Bitte erlaube den Kamera- und Mikrofonzugriff
            </p>
            {roomUrl && (
              <div className="mt-8 pt-8 border-t border-pink-100">
                <p className="text-gray-400 text-xs mb-2">
                  Lädt nicht? Probiere den direkten Link:
                </p>
                <a
                  href={roomUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-500 hover:text-pink-600 text-sm underline"
                >
                  Raum in neuem Tab öffnen
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Daily iframe container */}
      <div ref={containerRef} className="absolute inset-0" />
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
        <div className="flex min-h-screen items-center justify-center bg-[#FFF8F0]">
          <div className="w-16 h-16 border-4 border-pink-300 border-t-pink-500 rounded-full animate-spin" />
        </div>
      }
    >
      <RoomContent name={name} />
    </Suspense>
  );
}