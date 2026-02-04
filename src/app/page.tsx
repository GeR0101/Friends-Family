"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const createRoom = async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomName || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler beim Erstellen des Raums");
        return;
      }

      router.push(`/room/${data.name}`);
    } catch {
      setError("Verbindungsfehler. Bitte versuche es erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = () => {
    if (!roomName.trim()) {
      setError("Bitte gib einen Raumnamen ein");
      return;
    }
    router.push(`/room/${roomName.trim()}`);
  };

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4">
        
        <main className="relative w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8">
          {/* Logo & Header */}
          <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <Image
                  src="/one-carbo-logo.png"
                  alt="One Carbo"
                  width={200}
                  height={200}
                  priority
                  className="rounded-xl"
                />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Video Meeting
              </h1>
              <p className="text-[#A1A1AA]">
                Erstelle einen Raum oder tritt einem bei
              </p>
          </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="roomName"
              className="block text-sm font-medium text-[#A1A1AA] mb-2"
            >
              Raumname (optional)
            </label>
            <input
              id="roomName"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="z.B. partner-call oder jour-fix"
              className="w-full px-4 py-3 backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-green-500/50 focus:border-green-500/30 text-white placeholder-white/30 transition-all"
              onKeyDown={(e) => e.key === "Enter" && createRoom()}
            />
          </div>

          {error && (
              <div className="p-3 backdrop-blur-sm bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

          <button
            onClick={createRoom}
            disabled={isLoading}
            className="w-full py-3 px-4 backdrop-blur-sm bg-green-600/80 hover:bg-green-500/90 disabled:bg-green-800/50 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-green-500/30"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Wird erstellt...
              </>
            ) : (
              <>
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
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Neuen Raum erstellen
              </>
            )}
          </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 text-white/30">
                  oder
                </span>
              </div>
            </div>

            <button
              onClick={() => router.push("/room/sauna")}
              disabled={isLoading}
              className="w-full py-3 px-4 backdrop-blur-sm bg-orange-500/20 border border-orange-500/30 hover:bg-orange-500/30 hover:border-orange-500/40 text-orange-300 font-medium rounded-xl transition-all flex items-center justify-center gap-2"
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
                  d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
                />
              </svg>
              Ab in die Sauna
            </button>
        </div>

          <div className="mt-8 p-4 backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl">
            <h3 className="font-medium text-white mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              So funktioniert&apos;s:
            </h3>
            <ol className="text-sm text-white/50 space-y-1 list-decimal list-inside">
              <li>Gib einen Raumnamen ein (z.B. &quot;partner-call&quot;)</li>
              <li>Klicke auf &quot;Neuen Raum erstellen&quot;</li>
              <li>Teile den Link mit deinen Partnern</li>
              <li>Der Raum bleibt dauerhaft bestehen</li>
            </ol>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-white/30">
              Powered by One Carbo
            </p>
          </div>
      </main>
    </div>
  );
}
