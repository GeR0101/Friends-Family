"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const abInDieSauna = async () => {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-transparent to-green-900/10 pointer-events-none" />
      
      <main className="relative w-full max-w-md bg-[#141414] border border-[#2A2A2A] rounded-2xl shadow-2xl shadow-green-900/10 p-8">
        {/* Logo & Header */}
        <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <Image
                src="/one-carbo-logo.png"
                alt="One Carbo"
                width={120}
                height={120}
                priority
                className="rounded-xl"
              />
              </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              One Carbo Video Meeting
            </h1>
            <p className="text-[#A1A1AA]">
              Deine Saunarunde wartet auf dich
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
              className="w-full px-4 py-3 border border-[#2A2A2A] rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-[#1A1A1A] text-white placeholder-[#555555] transition-all"
              onKeyDown={(e) => e.key === "Enter" && abInDieSauna()}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={abInDieSauna}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/30"
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
                Wird vorbereitet...
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
                Ab in die Sauna
              </>
            )}
          </button>
        </div>

        <div className="mt-8 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
          <h3 className="font-medium text-white mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            So funktioniert&apos;s:
          </h3>
          <ol className="text-sm text-[#A1A1AA] space-y-1 list-decimal list-inside">
            <li>Gib optional einen Raumnamen ein</li>
            <li>Klicke auf &quot;Ab in die Sauna&quot;</li>
            <li>Teile den Gast-Link mit anderen</li>
            <li>G&auml;ste k&ouml;nnen nur &uuml;ber den Link beitreten</li>
          </ol>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[#555555]">
            Powered by One Carbo
          </p>
        </div>
      </main>
    </div>
  );
}
