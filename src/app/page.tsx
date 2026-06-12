"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState<"bali" | "austria">("austria");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("ff_user");
    if (saved) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogin = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Bitte gib deinen Namen ein!");
      return;
    }
    if (trimmed.length < 2) {
      setError("Name muss mindestens 2 Buchstaben haben");
      return;
    }

    localStorage.setItem(
      "ff_user",
      JSON.stringify({ name: trimmed, timezone })
    );
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <main className="relative w-full max-w-md">
        {/* Decorative elements */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-pink-200 rounded-full opacity-30 blur-xl" />
        <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-purple-200 rounded-full opacity-30 blur-xl" />

        <div className="relative bg-white border-2 border-pink-100 rounded-3xl shadow-lg shadow-pink-200/50 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-pink-200">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              Family & Friends
            </h1>
            <p className="text-gray-500">
              Hallo! Wer bist du heute?
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Dein Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="z.B. Emma, Max, Mama, Papa..."
                className="w-full px-4 py-3 border-2 border-pink-100 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-pink-300 bg-pink-50/50 text-gray-800 placeholder-gray-400 transition-all"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Wo bist du?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTimezone("austria")}
                  className={`flex items-center gap-2 p-3 border-2 rounded-xl transition-all ${
                    timezone === "austria"
                      ? "border-pink-300 bg-pink-50 shadow-sm"
                      : "border-pink-100 bg-white hover:bg-pink-50/50"
                  }`}
                >
                  <span className="text-xl">🇦🇹</span>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-700">
                      Österreich
                    </div>
                    <div className="text-xs text-gray-400">Europa</div>
                  </div>
                </button>
                <button
                  onClick={() => setTimezone("bali")}
                  className={`flex items-center gap-2 p-3 border-2 rounded-xl transition-all ${
                    timezone === "bali"
                      ? "border-pink-300 bg-pink-50 shadow-sm"
                      : "border-pink-100 bg-white hover:bg-pink-50/50"
                  }`}
                >
                  <span className="text-xl">🇮🇩</span>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-700">
                      Bali
                    </div>
                    <div className="text-xs text-gray-400">Indonesien</div>
                  </div>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-500 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              className="w-full py-3 px-4 bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-pink-200/50 flex items-center justify-center gap-2"
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
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              Rein in den Spaß!
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            Triff dich mit deinen Liebsten – egal ob in Bali oder Österreich! 💕
          </p>
        </div>
      </main>
    </div>
  );
}