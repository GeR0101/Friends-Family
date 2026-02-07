"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "choose-role" | "create-family" | "join-family";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose-role");
  const [role, setRole] = useState<"kid" | "parent">("parent");
  const [familyName, setFamilyName] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultCode, setResultCode] = useState("");

  const createFamily = async () => {
    if (!familyName.trim() || !deviceName.trim()) {
      setError("Bitte fülle alle Felder aus");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          familyName: familyName.trim(),
          deviceName: deviceName.trim(),
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Fehler beim Erstellen");
        return;
      }

      // Store device info locally
      if (role === "parent") {
        localStorage.setItem(
          "parent-device",
          JSON.stringify({ id: data.device.id, familyId: data.family.id, name: data.device.name })
        );
      } else {
        localStorage.setItem(
          `kid-device-${data.family.id}`,
          JSON.stringify({ id: data.device.id, name: data.device.name })
        );
      }

      setResultCode(data.pairCode);
    } catch {
      setError("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  };

  const joinFamily = async () => {
    if (!pairCode.trim() || !deviceName.trim()) {
      setError("Bitte fülle alle Felder aus");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          pairCode: pairCode.trim(),
          deviceName: deviceName.trim(),
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Fehler beim Beitreten");
        return;
      }

      // Store device info locally
      if (role === "parent") {
        localStorage.setItem(
          "parent-device",
          JSON.stringify({ id: data.device.id, familyId: data.family.id, name: data.device.name })
        );
        router.push("/parent");
      } else {
        localStorage.setItem(
          `kid-device-${data.family.id}`,
          JSON.stringify({ id: data.device.id, name: data.device.name })
        );
        router.push(`/kid/${data.family.id}`);
      }
    } catch {
      setError("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  };

  const goToApp = () => {
    if (role === "parent") {
      router.push("/parent");
    } else {
      const stored = localStorage.getItem("parent-device");
      if (stored) {
        const parsed = JSON.parse(stored);
        router.push(`/kid/${parsed.familyId}`);
      }
    }
  };

  // Success screen after creating family
  if (resultCode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Familie erstellt!</h2>
            <p className="text-white/50 mt-2">Teile diesen Code mit anderen Geräten:</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-4xl font-mono font-bold text-white tracking-[0.3em]">{resultCode}</p>
          </div>
          <p className="text-white/30 text-sm">
            Gib diesen Code auf dem anderen Gerät ein um es mit dieser Familie zu verbinden.
          </p>
          <button
            onClick={goToApp}
            className="w-full py-3 px-4 bg-green-600/80 hover:bg-green-500/90 text-white font-semibold rounded-xl transition-all border border-green-500/30"
          >
            Weiter zur App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">FamilyCall</h1>
          <p className="text-white/50 text-sm mt-1">Einrichten</p>
        </div>

        {/* Step: Choose Role */}
        {step === "choose-role" && (
          <div className="space-y-4">
            <p className="text-white/60 text-sm text-center">Wer benutzt dieses Gerät?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setRole("parent"); setStep("create-family"); }}
                className="flex flex-col items-center gap-3 p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-purple-500/10 hover:border-purple-500/30 transition-all"
              >
                <div className="w-14 h-14 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-white font-medium">Eltern</span>
                <span className="text-white/30 text-xs">Anrufe empfangen</span>
              </button>
              <button
                onClick={() => { setRole("kid"); setStep("join-family"); }}
                className="flex flex-col items-center gap-3 p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-blue-500/10 hover:border-blue-500/30 transition-all"
              >
                <div className="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-white font-medium">Kind</span>
                <span className="text-white/30 text-xs">Eltern anrufen</span>
              </button>
            </div>
          </div>
        )}

        {/* Step: Create Family (Parent) */}
        {step === "create-family" && (
          <div className="space-y-4">
            <button
              onClick={() => setStep("choose-role")}
              className="text-white/40 hover:text-white/60 text-sm flex items-center gap-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Zurück
            </button>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Neue Familie erstellen</h2>

              <div>
                <label className="block text-sm text-white/50 mb-1.5">Familienname</label>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="z.B. Familie Müller"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:ring-2 focus:ring-green-500/50 focus:border-green-500/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm text-white/50 mb-1.5">Gerätename</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="z.B. Mamas iPhone"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:ring-2 focus:ring-green-500/50 focus:border-green-500/30 transition-all"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={createFamily}
                disabled={loading}
                className="w-full py-3 bg-green-600/80 hover:bg-green-500/90 disabled:opacity-50 text-white font-semibold rounded-xl transition-all border border-green-500/30"
              >
                {loading ? "Erstelle..." : "Familie erstellen"}
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={() => setStep("join-family")}
                className="text-white/40 hover:text-white/60 text-sm underline transition-colors"
              >
                Bestehende Familie beitreten
              </button>
            </div>
          </div>
        )}

        {/* Step: Join Family */}
        {step === "join-family" && (
          <div className="space-y-4">
            <button
              onClick={() => setStep("choose-role")}
              className="text-white/40 hover:text-white/60 text-sm flex items-center gap-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Zurück
            </button>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Familie beitreten</h2>

              <div>
                <label className="block text-sm text-white/50 mb-1.5">Kopplungscode</label>
                <input
                  type="text"
                  value={pairCode}
                  onChange={(e) => setPairCode(e.target.value.toUpperCase())}
                  placeholder="z.B. ABC123"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-center text-2xl font-mono tracking-[0.2em] placeholder-white/20 focus:ring-2 focus:ring-green-500/50 focus:border-green-500/30 transition-all uppercase"
                />
              </div>

              <div>
                <label className="block text-sm text-white/50 mb-1.5">Gerätename</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder={role === "kid" ? "z.B. Linas iPad" : "z.B. Papas Handy"}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:ring-2 focus:ring-green-500/50 focus:border-green-500/30 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl">
                <div className={`w-3 h-3 rounded-full ${role === "kid" ? "bg-blue-400" : "bg-purple-400"}`} />
                <span className="text-white/60 text-sm">
                  Rolle: {role === "kid" ? "Kind" : "Eltern"}
                </span>
                <button
                  onClick={() => setRole(role === "kid" ? "parent" : "kid")}
                  className="ml-auto text-white/40 hover:text-white/60 text-xs underline"
                >
                  Ändern
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={joinFamily}
                disabled={loading}
                className="w-full py-3 bg-green-600/80 hover:bg-green-500/90 disabled:opacity-50 text-white font-semibold rounded-xl transition-all border border-green-500/30"
              >
                {loading ? "Verbinde..." : "Beitreten"}
              </button>
            </div>

            {role !== "kid" && (
              <div className="text-center">
                <button
                  onClick={() => { setRole("parent"); setStep("create-family"); }}
                  className="text-white/40 hover:text-white/60 text-sm underline transition-colors"
                >
                  Neue Familie erstellen
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
