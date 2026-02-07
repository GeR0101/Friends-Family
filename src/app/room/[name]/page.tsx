"use client";

import { useEffect, useRef, useState, use } from "react";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";
import { useRouter, useSearchParams } from "next/navigation";

export default function RoomPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
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
          console.log("Fetching room data for:", name);
          const res = await fetch("/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          });

          const data = await res.json();
          console.log("Room data received:", data);

          if (!res.ok) {
            setError(data.error || "Fehler beim Laden des Raums");
            setIsJoining(false);
            return;
          }

          setRoomUrl(data.url);
          
          if (!containerRef.current) {
            console.error("Container ref not available");
            return;
          }

          // Create Daily iframe
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
              router.push("/");
            }
          });

          frame.on("loaded", () => {
            console.log("Daily iframe loaded");
            setIsJoining(false);
          });

          frame.on("error", (e) => {
            console.error("Daily error:", e);
            setError("Verbindungsfehler beim Video-Call");
            setIsJoining(false);
          });

          console.log("Joining room with URL:", data.url);
          await frame.join();
        } catch (err) {
          console.error("Error initializing call:", err);
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
      // Fallback for iframe/secure context restrictions
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
        // If all else fails, show prompt with link
        window.prompt("Link kopieren:", link);
      }
      document.body.removeChild(textArea);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
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
          <h2 className="text-xl font-semibold text-white mb-2">
            Fehler aufgetreten
          </h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Zurück zur Startseite
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-900">
      {/* Header with room info */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-gray-900 to-transparent p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-white"
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
            <div>
              <h1 className="text-white font-medium">{name}</h1>
              <p className="text-gray-400 text-sm">Video Meeting</p>
            </div>
          </div>

          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            {copied ? (
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Link kopiert!
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
                Link teilen
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isJoining && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Verbinde mit {name}...</p>
            <p className="text-gray-400 text-sm mt-2">
              Bitte erlaube den Kamera- und Mikrofonzugriff
            </p>
            {roomUrl && (
              <div className="mt-8 pt-8 border-t border-white/10">
                <p className="text-gray-500 text-xs mb-2">Lädt nicht? Probiere den direkten Link:</p>
                <a 
                  href={roomUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm underline"
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
