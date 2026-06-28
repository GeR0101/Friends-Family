"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { searchCities, findCity, type City } from "./lib/cities";

type Mode = "login" | "register" | "reset";

const SECURITY_QUESTIONS = [
  "Wie hieß dein erstes Haustier?",
  "In welcher Stadt bist du geboren?",
  "Wie lautet der Mädchenname deiner Mutter?",
  "Wie hieß deine erste Schule?",
  "Dein Spitzname als Kind?",
];
const CUSTOM_Q = "__custom__";

const inputCls =
  "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-300 focus:border-violet-300 bg-gray-50/60 text-gray-800 placeholder-gray-400 transition-all";

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

  // Security question (registration)
  const [questionChoice, setQuestionChoice] = useState(SECURITY_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");

  // Password reset
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetQuestion, setResetQuestion] = useState("");
  const [resetAnswer, setResetAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ff_user");
    if (saved) router.push("/dashboard");
  }, [router]);

  const selectedCity = useMemo(() => (cityId ? findCity(cityId) : undefined), [cityId]);
  const results = useMemo(() => searchCities(citySearch), [citySearch]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setResetStep(1);
    setResetQuestion("");
    setResetAnswer("");
    setNewPassword("");
    setResetDone(false);
  };

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

    let securityQuestion = "";
    if (mode === "register") {
      if (!cityId) return setError("Bitte wähle deinen Ort aus");
      securityQuestion = questionChoice === CUSTOM_Q ? customQuestion.trim() : questionChoice;
      if (!securityQuestion) return setError("Bitte eine Sicherheitsfrage angeben");
      if (securityAnswer.trim().length < 2) return setError("Bitte eine Antwort angeben");
    }

    setLoading(true);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "register"
            ? { name: trimmed, password, cityId, securityQuestion, securityAnswer: securityAnswer.trim() }
            : { name: trimmed, password }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Etwas ist schiefgelaufen");
        setLoading(false);
        return;
      }
      localStorage.setItem(
        "ff_user",
        JSON.stringify({
          name: data.user.name,
          location: data.user.location,
          avatar: data.user.avatar,
          hasSecurityQuestion: data.user.hasSecurityQuestion,
        })
      );
      router.push("/dashboard");
    } catch {
      setError("Verbindungsfehler – bitte nochmal versuchen");
      setLoading(false);
    }
  };

  const fetchResetQuestion = async () => {
    setError("");
    const trimmed = name.trim();
    if (trimmed.length < 2) return setError("Bitte gib deinen Namen ein");
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/reset?name=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!data.question) {
        setError(
          "Für diesen Namen ist keine Sicherheitsfrage hinterlegt. Du kannst sie nach dem Login im Profil setzen."
        );
        setLoading(false);
        return;
      }
      setResetQuestion(data.question);
      setResetStep(2);
    } catch {
      setError("Verbindungsfehler – bitte nochmal versuchen");
    }
    setLoading(false);
  };

  const doReset = async () => {
    setError("");
    if (resetAnswer.trim().length < 1) return setError("Bitte Antwort eingeben");
    if (newPassword.length < 4) return setError("Passwort muss mindestens 4 Zeichen haben");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), answer: resetAnswer.trim(), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Etwas ist schiefgelaufen");
        setLoading(false);
        return;
      }
      setResetDone(true);
      setPassword("");
    } catch {
      setError("Verbindungsfehler – bitte nochmal versuchen");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col p-4 bg-gradient-to-b from-orange-50/40 via-rose-50/30 to-violet-50/40">
      <main className="relative m-auto w-full max-w-md">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-orange-200 rounded-full opacity-30 blur-2xl" />
        <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-violet-200 rounded-full opacity-30 blur-2xl" />

        <div className="relative bg-white rounded-3xl shadow-lg shadow-violet-200/40 ring-1 ring-black/5 p-8">
          {/* Header */}
          <div className="text-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/bird.png"
              alt="Hello Tropics"
              className="w-24 h-24 rounded-2xl object-cover mx-auto mb-4 shadow-md shadow-violet-200"
            />
            <h1 className="font-display text-3xl font-semibold text-gray-800 mb-1 tracking-tight lowercase">
              hello tropics
            </h1>
            <p className="text-gray-500">
              {mode === "login"
                ? "Willkommen zurück!"
                : mode === "register"
                ? "Erstelle deinen Account"
                : "Passwort zurücksetzen"}
            </p>
          </div>

          {/* Mode toggle (hidden during reset) */}
          {mode !== "reset" && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-2xl mb-6">
              {(["login", "register"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`py-2 rounded-xl text-sm font-semibold transition-all ${
                    mode === m ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {m === "login" ? "Einloggen" : "Registrieren"}
                </button>
              ))}
            </div>
          )}

          {/* ── Reset flow ── */}
          {mode === "reset" ? (
            <div className="space-y-4">
              {resetDone ? (
                <>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
                    ✅ Passwort geändert! Du kannst dich jetzt mit dem neuen Passwort einloggen.
                  </div>
                  <button
                    onClick={() => switchMode("login")}
                    className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold rounded-xl transition-all shadow-md shadow-violet-200/50"
                  >
                    Zum Login
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Dein Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setError("");
                      }}
                      disabled={resetStep === 2}
                      placeholder="Dein Name"
                      className={`${inputCls} disabled:opacity-60`}
                      onKeyDown={(e) => e.key === "Enter" && resetStep === 1 && fetchResetQuestion()}
                      autoFocus
                    />
                  </div>

                  {resetStep === 2 && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {resetQuestion}
                        </label>
                        <input
                          type="text"
                          value={resetAnswer}
                          onChange={(e) => {
                            setResetAnswer(e.target.value);
                            setError("");
                          }}
                          placeholder="Deine Antwort"
                          className={inputCls}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Neues Passwort
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            setError("");
                          }}
                          placeholder="••••••••"
                          className={inputCls}
                          onKeyDown={(e) => e.key === "Enter" && doReset()}
                        />
                      </div>
                    </>
                  )}

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-500 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={resetStep === 1 ? fetchResetQuestion : doReset}
                    disabled={loading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-md shadow-violet-200/50 flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : resetStep === 1 ? (
                      "Weiter"
                    ) : (
                      "Passwort ändern"
                    )}
                  </button>
                  <button
                    onClick={() => switchMode("login")}
                    className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
                  >
                    Zurück zum Login
                  </button>
                </>
              )}
            </div>
          ) : (
            /* ── Login / Register ── */
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
                  className={inputCls}
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
                  className={inputCls}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => switchMode("reset")}
                    className="mt-1.5 text-xs text-violet-500 hover:text-violet-600"
                  >
                    Passwort vergessen?
                  </button>
                )}
              </div>

              {mode === "register" && (
                <>
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
                      className={inputCls}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Sicherheitsfrage <span className="text-gray-400">(für „Passwort vergessen")</span>
                    </label>
                    <select
                      value={questionChoice}
                      onChange={(e) => {
                        setQuestionChoice(e.target.value);
                        setError("");
                      }}
                      className={`${inputCls} appearance-none`}
                    >
                      {SECURITY_QUESTIONS.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                      <option value={CUSTOM_Q}>Eigene Frage…</option>
                    </select>
                    {questionChoice === CUSTOM_Q && (
                      <input
                        type="text"
                        value={customQuestion}
                        onChange={(e) => {
                          setCustomQuestion(e.target.value);
                          setError("");
                        }}
                        placeholder="Deine eigene Frage"
                        className={`${inputCls} mt-2`}
                      />
                    )}
                    <input
                      type="text"
                      value={securityAnswer}
                      onChange={(e) => {
                        setSecurityAnswer(e.target.value);
                        setError("");
                      }}
                      placeholder="Deine Antwort"
                      className={`${inputCls} mt-2`}
                    />
                  </div>
                </>
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
          )}
        </div>
      </main>
    </div>
  );
}
