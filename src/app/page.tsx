"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { searchCities, findCity, type City } from "./lib/cities";

type Mode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [cityId, setCityId] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [cityOpen, setCityOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ff_user");
    if (saved) router.push("/dashboard");
  }, [router]);

  const selectedCity = useMemo(() => (cityId ? findCity(cityId) : undefined), [cityId]);
  const results = useMemo(() => searchCities(citySearch), [citySearch]);

  const pickCity = (c: City) => {
    setCityId(c.id);
    setCitySearch(`${c.flag} ${c.name}, ${c.country}`);
    setCityOpen(false);
    setError("");
  };

  const submit = async () => {
    setError("");
    const trimmed = name.trim();
    if (!trimmed) return setError("Bitte gib deinen Namen ein!");
    if (trimmed.length < 2) return setError("Name muss mindestens 2 Buchstaben haben");
    if (password.length < 4) return setError("Passwort muss mindestens 4 Zeichen haben");
    if (mode === "register" && !cityId) return setError("Bitte wähle deinen Ort aus");

    setLoading(true);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, password, cityId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Etwas ist schiefgelaufen");
        setLoading(false);
        return;
      }
      localStorage.setItem(
        "ff_user",
        JSON.stringify({ name: data.user.name, location: data.user.location })
      );
      router.push("/dashboard");
    } catch {
      setError("Verbindungsfehler – bitte nochmal versuchen");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-orange-50/40 via-rose-50/30 to-violet-50/40">
      <main className="relative w-full max-w-md">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-orange-200 rounded-full opacity-30 blur-2xl" />
        <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-violet-200 rounded-full opacity-30 blur-2xl" />

        <div className="relative bg-white rounded-3xl shadow-lg shadow-violet-200/40 ring-1 ring-black/5 p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-violet-200">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Family & Friends</h1>
            <p className="text-gray-500">
              {mode === "login" ? "Willkommen zurück! 👋" : "Erstelle deinen Account"}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-2xl mb-6">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={`py-2 rounded-xl text-sm font-semibold transition-all ${
                  mode === m
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {m === "login" ? "Einloggen" : "Registrieren"}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-300 focus:border-violet-300 bg-gray-50/60 text-gray-800 placeholder-gray-400 transition-all"
                onKeyDown={(e) => e.key === "Enter" && submit()}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Passwort
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-300 focus:border-violet-300 bg-gray-50/60 text-gray-800 placeholder-gray-400 transition-all"
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </div>

            {mode === "register" && (
              <div className="relative">
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Wo wohnst du?
                </label>
                <input
                  id="city"
                  type="text"
                  value={citySearch}
                  onChange={(e) => {
                    setCitySearch(e.target.value);
                    setCityId("");
                    setCityOpen(true);
                    setError("");
                  }}
                  onFocus={() => setCityOpen(true)}
                  placeholder="Stadt suchen… z.B. Wien, Bali, Tokio"
                  autoComplete="off"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-300 focus:border-violet-300 bg-gray-50/60 text-gray-800 placeholder-gray-400 transition-all"
                />
                {cityOpen && results.length > 0 && !selectedCity && (
                  <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                    {results.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => pickCity(c)}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-violet-50"
                      >
                        <span className="text-lg">{c.flag}</span>
                        <span className="flex-1">
                          <span className="block text-sm font-medium text-gray-800">{c.name}</span>
                          <span className="block text-xs text-gray-400">{c.country}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedCity && (
                  <p className="mt-1.5 text-xs text-gray-400">
                    📍 Du erscheinst in {selectedCity.name} auf der Karte
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-500 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-md shadow-violet-200/50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === "login" ? (
                "Einloggen"
              ) : (
                "Account erstellen"
              )}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            Triff dich mit deinen Liebsten – egal wo auf der Welt! 💕
          </p>
        </div>
      </main>
    </div>
  );
}
