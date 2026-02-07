"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { requestPushToken, onForegroundMessage } from "@/lib/firebase/client";

interface CallData {
  id: string;
  familyId: string;
  kidDeviceId: string;
  status: string;
  roomName: string;
  roomUrl: string;
  createdAt: string;
}

interface DeviceData {
  id: string;
  name: string;
  role: string;
  pushToken: string | null;
  isOnline: boolean;
}

export default function ParentPage() {
  const router = useRouter();
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [inCall, setInCall] = useState(false);
  const [roomUrl, setRoomUrl] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load stored device info
  useEffect(() => {
    const stored = localStorage.getItem("parent-device");
    if (stored) {
      const parsed = JSON.parse(stored);
      setFamilyId(parsed.familyId);
      setDeviceId(parsed.id);
    } else {
      router.push("/setup");
      return;
    }
    setLoading(false);
  }, [router]);

  // Fetch family info
  const fetchFamily = useCallback(async () => {
    if (!familyId) return;
    try {
      const res = await fetch(`/api/family?id=${familyId}`);
      const data = await res.json();
      if (res.ok) {
        setFamilyName(data.family.name);
        setPairCode(data.family.pairCode);
        setDevices(data.devices);
      }
    } catch (e) {
      console.error("Fetch family error:", e);
    }
  }, [familyId]);

  useEffect(() => {
    fetchFamily();
  }, [fetchFamily]);

  // Register push token
  useEffect(() => {
    if (!deviceId) return;

    async function registerPush() {
      const token = await requestPushToken();
      if (token) {
        await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId, pushToken: token }),
        });
        setPushEnabled(true);
      }
    }

    registerPush();
  }, [deviceId]);

  // Listen for foreground push messages
  useEffect(() => {
    onForegroundMessage((payload: unknown) => {
      const data = (payload as { data?: { callId?: string; roomUrl?: string; kidName?: string } }).data;
      if (data?.callId) {
        setIncomingCall({
          id: data.callId,
          familyId: familyId || "",
          kidDeviceId: "",
          status: "NOTIFIED",
          roomName: "",
          roomUrl: data.roomUrl || "",
          createdAt: new Date().toISOString(),
        });
      }
    });
  }, [familyId]);

  // Poll for incoming calls
  useEffect(() => {
    if (!familyId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/call?familyId=${familyId}`);
        const data = await res.json();
        if (data.calls?.length > 0) {
          setIncomingCall(data.calls[0]);
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [familyId]);

  const acceptCall = async () => {
    if (!incomingCall) return;

    await fetch("/api/call", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId: incomingCall.id, status: "ACCEPTED" }),
    });

    setRoomUrl(incomingCall.roomUrl);
    setInCall(true);
    setIncomingCall(null);
  };

  const declineCall = async () => {
    if (!incomingCall) return;

    await fetch("/api/call", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId: incomingCall.id, status: "DECLINED" }),
    });

    setIncomingCall(null);
  };

  const endCall = () => {
    setInCall(false);
    setRoomUrl("");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="text-white/50">Laden...</div>
      </div>
    );
  }

  // In-call view
  if (inCall && roomUrl) {
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
      <div className="w-full max-w-md space-y-6">
        {/* Incoming call overlay */}
        {incomingCall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 text-center space-y-6 animate-pulse-slow">
              <div className="w-24 h-24 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-green-400 animate-bounce"
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
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Eingehender Anruf
                </h2>
                <p className="text-white/50 mt-1">Dein Kind ruft an!</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={declineCall}
                  className="flex-1 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/30 transition-all font-medium"
                >
                  Ablehnen
                </button>
                <button
                  onClick={acceptCall}
                  className="flex-1 py-3 bg-green-500/80 border border-green-500/50 text-white rounded-xl hover:bg-green-500 transition-all font-medium"
                >
                  Annehmen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard header */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white">{familyName || "Familie"}</h1>
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                pushEnabled
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
              }`}
            >
              {pushEnabled ? "Push aktiv" : "Push inaktiv"}
            </div>
          </div>

          {/* Pair code */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
            <p className="text-white/40 text-xs mb-1">Kopplungscode</p>
            <p className="text-2xl font-mono font-bold text-white tracking-widest">
              {pairCode}
            </p>
            <p className="text-white/30 text-xs mt-1">
              Diesen Code auf dem Kinder-Gerät eingeben
            </p>
          </div>

          {/* Devices list */}
          <div>
            <h3 className="text-white/60 text-sm font-medium mb-2">
              Verbundene Geräte
            </h3>
            {devices.length === 0 ? (
              <p className="text-white/30 text-sm">Noch keine Geräte</p>
            ) : (
              <div className="space-y-2">
                {devices.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          d.role === "kid"
                            ? "bg-blue-400"
                            : "bg-purple-400"
                        }`}
                      />
                      <span className="text-white text-sm">{d.name}</span>
                    </div>
                    <span className="text-white/30 text-xs capitalize">
                      {d.role === "kid" ? "Kind" : "Eltern"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/setup")}
            className="flex-1 py-3 px-4 bg-white/5 border border-white/10 text-white/60 rounded-xl hover:bg-white/10 transition-all text-sm"
          >
            Neues Gerät
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex-1 py-3 px-4 bg-white/5 border border-white/10 text-white/60 rounded-xl hover:bg-white/10 transition-all text-sm"
          >
            Startseite
          </button>
        </div>
      </div>
    </div>
  );
}
