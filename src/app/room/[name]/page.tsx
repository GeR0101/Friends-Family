"use client";

import { useEffect, useRef, useState, use } from "react";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function RoomPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const router = useRouter();
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
        
        if (!containerRef.current) {
          console.error("Container ref not available");
          return;
        }

          const frame = DailyIframe.createFrame(containerRef.current, {
            url: data.url,
            showLeaveButton: true,
            showFullscreenButton: true,
            startVideoOff: false,
            startAudioOff: false,
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
          router.push("/");
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
  }, [name, router]);

  const copyLink = async () => {
    const link = window.location.href;
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
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4">
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
          <p className="text-[#A1A1AA] mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
          >
            Zurück zur Startseite
          </button>
        </div>
      </div>
    );
  }

      return (
        <div className="relative min-h-screen bg-[#0A0A0A]">
          {/* Footer with room info */}
          <div className="absolute bottom-20 left-4 right-4 z-10">
            <div className="flex items-center justify-between max-w-7xl mx-auto backdrop-blur-xl bg-white/10 border border-white/10 rounded-xl px-4 py-2">
              <div className="flex items-center gap-2">
                <Image
                  src="/one-carbo-logo.png"
                  alt="One Carbo"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
                <span className="text-white text-sm font-medium">{decodeURIComponent(name).toUpperCase()}</span>
              </div>

              <button
                onClick={copyLink}
                className="flex items-center gap-2 px-3 py-1.5 backdrop-blur-sm bg-green-600/80 hover:bg-green-500/90 border border-green-500/30 text-white text-sm rounded-lg transition-colors"
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
                  Kopiert!
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
                  <span className="hidden sm:inline">Link teilen</span>
                  <span className="sm:hidden">Teilen</span>
                </>
              )}
            </button>
          </div>
        </div>

      {/* Loading state */}
      {isJoining && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A] z-20">
          <div className="text-center">
<Image
                src="/one-carbo-logo.png"
                alt="One Carbo"
                width={60}
                height={60}
                className="mx-auto mb-8 rounded-xl"
              />
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Verbinde mit {decodeURIComponent(name)}...</p>
            <p className="text-[#555555] text-sm mt-2">
              Bitte erlaube den Kamera- und Mikrofonzugriff
            </p>
            {roomUrl && (
              <div className="mt-8 pt-8 border-t border-[#2A2A2A]">
                <p className="text-[#444444] text-xs mb-2">Lädt nicht? Probiere den direkten Link:</p>
                <a 
                  href={roomUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-green-500 hover:text-green-400 text-sm underline"
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
